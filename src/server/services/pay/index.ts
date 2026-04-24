// =====================================================
// 统一支付系统 - 支付服务
// =====================================================

import db from '../../db';
import { RowDataPacket } from 'mysql2/promise';
import { PayOrder, UnifiedPayRequest, UnifiedPayResponse, PayQueryResponse, OrderStatus, RefundStatus } from '../../types';
import { MerchantService } from '../merchant';
import { SignService } from '../sign';
import { AlipayAdapter } from '../../adapters/alipay';
import { WechatAdapter } from '../../adapters/wechat';
import { PayAdapter, PayParams } from '../../types';
import { PayException, PayErrorCode } from '../../types';
import { generateOrderNo, calculateExpireTime, yuanToFen } from '../../utils';
import config from '../../config';

interface OrderRow extends RowDataPacket, PayOrder {}

/**
 * 支付服务
 */
export class PayService {
  /**
   * 统一支付下单
   */
  static async unifiedPay(request: UnifiedPayRequest): Promise<UnifiedPayResponse> {
    const {
      app_id,
      channel: requestedChannel,
      trade_type,
      out_trade_no,
      total_amount,
      currency = 'CNY',
      subject,
      body,
      notify_url,
      return_url,
      attach,
      client_ip,
      profit_sharing,
      extra,
    } = request;

    // 1. 验证商户
    const merchant = await MerchantService.getByAppId(app_id);
    if (!merchant) {
      throw new PayException('商户不存在', PayErrorCode.MERCHANT_NOT_FOUND, 404);
    }
    if (merchant.status !== 'active') {
      throw new PayException('商户已禁用', PayErrorCode.MERCHANT_DISABLED, 403);
    }

    // 2. 确定支付渠道
    const channel = requestedChannel || merchant.default_channel;
    
    // 3. 检查渠道支持
    if (merchant.channel !== 'both' && merchant.channel !== channel) {
      throw new PayException(
        `该应用不支持 ${channel} 渠道`,
        PayErrorCode.CHANNEL_NOT_SUPPORTED,
        400
      );
    }

    // 4. 检查分账配置
    if (profit_sharing?.enabled && !merchant.profit_sharing_enabled) {
      throw new PayException('该应用未开通分账功能', PayErrorCode.PROFIT_SHARING_NOT_ENABLED, 400);
    }

    // 5. 检查订单号是否已存在
    const existingOrder = await this.getByMerchantOrderNo(app_id, out_trade_no);
    if (existingOrder) {
      throw new PayException('订单号已存在', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 6. 生成系统订单号
    const orderNo = generateOrderNo();

    // 7. 计算过期时间
    const expireMinutes = config.pay.defaultExpireMinutes;
    const expireTime = calculateExpireTime(expireMinutes);

    // 8. 金额处理（统一使用分为单位存储）
    const amount = typeof total_amount === 'number' && total_amount < 100 
      ? yuanToFen(total_amount)  // 小于100认为是元
      : Math.round(total_amount);  // 大于等于100认为是分

    // 9. 获取适配器
    const adapter = this.getAdapter(channel);

    // 10. 构建支付参数
    const payRequest: UnifiedPayRequest = {
      ...request,
      channel,
    };

    const payParams: PayParams = await adapter.buildPayParams(payRequest, merchant);

    // 11. 创建订单记录
    await this.createOrder({
      order_no: orderNo,
      merchant_order_no: out_trade_no,
      app_id,
      channel,
      trade_type,
      total_amount: amount,
      currency,
      subject,
      body,
      pay_url: payParams.url,
      qr_code: payParams.qr_code,
      pay_params: JSON.stringify({
        jsapi_params: payParams.jsapi_params,
        app_params: payParams.app_params,
        h5_params: payParams.h5_params,
      }),
      expire_time: expireTime,
      status: 'pending',
      attach,
      client_ip,
      extra: extra as Record<string, unknown>,
    });

    // 12. 返回响应
    return {
      order_no: orderNo,
      channel,
      trade_no: payParams.trade_no,
      pay_url: payParams.url,
      qr_code: payParams.qr_code,
      jsapi_params: payParams.jsapi_params,
      expire_time: expireTime.toISOString(),
    };
  }

  /**
   * 支付查询
   */
  static async query(appId: string, outTradeNo: string): Promise<PayQueryResponse> {
    // 1. 查询订单
    const order = await this.getByMerchantOrderNo(appId, outTradeNo);
    if (!order) {
      throw new PayException('订单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    // 2. 获取商户配置
    const merchant = await MerchantService.getByAppId(appId);
    if (!merchant) {
      throw new PayException('商户不存在', PayErrorCode.MERCHANT_NOT_FOUND, 404);
    }

    // 3. 如果订单已支付，尝试从渠道查询最新状态
    if (order.status === 'paid' || order.status === 'processing') {
      const adapter = this.getAdapter(order.channel);
      const result = await adapter.queryOrder(order.channel_order_no!, merchant);

      // 更新本地状态
      if (result.status === 'TRADE_SUCCESS' || result.status === 'TRADE_FINISHED') {
        order.status = 'paid';
        order.actual_amount = result.amount;
        if (result.paid_time) {
          order.paid_time = new Date(result.paid_time);
        }
        await this.updateOrderStatus(order.order_no, 'paid');
      }
    }

    // 4. 查询退款信息
    let refundStatus: string | undefined;
    let refundAmount: number | undefined;
    const refundInfo = await this.getRefundInfo(order.id);
    if (refundInfo) {
      refundStatus = refundInfo?.status;
      refundAmount = refundInfo.refund_amount;
    }

    return {
      order_no: order.order_no,
      merchant_order_no: order.merchant_order_no,
      channel: order.channel,
      channel_order_no: order.channel_order_no,
      status: order.status,
      total_amount: order.total_amount,
      actual_amount: order.actual_amount,
      paid_time: order.paid_time?.toISOString(),
      expire_time: order.expire_time?.toISOString(),
      refund_status: refundStatus as RefundStatus,
      refund_amount: refundAmount,
    };
  }

  /**
   * 关闭订单
   */
  static async close(orderNo: string): Promise<boolean> {
    const order = await this.getByOrderNo(orderNo);
    if (!order) {
      throw new PayException('订单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    if (order.status !== 'pending') {
      throw new PayException('只有待支付订单可以关闭', PayErrorCode.INVALID_PARAMS, 400);
    }

    return this.updateOrderStatus(orderNo, 'closed');
  }

  /**
   * 获取适配器
   */
  static getAdapter(channel: string): PayAdapter {
    switch (channel) {
      case 'alipay':
        return AlipayAdapter;
      case 'wechat':
        return WechatAdapter;
      default:
        throw new PayException('不支持的支付渠道', PayErrorCode.CHANNEL_NOT_SUPPORTED, 400);
    }
  }

  /**
   * 创建订单
   */
  private static async createOrder(data: Partial<PayOrder>): Promise<number> {
    const fields = [
      'order_no', 'merchant_order_no', 'app_id', 'channel', 'channel_order_no',
      'trade_type', 'total_amount', 'actual_amount', 'currency', 'subject', 'body',
      'pay_url', 'qr_code', 'pay_params', 'expire_time', 'status', 'attach',
      'client_ip', 'extra'
    ];

    const values = fields.map(field => {
      const value = data[field as keyof PayOrder];
      if (field === 'extra') {
        return value ? JSON.stringify(value) : null;
      }
      return value ?? null;
    });

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO pay_order (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.execute(sql, values);
    return result.insertId;
  }

  /**
   * 根据订单号查询
   */
  static async getByOrderNo(orderNo: string): Promise<PayOrder | null> {
    const sql = 'SELECT * FROM pay_order WHERE order_no = ?';
    const rows = await db.query<OrderRow[]>(sql, [orderNo]);
    return rows[0] || null;
  }

  /**
   * 根据商户订单号查询
   */
  static async getByMerchantOrderNo(appId: string, merchantOrderNo: string): Promise<PayOrder | null> {
    const sql = 'SELECT * FROM pay_order WHERE app_id = ? AND merchant_order_no = ?';
    const rows = await db.query<OrderRow[]>(sql, [appId, merchantOrderNo]);
    return rows[0] || null;
  }

  /**
   * 根据渠道订单号查询
   */
  static async getByChannelOrderNo(channel: string, channelOrderNo: string): Promise<PayOrder | null> {
    const sql = 'SELECT * FROM pay_order WHERE channel = ? AND channel_order_no = ?';
    const rows = await db.query<OrderRow[]>(sql, [channel, channelOrderNo]);
    return rows[0] || null;
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(orderNo: string, status: OrderStatus): Promise<boolean> {
    const sql = 'UPDATE pay_order SET status = ?, updated_at = NOW() WHERE order_no = ?';
    const result = await db.execute(sql, [status, orderNo]);
    return result.affectedRows > 0;
  }

  /**
   * 更新渠道订单号
   */
  static async updateChannelOrderNo(orderNo: string, channelOrderNo: string): Promise<boolean> {
    const sql = 'UPDATE pay_order SET channel_order_no = ?, updated_at = NOW() WHERE order_no = ?';
    const result = await db.execute(sql, [channelOrderNo, orderNo]);
    return result.affectedRows > 0;
  }

  /**
   * 标记订单已支付
   */
  static async markPaid(orderNo: string, channelOrderNo: string, paidTime?: Date): Promise<boolean> {
    const sql = `
      UPDATE pay_order 
      SET status = 'paid', 
          channel_order_no = ?,
          paid_time = COALESCE(?, NOW()),
          updated_at = NOW()
      WHERE order_no = ?
    `;
    const result = await db.execute(sql, [channelOrderNo, paidTime, orderNo]);
    return result.affectedRows > 0;
  }

  /**
   * 获取退款信息
   */
  static async getRefundInfo(orderId: number): Promise<{ status: string; refund_amount: number } | null> {
    const sql = `
      SELECT status, SUM(refund_amount) as refund_amount 
      FROM refund_order 
      WHERE order_id = ? AND status = 'success'
      GROUP BY status
    `;
    const rows = await db.query<RowDataPacket[]>(sql, [orderId]);
    return rows[0] as { status: string; refund_amount: number } | null;
  }

  /**
   * 订单列表
   */
  static async list(
    appId?: string,
    status?: OrderStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ list: PayOrder[]; total: number }> {
    let sql = 'SELECT * FROM pay_order WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM pay_order WHERE 1=1';
    const params: unknown[] = [];

    if (appId) {
      sql += ' AND app_id = ?';
      countSql += ' AND app_id = ?';
      params.push(appId);
    }

    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const [list, countResult] = await Promise.all([
      db.query<OrderRow[]>(sql, params),
      db.query<RowDataPacket[]>(countSql, appId || status ? params.slice(0, -2) : [])
    ]);

    return {
      list,
      total: (countResult[0] as { total: number }).total
    };
  }
}

export default PayService;
