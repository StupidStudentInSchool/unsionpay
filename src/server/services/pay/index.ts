// =====================================================
// 统一支付系统 - 支付服务 (Supabase)
// =====================================================

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { PayOrder, UnifiedPayRequest, UnifiedPayResponse, PayQueryResponse, OrderStatus, RefundStatus } from '../../types';
import { MerchantService } from '../merchant';
import { AlipayAdapter } from '../../adapters/alipay';
import { WechatAdapter } from '../../adapters/wechat';
import { PayAdapter, PayParams } from '../../types';
import { PayException, PayErrorCode } from '../../types';
import { generateOrderNo, calculateExpireTime, yuanToFen } from '../../utils';
import config from '../../config';

/**
 * 支付服务
 */
export class PayService {
  private static getClient() {
    return getSupabaseClient();
  }

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
      expire_time: expireTime ? new Date(expireTime) : null,
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
      expire_time: expireTime ? new Date(expireTime).toISOString() : undefined,
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
      paid_time: order.paid_time ? (order.paid_time instanceof Date ? order.paid_time.toISOString() : order.paid_time) : undefined,
      expire_time: order.expire_time ? (order.expire_time instanceof Date ? order.expire_time.toISOString() : order.expire_time) : undefined,
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
    const client = this.getClient();
    
    const insertData: Record<string, unknown> = {
      order_no: data.order_no,
      merchant_order_no: data.merchant_order_no,
      app_id: data.app_id,
      channel: data.channel,
      trade_type: data.trade_type,
      total_amount: data.total_amount,
      actual_amount: data.actual_amount,
      currency: data.currency || 'CNY',
      subject: data.subject,
      body: data.body,
      pay_url: data.pay_url,
      qr_code: data.qr_code,
      pay_params: data.pay_params,
      expire_time: data.expire_time,
      status: data.status || 'pending',
      attach: data.attach,
      client_ip: data.client_ip,
      extra: data.extra ? JSON.stringify(data.extra) : null,
    };

    const { data: result, error } = await client
      .from('pay_order')
      .insert(insertData)
      .select('id')
      .single();
    if (error) throw new Error(`创建订单失败: ${error.message}`);
    return result.id;
  }

  /**
   * 根据订单号查询
   */
  static async getByOrderNo(orderNo: string): Promise<PayOrder | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('pay_order')
      .select('*')
      .eq('order_no', orderNo)
      .maybeSingle();
    if (error) throw new Error(`查询订单失败: ${error.message}`);
    return data as PayOrder | null;
  }

  /**
   * 根据商户订单号查询
   */
  static async getByMerchantOrderNo(appId: string, merchantOrderNo: string): Promise<PayOrder | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('pay_order')
      .select('*')
      .eq('app_id', appId)
      .eq('merchant_order_no', merchantOrderNo)
      .maybeSingle();
    if (error) throw new Error(`查询订单失败: ${error.message}`);
    return data as PayOrder | null;
  }

  /**
   * 根据渠道订单号查询
   */
  static async getByChannelOrderNo(channel: string, channelOrderNo: string): Promise<PayOrder | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('pay_order')
      .select('*')
      .eq('channel', channel)
      .eq('channel_order_no', channelOrderNo)
      .maybeSingle();
    if (error) throw new Error(`查询订单失败: ${error.message}`);
    return data as PayOrder | null;
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(orderNo: string, status: OrderStatus): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client
      .from('pay_order')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('order_no', orderNo);
    if (error) throw new Error(`更新订单状态失败: ${error.message}`);
    return true;
  }

  /**
   * 更新渠道订单号
   */
  static async updateChannelOrderNo(orderNo: string, channelOrderNo: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client
      .from('pay_order')
      .update({ channel_order_no: channelOrderNo, updated_at: new Date().toISOString() })
      .eq('order_no', orderNo);
    if (error) throw new Error(`更新渠道订单号失败: ${error.message}`);
    return true;
  }

  /**
   * 标记订单已支付
   */
  static async markPaid(orderNo: string, channelOrderNo: string, paidTime?: Date): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client
      .from('pay_order')
      .update({ 
        status: 'paid', 
        channel_order_no: channelOrderNo,
        paid_time: paidTime ? paidTime.toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_no', orderNo);
    if (error) throw new Error(`标记订单已支付失败: ${error.message}`);
    return true;
  }

  /**
   * 获取退款信息
   */
  static async getRefundInfo(orderId: number): Promise<{ status: string; refund_amount: number } | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('refund_order')
      .select('status, refund_amount')
      .eq('order_id', orderId)
      .eq('status', 'success')
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw new Error(`查询退款信息失败: ${error.message}`);
    return data ? { status: data.status, refund_amount: data.refund_amount } : null;
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
    const client = this.getClient();
    
    let query = client
      .from('pay_order')
      .select('*', { count: 'exact', head: true });

    if (appId) {
      query = query.eq('app_id', appId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;
    if (error) throw new Error(`查询订单总数失败: ${error.message}`);

    const { data, error: listError } = await client
      .from('pay_order')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (listError) throw new Error(`查询订单列表失败: ${listError.message}`);

    return {
      list: (data || []) as PayOrder[],
      total: count || 0
    };
  }
}

export default PayService;

// =====================================================
// 订单列表查询
// =====================================================

export interface OrderListParams {
  page: number;
  pageSize: number;
  status?: string;
  channel?: string;
  outTradeNo?: string;
  appId?: string;
}

export interface OrderListResult {
  list: Array<{
    order_no: string;
    merchant_order_no: string;
    app_id: string;
    channel: string;
    trade_type: string;
    total_amount: number;
    status: string;
    paid_time?: string;
    created_at: string;
  }>;
  total: number;
}

export interface OrderSummaryResult {
  totalOrders: number;
  paidOrders: number;
  totalAmount: number;
  refundAmount: number;
}

export async function getOrderList(params: OrderListParams): Promise<OrderListResult> {
  const { page, pageSize, status, channel, appId } = params;
  const client = getSupabaseClient();

  let query = client
    .from('pay_order')
    .select('*', { count: 'exact', head: true });

  if (appId) {
    query = query.eq('app_id', appId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (channel) {
    query = query.eq('channel', channel);
  }

  const { count, error } = await query;
  if (error) throw new Error(`查询订单总数失败: ${error.message}`);
  const total = count || 0;

  const { data, error: listError } = await client
    .from('pay_order')
    .select('*')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (listError) throw new Error(`查询订单列表失败: ${listError.message}`);

  return {
    list: (data || []).map((item: Record<string, unknown>) => {
      const formatDate = (date: unknown): string => {
        if (!date) return '';
        if (typeof date === 'string') return date.split('T')[0];
        return String(date);
      };

      return {
        order_no: item.order_no as string,
        merchant_order_no: item.merchant_order_no as string,
        app_id: item.app_id as string,
        channel: item.channel as string,
        trade_type: item.trade_type as string,
        total_amount: item.total_amount as number,
        status: item.status as string,
        paid_time: formatDate(item.paid_time),
        created_at: formatDate(item.created_at),
      };
    }),
    total,
  };
}

export async function getOrderSummary(): Promise<OrderSummaryResult> {
  const client = getSupabaseClient();

  // 获取订单统计
  const { data: orderData, error: orderError } = await client
    .from('pay_order')
    .select('status, total_amount');
  if (orderError) throw new Error(`查询订单统计失败: ${orderError.message}`);

  const orderList = orderData || [];
  const totalOrders = orderList.length;
  const paidOrders = orderList.filter(o => o.status === 'paid').length;
  const totalAmount = orderList
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // 获取退款统计
  const { data: refundData, error: refundError } = await client
    .from('refund_order')
    .select('refund_amount')
    .eq('status', 'success');
  if (refundError) throw new Error(`查询退款统计失败: ${refundError.message}`);

  const refundAmount = (refundData || []).reduce((sum, r) => sum + (r.refund_amount || 0), 0);

  return {
    totalOrders,
    paidOrders,
    totalAmount,
    refundAmount,
  };
}

export function formatOrderListResponse(result: OrderListResult) {
  return {
    code: 0,
    message: 'success',
    data: {
      list: result.list,
      total: result.total,
    },
  };
}

export function formatOrderSummaryResponse(summary: OrderSummaryResult) {
  return {
    code: 0,
    message: 'success',
    data: {
      totalOrders: summary.totalOrders,
      paidOrders: summary.paidOrders,
      totalAmount: summary.totalAmount,
      refundAmount: summary.refundAmount,
    },
  };
}
