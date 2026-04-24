// =====================================================
// 统一支付系统 - 回调通知服务
// =====================================================

import db from '../../db';
import { NotifyLogRow, NotifyTargetRow } from '../../db';
import { NotifyLog, NotifyTarget, PayChannel } from '../../types';
import { PayService } from '../pay';
import { PayException, PayErrorCode } from '../../types';
import { generateLogId, delay } from '../../utils';
import config from '../../config';

/**
 * 回调通知服务
 */
export const NotifyService = {
  /**
   * 处理支付回调
   */
  async handlePayNotify(
    channel: PayChannel,
    request: Request,
    signConfig: { alipay_public_key?: string; wechat_api_key?: string }
  ): Promise<{
    order_no: string;
    channel_order_no: string;
    status: string;
    amount: number;
  }> {
    // 1. 获取适配器
    const adapter = channel === 'alipay' 
      ? await import('../../adapters/alipay').then(m => m.AlipayAdapter)
      : await import('../../adapters/wechat').then(m => m.WechatAdapter);

    // 2. 解析回调
    const result = await adapter.parseNotify(request, signConfig as Parameters<typeof adapter.parseNotify>[1]);

    // 3. 记录回调日志
    const logId = await this.createNotifyLog({
      log_id: generateLogId(),
      channel,
      notify_type: 'pay',
      notify_data: JSON.stringify(result.raw_data),
      status: 'received',
      received_at: new Date(),
    });

    // 4. 处理回调
    try {
      await this.processPayNotify(result);
      
      await this.updateNotifyLog(logId, {
        status: 'success',
        processed_at: new Date(),
      });

      return {
        order_no: result.order_no,
        channel_order_no: result.channel_order_no,
        status: result.status,
        amount: result.amount,
      };
    } catch (error) {
      await this.updateNotifyLog(logId, {
        status: 'failed',
        process_result: error instanceof Error ? error.message : '处理失败',
      });
      throw error;
    }
  },

  /**
   * 处理退款回调
   */
  async handleRefundNotify(
    channel: PayChannel,
    request: Request,
    signConfig: { alipay_public_key?: string; wechat_api_key?: string }
  ): Promise<{
    refund_no: string;
    channel_refund_no: string;
    status: string;
    refund_amount: number;
  }> {
    // 1. 获取适配器
    const adapter = channel === 'alipay' 
      ? await import('../../adapters/alipay').then(m => m.AlipayAdapter)
      : await import('../../adapters/wechat').then(m => m.WechatAdapter);

    // 2. 解析回调
    const result = await adapter.parseNotify(request, signConfig as Parameters<typeof adapter.parseNotify>[1]);

    // 3. 记录回调日志
    const logId = await this.createNotifyLog({
      log_id: generateLogId(),
      channel,
      notify_type: 'refund',
      notify_data: JSON.stringify(result.raw_data),
      status: 'received',
      received_at: new Date(),
    });

    // 4. 处理回调
    try {
      // TODO: 实现退款回调处理逻辑
      await this.updateNotifyLog(logId, {
        status: 'success',
        processed_at: new Date(),
      });

      return {
        refund_no: result.order_no,
        channel_refund_no: result.channel_order_no,
        status: result.status,
        refund_amount: result.amount,
      };
    } catch (error) {
      await this.updateNotifyLog(logId, {
        status: 'failed',
        process_result: error instanceof Error ? error.message : '处理失败',
      });
      throw error;
    }
  },

  /**
   * 处理支付通知
   */
  async processPayNotify(result: {
    order_no: string;
    channel_order_no: string;
    status: string;
    amount: number;
    paid_time?: string;
  }): Promise<void> {
    // 查询本地订单
    const order = await PayService.getByOrderNo(result.order_no);
    
    if (!order) {
      throw new PayException('订单不存在', PayErrorCode.ORDER_NOT_FOUND, 404);
    }

    // 更新订单状态
    if (result.status === 'paid') {
      await PayService.markPaid(
        order.order_no,
        result.channel_order_no,
        result.paid_time ? new Date(result.paid_time) : new Date()
      );

      // 推送通知给业务应用
      await this.pushNotifyToApp(order.app_id, 'pay', {
        order_no: order.order_no,
        merchant_order_no: order.merchant_order_no,
        channel: order.channel,
        channel_order_no: result.channel_order_no,
        status: 'paid',
        amount: result.amount,
        paid_time: result.paid_time,
      });
    }
  },

  /**
   * 推送通知给业务应用
   */
  async pushNotifyToApp(
    appId: string,
    notifyType: 'pay' | 'refund' | 'profit_sharing',
    data: Record<string, unknown>
  ): Promise<void> {
    // 1. 获取回调目标配置
    const targets = await this.getNotifyTargets(appId, notifyType);

    // 2. 逐个推送
    for (const target of targets) {
      await this.pushToTarget(target, data);
    }
  },

  /**
   * 推送到指定目标
   */
  async pushToTarget(
    target: NotifyTarget,
    data: Record<string, unknown>
  ): Promise<void> {
    if (target.status !== 'active') return;

    // 构建签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).slice(2, 18);
    
    // TODO: 计算签名
    const sign = '';

    // 发送请求
    const maxRetries = target.max_retry || 3;
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(target.notify_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Timestamp': timestamp,
            'X-Nonce': nonce,
            'X-Sign': sign,
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          return; // 成功
        }

        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // 重试等待
      if (i < maxRetries) {
        await delay(60000);
      }
    }

    // 记录失败
    console.error(`推送通知失败: ${target.notify_url}`, lastError);
  },

  /**
   * 获取回调目标配置
   */
  async getNotifyTargets(
    appId: string,
    notifyType: 'pay' | 'refund' | 'profit_sharing'
  ): Promise<NotifyTarget[]> {
    const sql = `
      SELECT * FROM notify_target
      WHERE app_id = ? AND notify_type = ? AND status = 'active'
    `;
    const rows = await db.query<NotifyTargetRow>(sql, [appId, notifyType]);
    return rows as unknown as NotifyTarget[];
  },

  /**
   * 创建回调日志
   */
  async createNotifyLog(data: Partial<NotifyLog>): Promise<string> {
    const logId = data.log_id || generateLogId();
    
    await db.execute(
      `INSERT INTO notify_log 
       (log_id, order_id, order_no, channel, notify_type, notify_data, status, received_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        data.order_id || null,
        data.order_no || null,
        data.channel,
        data.notify_type,
        data.notify_data,
        data.status,
        data.received_at || new Date(),
        data.retry_count || 0,
      ]
    );

    return logId;
  },

  /**
   * 更新回调日志
   */
  async updateNotifyLog(
    logId: string,
    data: Partial<NotifyLog>
  ): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return;

    values.push(logId);
    await db.execute(
      `UPDATE notify_log SET ${updates.join(', ')} WHERE log_id = ?`,
      values
    );
  },

  /**
   * 回调日志列表
   */
  async listLogs(
    appId?: string,
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ list: NotifyLog[]; total: number }> {
    let sql = `
      SELECT l.* FROM notify_log l
      LEFT JOIN pay_order p ON l.order_id = p.id
      WHERE 1=1
    `;
    let countSql = `
      SELECT COUNT(*) as total FROM notify_log l
      LEFT JOIN pay_order p ON l.order_id = p.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (appId) {
      sql += ' AND p.app_id = ?';
      countSql += ' AND p.app_id = ?';
      params.push(appId);
    }

    if (status) {
      sql += ' AND l.status = ?';
      countSql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.received_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const [list, countResult] = await Promise.all([
      db.query<NotifyLogRow>(sql, params),
      db.query<NotifyLogRow>(countSql, appId || status ? params.slice(0, -2) : [])
    ]);

    return {
      list: list as unknown as NotifyLog[],
      total: (countResult[0] as unknown as { total: number }).total || 0
    };
  },
};

export default NotifyService;
