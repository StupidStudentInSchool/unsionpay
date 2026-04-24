// =====================================================
// 统一支付系统 - 分账服务
// =====================================================

import db, { SharingRow, DetailRow } from '../../db';
import { PoolConnection } from 'mysql2/promise';
import {
  ProfitSharingOrder,
  ProfitSharingDetail,
  UnifiedProfitSharingRequest,
  UnifiedProfitSharingResponse,
  ProfitSharingStatus,
  ProfitSharingConfig,
  ProfitSharingReceiverConfig,
} from '../../types';
import { PayService } from '../pay';
import { MerchantService } from '../merchant';
import { PayException, PayErrorCode } from '../../types';
import { generateSharingNo, generateLogId, yuanToFen, delay } from '../../utils';

/**
 * 分账服务
 */
export class ProfitSharingService {
  /**
   * 统一分账
   */
  static async unifiedProfitSharing(
    request: UnifiedProfitSharingRequest
  ): Promise<UnifiedProfitSharingResponse> {
    const {
      app_id,
      channel: requestedChannel,
      out_trade_no,
      out_sharing_no,
      amount,
      receivers,
      description,
    } = request;

    // 1. 验证商户
    const merchant = await MerchantService.getByAppId(app_id);
    if (!merchant) {
      throw new PayException('商户不存在', PayErrorCode.MERCHANT_NOT_FOUND, 404);
    }

    // 2. 检查分账功能是否开通
    if (!merchant.profit_sharing_enabled) {
      throw new PayException('该应用未开通分账功能', PayErrorCode.PROFIT_SHARING_NOT_ENABLED, 400);
    }

    // 3. 查询原支付订单
    const order = await PayService.getByMerchantOrderNo(app_id, out_trade_no);
    if (!order) {
      throw new PayException('订单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    // 4. 检查订单状态
    if (order.status !== 'paid') {
      throw new PayException('只有已支付的订单可以分账', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 5. 检查是否已分账
    const existingSharing = await this.getByOrderId(order.id);
    if (existingSharing) {
      throw new PayException('该订单已发起过分账', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 6. 确定渠道
    const channel = requestedChannel || order.channel;

    // 7. 金额处理
    const totalAmount = typeof amount === 'number' && amount < 100
      ? yuanToFen(amount)
      : Math.round(amount);

    // 8. 验证分账接收方
    const validatedReceivers = await this.validateReceivers(
      merchant.id,
      channel,
      receivers
    );

    // 9. 检查分账总额不超过订单金额
    const receiversTotal = validatedReceivers.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );
    if (receiversTotal > totalAmount) {
      throw new PayException(
        `分账金额总和(${receiversTotal / 100}元)超过订单金额(${totalAmount / 100}元)`,
        PayErrorCode.INVALID_PARAMS,
        400
      );
    }

    // 10. 生成系统分账单号
    const sharingNo = out_sharing_no || generateSharingNo();

    // 11. 使用事务创建分账记录
    await db.transaction(async () => {
      // 创建分账订单
      const orderResult = await db.execute(
        `INSERT INTO profit_sharing_order 
         (sharing_no, order_id, order_no, channel, total_amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
        [sharingNo, order.id, order.order_no, channel, totalAmount]
      );

      const sharingId = orderResult.lastInsertRowid as number;

      // 创建分账明细
      for (const receiver of validatedReceivers) {
        const detailId = `DT${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
        await db.execute(
          `INSERT INTO profit_sharing_detail
           (sharing_id, detail_id, receiver_id, receiver_type, receiver_account, 
            receiver_name, amount, share_ratio, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
          [
            sharingId,
            detailId,
            receiver.receiver_id,
            receiver.receiver_type,
            receiver.receiver_account,
            receiver.receiver_name || null,
            receiver.amount || 0,
            receiver.ratio || null,
          ]
        );
      }
    });

    // 12. 调用渠道分账接口
    try {
      const merchantRecord = merchant as unknown as { [key: string]: string };
      const result = await this.executeChannelProfitSharing(
        channel,
        merchantRecord,
        order as unknown as { [key: string]: string },
        validatedReceivers,
        description
      );

      // 更新分账状态
      await this.updateSharingStatus(sharingNo, result);

      return {
        sharing_no: sharingNo,
        channel,
        channel_batch_no: result.batch_no,
        total_amount: totalAmount,
        shared_amount: result.shared_amount,
        status: result.status,
      };
    } catch (error) {
      // 更新分账失败状态
      await this.updateSharingStatus(sharingNo, {
        status: 'failed',
        fail_reason: error instanceof Error ? error.message : '分账失败',
      });
      throw error;
    }
  }

  /**
   * 查询分账
   */
  static async query(sharingNo: string): Promise<UnifiedProfitSharingResponse | null> {
    const sharing = await this.getBySharingNo(sharingNo);
    if (!sharing) {
      return null;
    }

    return {
      sharing_no: sharing.sharing_no,
      channel: sharing.channel,
      channel_batch_no: sharing.channel_batch_no,
      total_amount: sharing.total_amount,
      shared_amount: sharing.shared_amount,
      status: sharing.status,
    };
  }

  /**
   * 完成分账（完结分账账单）
   */
  static async finish(sharingNo: string): Promise<boolean> {
    const sharing = await this.getBySharingNo(sharingNo);
    if (!sharing) {
      throw new PayException('分账单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    if (sharing.status !== 'processing') {
      throw new PayException('只有处于分账中的账单可以完结', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 调用渠道完结接口
    const merchant = await MerchantService.getByAppId(sharing.order_no.split('_')[0]);
    if (!merchant) {
      throw new PayException('商户不存在', PayErrorCode.MERCHANT_NOT_FOUND, 404);
    }

    // 根据渠道调用完结
    // ...

    await this.updateSharingStatus(sharingNo, {
      status: 'finished',
      finish_reason: 'FINISH',
    });

    return true;
  }

  /**
   * 分账回退（退款时需要回退分账）
   */
  static async return(sharingNo: string, amount: number): Promise<boolean> {
    const sharing = await this.getBySharingNo(sharingNo);
    if (!sharing) {
      throw new PayException('分账单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    if (sharing.status !== 'finished') {
      throw new PayException('只有已完成的分账可以回退', PayErrorCode.INVALID_PARAMS, 400);
    }

    // 调用渠道分账回退接口
    // ...

    return true;
  }

  // ==================== 私有方法 ====================

  /**
   * 验证分账接收方
   */
  private static async validateReceivers(
    merchantId: number,
    channel: string,
    receivers: ProfitSharingReceiverConfig[]
  ): Promise<ProfitSharingReceiverConfig[]> {
    const validReceivers: ProfitSharingReceiverConfig[] = [];

    for (const receiver of receivers) {
      // 如果没有金额，根据比例计算
      if (!receiver.amount && receiver.ratio) {
        // 需要外部传入订单金额才能计算，这里简化处理
        receiver.amount = 0;
      }

      validReceivers.push(receiver);
    }

    return validReceivers;
  }

  /**
   * 执行渠道分账
   */
  private static async executeChannelProfitSharing(
    channel: string,
    merchant: { [key: string]: string },
    order: { [key: string]: string },
    receivers: ProfitSharingReceiverConfig[],
    description?: string
  ): Promise<{
    batch_no: string;
    shared_amount: number;
    status: ProfitSharingStatus;
  }> {
    // 根据渠道调用对应的分账接口
    if (channel === 'wechat') {
      return this.executeWechatProfitSharing(merchant, order, receivers, description);
    } else if (channel === 'alipay') {
      return this.executeAlipayProfitSharing(merchant, order, receivers, description);
    }

    throw new PayException('不支持的分账渠道', PayErrorCode.CHANNEL_NOT_SUPPORTED, 400);
  }

  /**
   * 执行微信分账
   */
  private static async executeWechatProfitSharing(
    merchant: { [key: string]: unknown },
    order: { [key: string]: unknown },
    receivers: ProfitSharingReceiverConfig[],
    description?: string
  ): Promise<{
    batch_no: string;
    shared_amount: number;
    status: ProfitSharingStatus;
  }> {
    // 微信支付分账接口调用
    // 实际实现需要调用微信支付的分账API
    // https://api.mch.weixin.qq.com/v3/profitsharing/orders

    const batchNo = `PS${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    
    // 模拟成功响应
    return {
      batch_no: batchNo,
      shared_amount: receivers.reduce((sum, r) => sum + (r.amount || 0), 0),
      status: 'processing',
    };
  }

  /**
   * 执行支付宝分账
   */
  private static async executeAlipayProfitSharing(
    merchant: { [key: string]: string },
    order: { [key: string]: string },
    receivers: ProfitSharingReceiverConfig[],
    _description?: string
  ): Promise<{
    batch_no: string;
    shared_amount: number;
    status: ProfitSharingStatus;
  }> {
    // 支付宝分账接口调用
    // 实际实现需要调用支付宝的分账API
    // alipay.trade.royalty

    const batchNo = `PS${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

    // 模拟成功响应
    return {
      batch_no: batchNo,
      shared_amount: receivers.reduce((sum, r) => sum + (r.amount || 0), 0),
      status: 'processing',
    };
  }

  /**
   * 更新分账状态
   */
  private static async updateSharingStatus(
    sharingNo: string,
    data: {
      status?: ProfitSharingStatus;
      channel_batch_no?: string;
      shared_amount?: number;
      fail_reason?: string;
      finish_reason?: string;
      unfreeze_amount?: number;
    }
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

    values.push(sharingNo);
    const sql = `UPDATE profit_sharing_order SET ${updates.join(', ')}, updated_at = NOW() WHERE sharing_no = ?`;
    const result = await db.execute(sql, values);
    return result.changes > 0;
  }

  /**
   * 更新分账（含更多字段）
   */
  private static async updateSharing(
    sharingNo: string,
    data: Partial<ProfitSharingOrder>
  ): Promise<boolean> {
    return this.updateSharingStatus(sharingNo, data as {
      status?: ProfitSharingStatus;
      channel_batch_no?: string;
      shared_amount?: number;
      fail_reason?: string;
      finish_reason?: string;
      unfreeze_amount?: number;
    });
  }

  /**
   * 根据分账单号查询
   */
  private static async getBySharingNo(sharingNo: string): Promise<ProfitSharingOrder | null> {
    const sql = 'SELECT * FROM profit_sharing_order WHERE sharing_no = ?';
    const rows = await db.query<SharingRow>(sql, [sharingNo]);
    return (rows[0] as unknown as ProfitSharingOrder) || null;
  }

  /**
   * 根据订单ID查询分账
   */
  private static async getByOrderId(orderId: number): Promise<ProfitSharingOrder | null> {
    const sql = 'SELECT * FROM profit_sharing_order WHERE order_id = ?';
    const rows = await db.query<SharingRow>(sql, [orderId]);
    return (rows[0] as unknown as ProfitSharingOrder) || null;
  }

  /**
   * 获取分账明细
   */
  private static async getDetails(sharingId: number): Promise<ProfitSharingDetail[]> {
    const sql = 'SELECT * FROM profit_sharing_detail WHERE sharing_id = ?';
    const rows = await db.query<DetailRow>(sql, [sharingId]);
    return rows as unknown as ProfitSharingDetail[];
  }
}

export default ProfitSharingService;
