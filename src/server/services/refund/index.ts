// =====================================================
// 统一支付系统 - 退款服务
// =====================================================

import db from '../../db';
import { RowDataPacket } from 'mysql2/promise';
import { RefundOrder, UnifiedRefundRequest, UnifiedRefundResponse, RefundStatus } from '../../types';
import { PayService } from '../pay';
import { MerchantService } from '../merchant';
import { PayException, PayErrorCode } from '../../types';
import { generateRefundNo, yuanToFen } from '../../utils';

interface RefundRow extends RowDataPacket, RefundOrder {}

/**
 * 退款服务
 */
export class RefundService {
  /**
   * 统一退款
   */
  static async unifiedRefund(request: UnifiedRefundRequest): Promise<UnifiedRefundResponse> {
    const {
      app_id,
      channel: requestedChannel,
      out_trade_no,
      out_refund_no,
      refund_amount,
      reason,
      notify_url,
    } = request;

    // 1. 验证商户
    const merchant = await MerchantService.getByAppId(app_id);
    if (!merchant) {
      throw new PayException('商户不存在', PayErrorCode.MERCHANT_NOT_FOUND, 404);
    }

    // 2. 查询原支付订单
    const order = await PayService.getByMerchantOrderNo(app_id, out_trade_no);
    if (!order) {
      throw new PayException('订单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    // 3. 检查订单状态
    if (order.status !== 'paid' && order.status !== 'partial_refund') {
      throw new PayException('只有已支付的订单可以退款', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 4. 确定渠道
    const channel = requestedChannel || order.channel;

    // 5. 检查退款金额
    const refundAmount = typeof refund_amount === 'number' && refund_amount < 100
      ? yuanToFen(refund_amount)
      : Math.round(refund_amount);

    const totalAmount = order.actual_amount || order.total_amount;
    const refundedAmount = await this.getRefundedAmount(order.id);
    const canRefundAmount = totalAmount - refundedAmount;

    if (refundAmount > canRefundAmount) {
      throw new PayException(
        `退款金额超过可退金额，当前可退: ${canRefundAmount / 100}元`,
        PayErrorCode.INVALID_PARAMS,
        400
      );
    }

    // 6. 检查退款单号是否已存在
    const existingRefund = await this.getByMerchantRefundNo(app_id, out_refund_no);
    if (existingRefund) {
      throw new PayException('退款单号已存在', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 7. 生成系统退款单号
    const refundNo = generateRefundNo();

    // 8. 创建退款记录
    await this.createRefund({
      refund_no: refundNo,
      order_id: order.id,
      order_no: order.order_no,
      merchant_refund_no: out_refund_no,
      channel,
      total_amount: totalAmount,
      refund_amount: refundAmount,
      reason,
      status: 'pending',
    });

    // 9. 调用渠道退款
    const adapter = PayService.getAdapter(channel);
    const result = await adapter.refund({
      out_trade_no: order.channel_order_no || out_trade_no,
      refund_amount: refundAmount,
      reason,
      total_amount: totalAmount,
      app_id,
      out_refund_no: refundNo,
    }, merchant);

    // 10. 更新退款记录
    await this.updateRefund(refundNo, {
      channel_refund_no: result.channel_refund_no,
      status: 'success',
      refund_time: result.refund_time ? new Date(result.refund_time) : new Date(),
    });

    // 11. 更新原订单状态
    const totalRefunded = refundedAmount + refundAmount;
    if (totalRefunded >= totalAmount) {
      await PayService.updateOrderStatus(order.order_no, 'refunded');
    } else {
      await PayService.updateOrderStatus(order.order_no, 'partial_refund');
    }

    return {
      refund_no: refundNo,
      channel,
      channel_refund_no: result.channel_refund_no,
      refund_amount: refundAmount,
      refund_time: result.refund_time,
      status: 'success',
    };
  }

  /**
   * 退款查询
   */
  static async query(appId: string, outRefundNo: string): Promise<UnifiedRefundResponse | null> {
    const refund = await this.getByMerchantRefundNo(appId, outRefundNo);
    if (!refund) {
      return null;
    }

    // 获取商户配置
    const merchant = await MerchantService.getByAppId(appId);
    if (!merchant) {
      throw new PayException('商户不存在', PayErrorCode.MERCHANT_NOT_FOUND, 404);
    }

    // 如果是成功状态且有渠道退款号，尝试从渠道查询最新状态
    if (refund.status === 'success' && refund.channel_refund_no) {
      const adapter = PayService.getAdapter(refund.channel);
      const result = await adapter.queryRefund(refund.channel_refund_no, merchant);

      // 更新本地状态
      if (result.refund_status !== 'REFUNDSUCCESS') {
        await this.updateRefund(refund.refund_no, {
          status: result.refund_status === 'REFUNDCLOSE' ? 'failed' : 'processing',
        });
      }
    }

    return {
      refund_no: refund.refund_no,
      channel: refund.channel,
      channel_refund_no: refund.channel_refund_no,
      refund_amount: refund.refund_amount,
      refund_time: refund.refund_time?.toISOString(),
      status: refund.status,
    };
  }

  /**
   * 创建退款记录
   */
  private static async createRefund(data: Partial<RefundOrder>): Promise<number> {
    const fields = [
      'refund_no', 'order_id', 'order_no', 'merchant_refund_no',
      'channel', 'channel_refund_no', 'total_amount', 'refund_amount',
      'refunded_amount', 'reason', 'remark', 'status', 'fail_reason'
    ];

    const values = fields.map(field => {
      const value = data[field as keyof RefundOrder];
      if (field === 'refunded_amount') return value ?? 0;
      return value ?? null;
    });

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO refund_order (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.execute(sql, values);
    return result.insertId;
  }

  /**
   * 更新退款记录
   */
  private static async updateRefund(
    refundNo: string,
    data: Partial<RefundOrder>
  ): Promise<boolean> {
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return false;

    values.push(refundNo);
    const sql = `UPDATE refund_order SET ${updates.join(', ')}, updated_at = NOW() WHERE refund_no = ?`;
    const result = await db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 根据商户退款单号查询
   */
  private static async getByMerchantRefundNo(
    appId: string,
    merchantRefundNo: string
  ): Promise<RefundOrder | null> {
    const sql = `
      SELECT r.* FROM refund_order r
      JOIN pay_order p ON r.order_id = p.id
      WHERE p.app_id = ? AND r.merchant_refund_no = ?
    `;
    const rows = await db.query<RefundRow[]>(sql, [appId, merchantRefundNo]);
    return rows[0] || null;
  }

  /**
   * 获取已退款金额
   */
  private static async getRefundedAmount(orderId: number): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(refund_amount), 0) as total
      FROM refund_order
      WHERE order_id = ? AND status IN ('success', 'processing')
    `;
    const rows = await db.query<RowDataPacket[]>(sql, [orderId]);
    return (rows[0] as { total: number }).total || 0;
  }

  /**
   * 退款列表
   */
  static async list(
    appId?: string,
    status?: RefundStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ list: RefundOrder[]; total: number }> {
    let sql = `
      SELECT r.* FROM refund_order r
      JOIN pay_order p ON r.order_id = p.id
      WHERE 1=1
    `;
    let countSql = `
      SELECT COUNT(*) as total FROM refund_order r
      JOIN pay_order p ON r.order_id = p.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (appId) {
      sql += ' AND p.app_id = ?';
      countSql += ' AND p.app_id = ?';
      params.push(appId);
    }

    if (status) {
      sql += ' AND r.status = ?';
      countSql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const [list, countResult] = await Promise.all([
      db.query<RefundRow[]>(sql, params),
      db.query<RowDataPacket[]>(countSql, appId || status ? params.slice(0, -2) : [])
    ]);

    return {
      list,
      total: (countResult[0] as { total: number }).total
    };
  }
}

export default RefundService;
