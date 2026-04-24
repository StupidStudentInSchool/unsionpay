// =====================================================
// 统一支付系统 - 支付宝适配器
// =====================================================

import { PayParams, NotifyResult, OrderQueryResult, RefundResult, RefundQueryResult } from '../types';
import { MerchantConfig, UnifiedPayRequest } from '../types';
import { SignService } from '../services/sign';
import { buildQueryString, parseQueryString, formatDate } from '../utils';

/**
 * 支付宝适配器
 */
export const AlipayAdapter = {
  channel: 'alipay' as const,

  /**
   * 构建支付参数
   */
  async buildPayParams(
    request: UnifiedPayRequest,
    config: MerchantConfig
  ): Promise<PayParams> {
    const { trade_type, total_amount, subject, body, return_url, extra } = request;

    // 构建基础参数
    const bizContent: Record<string, unknown> = {
      out_trade_no: request.out_trade_no,
      total_amount: typeof total_amount === 'number' && total_amount < 100 
        ? total_amount.toFixed(2) 
        : (Number(total_amount) / 100).toFixed(2),
      subject,
      body: body || subject,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      timeout_express: '30m',
    };

    // 根据交易类型添加特定参数
    if (trade_type === 'native') {
      // 扫码支付，需要获取二维码链接
    } else if (trade_type === 'app') {
      // App 支付
    } else if (trade_type === 'h5') {
      bizContent.product_code = 'QUICK_WAP_WAY';
      if (config.alipay_app_id) {
        bizContent.seller_id = config.alipay_app_id;
      }
    } else if (trade_type === 'jsapi') {
      // JSAPI 支付需要 openid
      if (extra?.openid) {
        (bizContent as Record<string, unknown>).buyer_id = extra.openid as string;
      }
    }

    // 构建请求参数
    const params: Record<string, unknown> = {
      app_id: config.alipay_app_id,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      return_url: return_url,
      charset: 'UTF-8',
      sign_type: 'RSA2',
      timestamp: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      version: '1.0',
      notify_url: request.notify_url || config.alipay_notify_url,
      biz_content: JSON.stringify(bizContent),
    };

    // 签名
    const sign = SignService.alipaySign(params, config.alipay_private_key!, 'RSA2');
    params.sign = sign;

    // 构建支付链接
    const payUrl = `https://openapi.alipay.com/gateway.do?${buildQueryString(params)}`;

    // 根据交易类型返回不同的参数
    switch (trade_type) {
      case 'native':
        return {
          qr_code: payUrl,
        };
      case 'app':
        return {
          app_params: {
            actionType: 'pay',
            bizContent: params.biz_content,
          },
        };
      case 'h5':
        return {
          url: payUrl,
          h5_params: {
            actionType: 'pay',
            biz_content: params.biz_content,
          },
        };
      case 'jsapi':
        return {
          jsapi_params: {
            app_id: config.alipay_app_id,
            method: 'alipay.trade.wap.pay',
            biz_content: params.biz_content,
          },
        };
      default:
        return {
          url: payUrl,
        };
    }
  },

  /**
   * 解析回调通知
   */
  async parseNotify(request: Request, config: MerchantConfig): Promise<NotifyResult> {
    const body = await request.text();
    const params = parseQueryString(body);

    // 验证签名
    const sign = params.sign as string;
    if (!SignService.alipayVerify(params, sign, config.alipay_public_key!)) {
      throw new Error('签名验证失败');
    }

    // 解析通知类型
    const notifyType = params.notify_type || 'trade';
    const tradeStatus = params.trade_status as string;

    // 解析状态
    let status = 'pending';
    if (tradeStatus === 'TRADE_FINISHED' || tradeStatus === 'TRADE_SUCCESS') {
      status = 'paid';
    } else if (tradeStatus === 'TRADE_CLOSED') {
      status = 'closed';
    }

    return {
      type: notifyType === 'refund' ? 'refund' : 'pay',
      order_no: params.out_trade_no,
      channel_order_no: params.trade_no,
      status,
      amount: parseFloat(params.total_amount || params.receipt_amount || '0'),
      paid_time: params.gmt_payment,
      raw_data: params,
    };
  },

  /**
   * 验证回调签名
   */
  async verifyNotifySign(request: Request, config: MerchantConfig): Promise<boolean> {
    const body = await request.text();
    const params = parseQueryString(body);
    const sign = params.sign as string;

    if (!sign || !config.alipay_public_key) {
      return false;
    }

    return SignService.alipayVerify(params, sign, config.alipay_public_key);
  },

  /**
   * 构建回调响应
   */
  buildNotifyResponse(success: boolean, _message?: string): Response {
    const response = success ? 'success' : 'fail';
    return new Response(response, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },

  /**
   * 查询订单
   */
  async queryOrder(channelOrderNo: string, config: MerchantConfig): Promise<OrderQueryResult> {
    const params: Record<string, unknown> = {
      app_id: config.alipay_app_id,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'UTF-8',
      sign_type: 'RSA2',
      timestamp: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      version: '1.0',
      biz_content: JSON.stringify({
        trade_no: channelOrderNo,
      }),
    };

    const sign = SignService.alipaySign(params, config.alipay_private_key!, 'RSA2');
    params.sign = sign;

    const response = await fetch('https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildQueryString(params),
    });

    const result = await response.json();
    const data = result.alipay_trade_query_response || {};

    return {
      channel_order_no: data.trade_no || channelOrderNo,
      status: data.trade_status || 'UNKNOWN',
      amount: parseFloat(data.total_amount || '0') * 100,
      paid_time: data.gmt_payment,
      refund_amount: parseFloat(data.refund_amount || '0') * 100,
    };
  },

  /**
   * 申请退款
   */
  async refund(request: { out_trade_no: string; refund_amount: number; reason?: string }, config: MerchantConfig): Promise<RefundResult> {
    const { out_trade_no, refund_amount, reason } = request;

    const bizContent = {
      trade_no: out_trade_no,
      refund_amount: (refund_amount / 100).toFixed(2),
      refund_reason: reason || '用户申请退款',
    };

    const params: Record<string, unknown> = {
      app_id: config.alipay_app_id,
      method: 'alipay.trade.refund',
      format: 'JSON',
      charset: 'UTF-8',
      sign_type: 'RSA2',
      timestamp: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    };

    const sign = SignService.alipaySign(params, config.alipay_private_key!, 'RSA2');
    params.sign = sign;

    const response = await fetch('https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildQueryString(params),
    });

    const result = await response.json();
    const data = result.alipay_trade_refund_response || {};

    return {
      channel_refund_no: data.trade_no || '',
      refund_amount: parseFloat(data.refund_fee || '0') * 100,
      refund_time: data.gmt_refund_pay,
    };
  },

  /**
   * 查询退款
   */
  async queryRefund(refundNo: string, config: MerchantConfig): Promise<RefundQueryResult> {
    const params: Record<string, unknown> = {
      app_id: config.alipay_app_id,
      method: 'alipay.trade.fastpay.refund.query',
      format: 'JSON',
      charset: 'UTF-8',
      sign_type: 'RSA2',
      timestamp: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      version: '1.0',
      biz_content: JSON.stringify({
        trade_no: refundNo,
      }),
    };

    const sign = SignService.alipaySign(params, config.alipay_private_key!, 'RSA2');
    params.sign = sign;

    const response = await fetch('https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildQueryString(params),
    });

    const result = await response.json();
    const data = result.alipay_trade_fastpay_refund_query_response || {};

    return {
      channel_refund_no: data.trade_no || refundNo,
      refund_amount: parseFloat(data.refund_amount || '0') * 100,
      refund_status: data.refund_status || 'UNKNOWN',
      refund_time: data.gmt_refund_pay,
    };
  },
};

export default AlipayAdapter;
