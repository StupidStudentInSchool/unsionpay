// =====================================================
// 统一支付系统 - 商户服务
// =====================================================

import { RowDataPacket } from 'mysql2/promise';
import db from '../../db';
import { MerchantConfig, ProfitSharingReceiver, MerchantStatus } from '../../types';

interface MerchantRow extends RowDataPacket, MerchantConfig {}

interface ReceiverRow extends RowDataPacket, ProfitSharingReceiver {}

/**
 * 商户服务
 */
export class MerchantService {
  /**
   * 根据 app_id 获取商户配置
   */
  static async getByAppId(appId: string): Promise<MerchantConfig | null> {
    const sql = `
      SELECT * FROM merchant_config 
      WHERE app_id = ? AND status = 'active'
    `;
    const rows = await db.query<MerchantRow[]>(sql, [appId]);
    return rows[0] || null;
  }

  /**
   * 根据 ID 获取商户配置
   */
  static async getById(id: number): Promise<MerchantConfig | null> {
    const sql = `SELECT * FROM merchant_config WHERE id = ?`;
    const rows = await db.query<MerchantRow[]>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * 获取商户的分账方配置
   */
  static async getProfitSharingReceivers(merchantId: number): Promise<ProfitSharingReceiver[]> {
    const sql = `
      SELECT * FROM profit_sharing_receiver 
      WHERE merchant_id = ? AND status = 'active'
    `;
    const rows = await db.query<ReceiverRow[]>(sql, [merchantId]);
    return rows;
  }

  /**
   * 创建商户配置
   */
  static async create(data: Partial<MerchantConfig>): Promise<number> {
    const fields = [
      'app_id', 'app_name', 'channel',
      'alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_notify_url',
      'wechat_app_id', 'wechat_mch_id', 'wechat_api_key', 'wechat_private_key', 
      'wechat_public_cert', 'wechat_notify_url',
      'profit_sharing_enabled', 'alipay_royalty_mode', 'wechat_profit_sharing_enabled',
      'default_channel', 'status', 'rate_limit', 'ip_whitelist', 'remark'
    ];

    const values = fields.map(field => data[field as keyof MerchantConfig]);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO merchant_config (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.execute(sql, values);
    return result.insertId;
  }

  /**
   * 更新商户配置
   */
  static async update(id: number, data: Partial<MerchantConfig>): Promise<boolean> {
    const updates: string[] = [];
    const values: unknown[] = [];

    const fields = [
      'app_name', 'channel',
      'alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_notify_url',
      'wechat_app_id', 'wechat_mch_id', 'wechat_api_key', 'wechat_private_key', 
      'wechat_public_cert', 'wechat_notify_url',
      'profit_sharing_enabled', 'alipay_royalty_mode', 'wechat_profit_sharing_enabled',
      'default_channel', 'status', 'rate_limit', 'ip_whitelist', 'remark'
    ];

    for (const field of fields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        values.push(data[field as keyof MerchantConfig]);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    const sql = `UPDATE merchant_config SET ${updates.join(', ')} WHERE id = ?`;
    const result = await db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 验证商户是否有效
   */
  static async validate(appId: string): Promise<{ valid: boolean; config?: MerchantConfig; error?: string }> {
    const config = await this.getByAppId(appId);
    
    if (!config) {
      return { valid: false, error: '商户不存在' };
    }

    if (config.status !== 'active') {
      return { valid: false, error: '商户已禁用' };
    }

    return { valid: true, config };
  }

  /**
   * 检查渠道是否支持
   */
  static async checkChannelSupport(appId: string, channel: string): Promise<boolean> {
    const config = await this.getByAppId(appId);
    if (!config) return false;
    
    if (config.channel === 'both') return true;
    return config.channel === channel;
  }

  /**
   * 获取商户的分账方配置
   */
  static async getReceivers(appId: string, receiverIds?: string[]): Promise<ProfitSharingReceiver[]> {
    const merchant = await this.getByAppId(appId);
    if (!merchant) return [];

    let sql = `
      SELECT * FROM profit_sharing_receiver 
      WHERE merchant_id = ? AND status = 'active'
    `;
    const params: unknown[] = [merchant.id];

    if (receiverIds && receiverIds.length > 0) {
      sql += ` AND receiver_id IN (${receiverIds.map(() => '?').join(', ')})`;
      params.push(...receiverIds);
    }

    const rows = await db.query<ReceiverRow[]>(sql, params);
    return rows;
  }

  /**
   * 创建分账方配置
   */
  static async createReceiver(data: Partial<ProfitSharingReceiver>): Promise<number> {
    const fields = [
      'merchant_id', 'receiver_id', 'receiver_type', 'receiver_account', 
      'receiver_name', 'relation_type', 'relation_name', 'max_ratio', 'max_amount', 'status'
    ];

    const values = fields.map(field => data[field as keyof ProfitSharingReceiver]);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO profit_sharing_receiver (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.execute(sql, values);
    return result.insertId;
  }

  /**
   * 列出所有商户
   */
  static async list(
    page: number = 1, 
    pageSize: number = 20,
    status?: MerchantStatus
  ): Promise<{ list: MerchantConfig[]; total: number }> {
    let sql = 'SELECT * FROM merchant_config WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM merchant_config WHERE 1=1';
    const params: unknown[] = [];

    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const [list, countResult] = await Promise.all([
      db.query<MerchantRow[]>(sql, params),
      db.query<RowDataPacket[]>(countSql, status ? [status] : [])
    ]);

    return {
      list,
      total: (countResult[0] as { total: number }).total
    };
  }

  /**
   * 删除商户
   */
  static async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM merchant_config WHERE id = ?`;
    const result = await db.execute(sql, [id]);
    return result.affectedRows > 0;
  }
}

export default MerchantService;
