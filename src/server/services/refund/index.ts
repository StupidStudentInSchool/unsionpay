// =====================================================
// 统一支付系统 - 退款服务 (Supabase)
// =====================================================

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { RefundOrder, UnifiedRefundRequest, UnifiedRefundResponse, RefundStatus } from '../../types';
import { PayService } from '../pay';
import { MerchantService } from '../merchant';
import { PayException, PayErrorCode } from '../../types';
import { generateRefundNo, yuanToFen } from '../../utils';

/**
 * 退款服务
 */
export class RefundService {
  private static getClient() {
    return getSupabaseClient();
  }

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
    const client = this.getClient();
    
    const insertData: Record<string, unknown> = {
      refund_no: data.refund_no,
      order_id: data.order_id,
      order_no: data.order_no,
      merchant_refund_no: data.merchant_refund_no,
      channel: data.channel,
      total_amount: data.total_amount,
      refund_amount: data.refund_amount,
      refunded_amount: 0,
      reason: data.reason,
      status: data.status || 'pending',
    };

    const { data: result, error } = await client
      .from('refund_order')
      .insert(insertData)
      .select('id')
      .single();
    if (error) throw new Error(`创建退款记录失败: ${error.message}`);
    return result.id;
  }

  /**
   * 更新退款记录
   */
  private static async updateRefund(
    refundNo: string,
    data: Partial<RefundOrder>
  ): Promise<boolean> {
    const client = this.getClient();
    
    const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
    if (data.refund_time) {
      updateData.refund_time = data.refund_time instanceof Date 
        ? data.refund_time.toISOString() 
        : data.refund_time;
    }

    const { error } = await client
      .from('refund_order')
      .update(updateData)
      .eq('refund_no', refundNo);
    if (error) throw new Error(`更新退款记录失败: ${error.message}`);
    return true;
  }

  /**
   * 根据商户退款单号查询
   */
  private static async getByMerchantRefundNo(
    appId: string,
    merchantRefundNo: string
  ): Promise<RefundOrder | null> {
    const client = this.getClient();
    
    // 先获取订单的 app_id
    const { data, error } = await client
      .from('refund_order')
      .select('*')
      .eq('merchant_refund_no', merchantRefundNo)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw new Error(`查询退款记录失败: ${error.message}`);
    
    if (!data) return null;
    
    // 验证订单属于该商户
    const order = await PayService.getByOrderNo(data.order_no);
    if (!order || order.app_id !== appId) {
      return null;
    }
    
    return data as RefundOrder;
  }

  /**
   * 获取已退款金额
   */
  private static async getRefundedAmount(orderId: number): Promise<number> {
    const client = this.getClient();
    const { data, error } = await client
      .from('refund_order')
      .select('refund_amount')
      .eq('order_id', orderId)
      .in('status', ['success', 'processing']);
    if (error) throw new Error(`查询已退款金额失败: ${error.message}`);
    return (data || []).reduce((sum, r) => sum + (r.refund_amount || 0), 0);
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
    const client = this.getClient();
    
    // 如果有 appId，先获取该商户的订单号列表
    let orderNos: string[] = [];
    if (appId) {
      const { data: orders, error: orderError } = await client
        .from('pay_order')
        .select('order_no')
        .eq('app_id', appId);
      if (orderError) throw new Error(`查询订单失败: ${orderError.message}`);
      orderNos = (orders || []).map(o => o.order_no);
    }

    // 构建查询
    let query = client
      .from('refund_order')
      .select('*', { count: 'exact', head: true });

    if (orderNos.length > 0) {
      query = query.in('order_no', orderNos);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;
    if (error) throw new Error(`查询退款总数失败: ${error.message}`);

    const { data, error: listError } = await client
      .from('refund_order')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (listError) throw new Error(`查询退款列表失败: ${listError.message}`);

    // 过滤出属于该商户的退款
    let filteredData = data || [];
    if (appId && orderNos.length > 0) {
      filteredData = filteredData.filter(r => orderNos.includes(r.order_no));
    }

    return {
      list: filteredData as RefundOrder[],
      total: count || 0
    };
  }
}

export default RefundService;

// =====================================================
// 退款列表查询
// =====================================================

export interface RefundListParams {
  page: number;
  pageSize: number;
  status?: string;
  appId?: string;
}

export interface RefundListResult {
  list: Array<{
    refund_no: string;
    order_no: string;
    merchant_refund_no: string;
    channel: string;
    total_amount: number;
    refund_amount: number;
    refunded_amount: number;
    reason?: string;
    status: string;
    fail_reason?: string;
    refund_time?: string;
    created_at: string;
  }>;
  total: number;
}

export async function getRefundList(params: RefundListParams): Promise<RefundListResult> {
  const { page, pageSize, status, appId } = params;
  const client = getSupabaseClient();

  // 如果有 appId，先获取该商户的订单号列表
  let orderNos: string[] = [];
  if (appId) {
    const { data: orders, error: orderError } = await client
      .from('pay_order')
      .select('order_no')
      .eq('app_id', appId);
    if (orderError) throw new Error(`查询订单失败: ${orderError.message}`);
    orderNos = (orders || []).map(o => o.order_no);
  }

  // 构建查询
  let query = client
    .from('refund_order')
    .select('*', { count: 'exact', head: true });

  if (orderNos.length > 0) {
    query = query.in('order_no', orderNos);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { count, error } = await query;
  if (error) throw new Error(`查询退款总数失败: ${error.message}`);
  const total = count || 0;

  const { data, error: listError } = await client
    .from('refund_order')
    .select('*')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (listError) throw new Error(`查询退款列表失败: ${listError.message}`);

  // 过滤出属于该商户的退款
  let filteredData = data || [];
  if (appId && orderNos.length > 0) {
    filteredData = filteredData.filter(r => orderNos.includes(r.order_no));
  }

  return {
    list: filteredData.map((item: Record<string, unknown>) => {
      const formatDate = (date: unknown): string => {
        if (!date) return '';
        if (typeof date === 'string') return date.split('T')[0];
        return String(date);
      };

      return {
        refund_no: item.refund_no as string,
        order_no: item.order_no as string,
        merchant_refund_no: item.merchant_refund_no as string,
        channel: item.channel as string,
        total_amount: item.total_amount as number,
        refund_amount: item.refund_amount as number,
        refunded_amount: (item.refunded_amount as number) || 0,
        reason: item.reason as string | undefined,
        status: item.status as string,
        fail_reason: item.fail_reason as string | undefined,
        refund_time: formatDate(item.refund_time),
        created_at: formatDate(item.created_at),
      };
    }),
    total,
  };
}

export async function queryRefund(
  appId: string,
  outRefundNo: string
): Promise<UnifiedRefundResponse | null> {
  return RefundService.query(appId, outRefundNo);
}

export function formatRefundListResponse(result: RefundListResult) {
  return {
    code: 0,
    message: 'success',
    data: {
      list: result.list,
      total: result.total,
    },
  };
}
