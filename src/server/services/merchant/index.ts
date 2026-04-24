// =====================================================
// 统一支付系统 - 商户服务 (Supabase)
// =====================================================

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { MerchantConfig, ProfitSharingReceiver, MerchantStatus } from '../../types';

/**
 * 商户服务
 */
export class MerchantService {
  private static getClient() {
    return getSupabaseClient();
  }

  /**
   * 根据 app_id 获取商户配置
   */
  static async getByAppId(appId: string): Promise<MerchantConfig | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('merchant_config')
      .select('*')
      .eq('app_id', appId)
      .or('status.eq.active,status.is.null')
      .maybeSingle();
    if (error) throw new Error(`查询商户失败: ${error.message}`);
    return data as MerchantConfig | null;
  }

  /**
   * 根据 ID 获取商户配置
   */
  static async getById(id: number): Promise<MerchantConfig | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('merchant_config')
      .select('*')
      .eq('id', id)
      .or('status.eq.active,status.is.null')
      .maybeSingle();
    if (error) throw new Error(`查询商户失败: ${error.message}`);
    return data as MerchantConfig | null;
  }

  /**
   * 获取商户的分账方配置
   */
  static async getProfitSharingReceivers(merchantId: number): Promise<ProfitSharingReceiver[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('profit_sharing_receiver')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('status', 'active');
    if (error) throw new Error(`查询分账方失败: ${error.message}`);
    return (data || []) as ProfitSharingReceiver[];
  }

  /**
   * 创建商户配置
   */
  static async create(data: Partial<MerchantConfig>): Promise<number> {
    const client = this.getClient();
    
    // 处理布尔值转换为整数
    const insertData: Record<string, unknown> = { ...data };
    if ('profit_sharing_enabled' in insertData && typeof insertData.profit_sharing_enabled === 'boolean') {
      insertData.profit_sharing_enabled = insertData.profit_sharing_enabled ? 1 : 0;
    }
    if ('wechat_profit_sharing_enabled' in insertData && typeof insertData.wechat_profit_sharing_enabled === 'boolean') {
      insertData.wechat_profit_sharing_enabled = insertData.wechat_profit_sharing_enabled ? 1 : 0;
    }

    const { data: result, error } = await client
      .from('merchant_config')
      .insert(insertData)
      .select('id')
      .single();
    if (error) throw new Error(`创建商户失败: ${error.message}`);
    return result.id;
  }

  /**
   * 更新商户配置
   */
  static async update(id: number, data: Partial<MerchantConfig>): Promise<boolean> {
    const client = this.getClient();
    
    // 处理布尔值转换为整数
    const updateData: Record<string, unknown> = { ...data };
    if ('profit_sharing_enabled' in updateData && typeof updateData.profit_sharing_enabled === 'boolean') {
      updateData.profit_sharing_enabled = updateData.profit_sharing_enabled ? 1 : 0;
    }
    if ('wechat_profit_sharing_enabled' in updateData && typeof updateData.wechat_profit_sharing_enabled === 'boolean') {
      updateData.wechat_profit_sharing_enabled = updateData.wechat_profit_sharing_enabled ? 1 : 0;
    }

    const { error } = await client
      .from('merchant_config')
      .update(updateData)
      .eq('id', id);
    if (error) throw new Error(`更新商户失败: ${error.message}`);
    return true;
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

    const client = this.getClient();
    let query = client
      .from('profit_sharing_receiver')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('status', 'active');

    if (receiverIds && receiverIds.length > 0) {
      query = query.in('receiver_id', receiverIds);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询分账方失败: ${error.message}`);
    return (data || []) as ProfitSharingReceiver[];
  }

  /**
   * 创建分账方配置
   */
  static async createReceiver(data: Partial<ProfitSharingReceiver>): Promise<number> {
    const client = this.getClient();
    const { data: result, error } = await client
      .from('profit_sharing_receiver')
      .insert(data)
      .select('id')
      .single();
    if (error) throw new Error(`创建分账方失败: ${error.message}`);
    return result.id;
  }

  /**
   * 列出所有商户
   */
  static async list(
    page: number = 1, 
    pageSize: number = 20,
    status?: MerchantStatus
  ): Promise<{ list: MerchantConfig[]; total: number }> {
    const client = this.getClient();
    
    let query = client
      .from('merchant_config')
      .select('*', { count: 'exact', head: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;
    if (error) throw new Error(`查询商户总数失败: ${error.message}`);

    const { data, error: listError } = await client
      .from('merchant_config')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (listError) throw new Error(`查询商户列表失败: ${listError.message}`);

    return {
      list: (data || []) as MerchantConfig[],
      total: count || 0
    };
  }

  /**
   * 删除商户
   */
  static async delete(id: number): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client
      .from('merchant_config')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`删除商户失败: ${error.message}`);
    return true;
  }
}

export default MerchantService;
