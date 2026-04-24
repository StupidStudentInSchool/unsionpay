'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

const merchantSchema = z.object({
  app_id: z.string().min(1, '请输入商户ID'),
  app_name: z.string().min(1, '请输入商户名称'),
  channel: z.enum(['alipay', 'wechat', 'both']),
  default_channel: z.enum(['alipay', 'wechat']),
  profit_sharing_enabled: z.boolean(),
  // 支付宝配置
  alipay_app_id: z.string().optional(),
  alipay_private_key: z.string().optional(),
  alipay_public_key: z.string().optional(),
  alipay_alipay_public_key: z.string().optional(), // 支付宝返回的公钥
  alipay_notify_url: z.string().url('请输入有效的URL').optional().or(z.literal('')),
  // 微信配置
  wechat_app_id: z.string().optional(),
  wechat_mch_id: z.string().optional(),
  wechat_api_key: z.string().optional(),
  wechat_private_key: z.string().optional(),
  wechat_public_cert: z.string().optional(),
  wechat_notify_url: z.string().url('请输入有效的URL').optional().or(z.literal('')),
  // 状态
  status: z.enum(['active', 'inactive', 'suspended']),
  remark: z.string().optional(),
});

type MerchantFormData = z.infer<typeof merchantSchema>;

interface MerchantFormProps {
  merchant?: {
    app_id: string;
    app_name: string;
    channel: string | null;
    default_channel?: string | null;
    profit_sharing_enabled: number | boolean | null;
    alipay_app_id?: string | null;
    alipay_private_key?: string | null;
    alipay_public_key?: string | null;
    alipay_alipay_public_key?: string | null;
    wechat_app_id?: string | null;
    wechat_mch_id?: string | null;
    wechat_api_key?: string | null;
    wechat_private_key?: string | null;
    wechat_public_cert?: string | null;
    alipay_notify_url?: string | null;
    wechat_notify_url?: string | null;
    status?: string | null;
    remark?: string | null;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function MerchantForm({ merchant, onSuccess, onCancel }: MerchantFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MerchantFormData>({
    resolver: zodResolver(merchantSchema),
    defaultValues: merchant
      ? {
          app_id: merchant.app_id,
          app_name: merchant.app_name,
          channel: (merchant.channel as 'alipay' | 'wechat' | 'both') || 'both',
          default_channel: (merchant.default_channel as 'alipay' | 'wechat') || 'alipay',
          profit_sharing_enabled: Boolean(merchant.profit_sharing_enabled),
          alipay_app_id: merchant.alipay_app_id || '',
          alipay_private_key: merchant.alipay_private_key || '',
          alipay_public_key: merchant.alipay_public_key || '',
          alipay_alipay_public_key: merchant.alipay_alipay_public_key || '',
          alipay_notify_url: merchant.alipay_notify_url || '',
          wechat_app_id: merchant.wechat_app_id || '',
          wechat_mch_id: merchant.wechat_mch_id || '',
          wechat_api_key: merchant.wechat_api_key || '',
          wechat_private_key: merchant.wechat_private_key || '',
          wechat_public_cert: merchant.wechat_public_cert || '',
          wechat_notify_url: merchant.wechat_notify_url || '',
          status: (merchant.status as 'active' | 'inactive' | 'suspended') || 'active',
          remark: merchant.remark || '',
        }
      : {
          channel: 'both',
          default_channel: 'alipay',
          profit_sharing_enabled: false,
          alipay_app_id: '',
          alipay_private_key: '',
          alipay_public_key: '',
          alipay_alipay_public_key: '',
          alipay_notify_url: '',
          wechat_app_id: '',
          wechat_mch_id: '',
          wechat_api_key: '',
          wechat_private_key: '',
          wechat_public_cert: '',
          wechat_notify_url: '',
          status: 'active',
          remark: '',
        },
  });

  const channel = watch('channel');

  const onSubmit = async (data: MerchantFormData) => {
    setLoading(true);
    setError('');

    try {
      const url = merchant ? `/api/merchant/${merchant.app_id}` : '/api/merchant';
      const method = merchant ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.code === 0) {
        onSuccess();
      } else {
        setError(result.message || '操作失败');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, (errors) => {
      console.error('Form validation errors:', errors);
    })} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* 基础信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="app_id">商户ID *</Label>
              <Input
                id="app_id"
                {...register('app_id')}
                placeholder="例如: app_001"
                disabled={!!merchant}
              />
              {errors.app_id && (
                <p className="text-sm text-red-500">{errors.app_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="app_name">商户名称 *</Label>
              <Input
                id="app_name"
                {...register('app_name')}
                placeholder="例如: 我的电商应用"
              />
              {errors.app_name && (
                <p className="text-sm text-red-500">{errors.app_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>支付渠道 *</Label>
              <Select
                value={channel}
                onValueChange={(value) => setValue('channel', value as 'alipay' | 'wechat' | 'both')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">支付宝 + 微信</SelectItem>
                  <SelectItem value="alipay">仅支付宝</SelectItem>
                  <SelectItem value="wechat">仅微信支付</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>默认渠道 *</Label>
              <Select
                value={watch('default_channel')}
                onValueChange={(value) => setValue('default_channel', value as 'alipay' | 'wechat')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alipay">支付宝</SelectItem>
                  <SelectItem value="wechat">微信支付</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="profit_sharing_enabled"
              checked={watch('profit_sharing_enabled')}
              onCheckedChange={(checked) => setValue('profit_sharing_enabled', checked)}
            />
            <Label htmlFor="profit_sharing_enabled">启用分账功能</Label>
          </div>
        </CardContent>
      </Card>

      {/* 支付宝配置 */}
      {(channel === 'alipay' || channel === 'both') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">支付宝配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alipay_app_id">应用ID</Label>
                <Input
                  id="alipay_app_id"
                  {...register('alipay_app_id')}
                  placeholder="支付宝应用AppID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alipay_notify_url">回调地址</Label>
                <Input
                  id="alipay_notify_url"
                  {...register('alipay_notify_url')}
                  placeholder="https://your-domain.com/api/notify/alipay"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="alipay_private_key">应用私钥</Label>
                <span className="text-xs text-slate-500">用于签名</span>
              </div>
              <textarea
                id="alipay_private_key"
                {...register('alipay_private_key')}
                placeholder="使用密钥工具生成后粘贴"
                className="w-full h-24 px-3 py-2 text-sm border rounded-md font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alipay_public_key">应用公钥</Label>
              <textarea
                id="alipay_public_key"
                {...register('alipay_public_key')}
                placeholder="从支付宝密钥工具或支付宝开放平台获取"
                className="w-full h-16 px-3 py-2 text-sm border rounded-md font-mono"
              />
              <p className="text-xs text-slate-500">
                使用密钥工具生成后粘贴，或从支付宝开放平台获取
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="alipay_alipay_public_key">支付宝公钥</Label>
              <textarea
                id="alipay_alipay_public_key"
                {...register('alipay_alipay_public_key')}
                placeholder="从支付宝开放平台获取，用于验签"
                className="w-full h-16 px-3 py-2 text-sm border rounded-md font-mono"
              />
              <p className="text-xs text-amber-600">
                支付宝返回的公钥，用于验证回调签名的真实性
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 微信支付配置 */}
      {(channel === 'wechat' || channel === 'both') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">微信支付配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wechat_app_id">应用ID</Label>
                <Input
                  id="wechat_app_id"
                  {...register('wechat_app_id')}
                  placeholder="微信应用AppID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat_mch_id">商户号</Label>
                <Input
                  id="wechat_mch_id"
                  {...register('wechat_mch_id')}
                  placeholder="微信商户号"
                />
              </div>
            </div>

            <Separator />

            {/* APIv2 密钥 */}
            <div className="space-y-2">
              <Label htmlFor="wechat_api_key">APIv2 密钥</Label>
              <Input
                id="wechat_api_key"
                {...register('wechat_api_key')}
                placeholder="使用密钥工具生成32位随机密钥"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wechat_notify_url">回调地址</Label>
              <Input
                id="wechat_notify_url"
                {...register('wechat_notify_url')}
                placeholder="https://your-domain.com/api/notify/wechat"
              />
            </div>

            <Separator />

            {/* APIv3 私钥 */}
            <div className="space-y-2">
              <Label htmlFor="wechat_private_key">APIv3 私钥</Label>
              <textarea
                id="wechat_private_key"
                {...register('wechat_private_key')}
                placeholder="使用密钥工具生成后粘贴"
                className="w-full h-24 px-3 py-2 text-sm border rounded-md font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wechat_public_cert">平台证书</Label>
              <textarea
                id="wechat_public_cert"
                {...register('wechat_public_cert')}
                placeholder="从微信商户平台获取的平台证书"
                className="w-full h-20 px-3 py-2 text-sm border rounded-md font-mono"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 其他配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">其他配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as 'active' | 'inactive' | 'suspended')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
                <SelectItem value="suspended">暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remark">备注</Label>
            <Input
              id="remark"
              {...register('remark')}
              placeholder="可选备注信息"
            />
          </div>
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {merchant ? '保存修改' : '创建商户'}
        </Button>
      </div>
    </form>
  );
}
