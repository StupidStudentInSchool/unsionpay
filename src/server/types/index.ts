// =====================================================
// 统一支付系统 - 类型定义
// =====================================================

// ==================== 通用类型 ====================

/** 支付渠道 */
export type PayChannel = 'alipay' | 'wechat';

/** 交易类型 */
export type TradeType = 'native' | 'app' | 'h5' | 'jsapi' | 'web';

/** 订单状态 */
export type OrderStatus = 'pending' | 'processing' | 'paid' | 'closed' | 'refunded' | 'partial_refund';

/** 退款状态 */
export type RefundStatus = 'pending' | 'processing' | 'success' | 'failed' | 'closed';

/** 分账状态 */
export type ProfitSharingStatus = 'pending' | 'processing' | 'finished' | 'failed' | 'closed';

/** 分账明细状态 */
export type ProfitSharingDetailStatus = 'pending' | 'processing' | 'success' | 'failed' | 'returned';

/** 商户状态 */
export type MerchantStatus = 'active' | 'inactive' | 'suspended';

/** 通用响应结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  request_id?: string;
}

// ==================== 商户配置 ====================

/** 商户配置 */
export interface MerchantConfig {
  id: number;
  app_id: string;
  app_name: string;
  channel: 'alipay' | 'wechat' | 'both';
  
  // 支付宝配置
  alipay_app_id?: string;
  alipay_private_key?: string;
  alipay_public_key?: string;
  alipay_alipay_public_key?: string; // 支付宝返回的公钥，用于验签
  alipay_notify_url?: string;
  
  // 微信配置
  wechat_app_id?: string;
  wechat_mch_id?: string;
  wechat_api_key?: string;
  wechat_private_key?: string;
  wechat_public_cert?: string;
  wechat_notify_url?: string;
  
  // 分账配置
  profit_sharing_enabled: boolean;
  alipay_royalty_mode?: 'transfer' | 'plan';
  wechat_profit_sharing_enabled: boolean;
  
  // 通用配置
  default_channel: PayChannel;
  status: MerchantStatus;
  rate_limit: number;
  ip_whitelist?: string;
  remark?: string;
  
  created_at: Date;
  updated_at: Date;
}

/** 分账方配置 */
export interface ProfitSharingReceiver {
  id: number;
  merchant_id: number;
  receiver_id: string;
  receiver_type: PayChannel | 'bankcard';
  receiver_account: string;
  receiver_name?: string;
  relation_type?: string;
  relation_name?: string;
  max_ratio?: number;
  max_amount?: number;
  status: 'active' | 'inactive';
}

// ==================== 支付订单 ====================

/** 支付订单 */
export interface PayOrder {
  id: number;
  order_no: string;
  merchant_order_no: string;
  app_id: string;
  channel: PayChannel;
  channel_order_no?: string;
  trade_type: TradeType;
  total_amount: number;
  actual_amount?: number;
  currency: string;
  subject: string;
  body?: string;
  pay_params?: string;
  pay_url?: string;
  qr_code?: string;
  expire_time?: Date | string | null;
  paid_time?: Date | string | null;
  status: OrderStatus;
  attach?: string;
  client_ip?: string;
  extra?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/** 统一支付下单请求 */
export interface UnifiedPayRequest {
  app_id: string;
  channel?: PayChannel;
  trade_type: TradeType;
  out_trade_no: string;
  total_amount: number;
  currency?: string;
  subject: string;
  body?: string;
  notify_url?: string;
  return_url?: string;
  attach?: string;
  client_ip?: string;
  profit_sharing?: ProfitSharingConfig;
  extra?: Record<string, unknown>;
}

/** 分账配置 */
export interface ProfitSharingConfig {
  enabled: boolean;
  receivers: ProfitSharingReceiverConfig[];
}

/** 分账接收方配置 */
export interface ProfitSharingReceiverConfig {
  receiver_id: string;
  receiver_type: PayChannel | 'bankcard';
  receiver_account: string;
  receiver_name?: string;
  amount?: number;
  ratio?: number;
  description?: string;
}

/** 统一支付响应 */
export interface UnifiedPayResponse {
  order_no: string;
  channel: PayChannel;
  trade_no?: string;
  pay_url?: string;
  qr_code?: string;
  jsapi_params?: Record<string, unknown>;
  expire_time?: string;
}

// ==================== 退款 ====================

/** 退款订单 */
export interface RefundOrder {
  id: number;
  refund_no: string;
  order_id: number;
  order_no: string;
  merchant_refund_no: string;
  channel: PayChannel;
  channel_refund_no?: string;
  total_amount: number;
  refund_amount: number;
  refunded_amount: number;
  reason?: string;
  remark?: string;
  status: RefundStatus;
  fail_reason?: string;
  refund_time?: Date;
  created_at: Date;
  updated_at: Date;
}

/** 统一退款请求 */
export interface UnifiedRefundRequest {
  app_id: string;
  channel?: PayChannel;
  out_trade_no: string;
  out_refund_no: string;
  refund_amount: number;
  total_amount?: number;
  reason?: string;
  notify_url?: string;
}

/** 统一退款响应 */
export interface UnifiedRefundResponse {
  refund_no: string;
  channel: PayChannel;
  channel_refund_no?: string;
  refund_amount: number;
  refund_time?: string;
  status: RefundStatus;
}

// ==================== 分账 ====================

/** 分账订单 */
export interface ProfitSharingOrder {
  id: number;
  sharing_no: string;
  order_id: number;
  order_no: string;
  channel: PayChannel;
  channel_batch_no?: string;
  total_amount: number;
  shared_amount: number;
  status: ProfitSharingStatus;
  fail_reason?: string;
  finish_reason?: string;
  unfreeze_amount?: number;
  created_at: Date;
  updated_at: Date;
}

/** 分账明细 */
export interface ProfitSharingDetail {
  id: number;
  sharing_id: number;
  detail_id: string;
  receiver_id: string;
  receiver_type: PayChannel | 'bankcard';
  receiver_account: string;
  receiver_name?: string;
  amount: number;
  share_ratio?: number;
  status: ProfitSharingDetailStatus;
  result_code?: string;
  fail_reason?: string;
  wx_transfer_no?: string;
  finish_time?: Date;
  created_at: Date;
}

/** 统一分账请求 */
export interface UnifiedProfitSharingRequest {
  app_id: string;
  channel?: PayChannel;
  out_trade_no: string;
  out_sharing_no: string;
  amount: number;
  receivers: ProfitSharingReceiverConfig[];
  description?: string;
}

/** 统一分账响应 */
export interface UnifiedProfitSharingResponse {
  sharing_no: string;
  channel: PayChannel;
  channel_batch_no?: string;
  total_amount: number;
  shared_amount: number;
  status: ProfitSharingStatus;
}

// ==================== 查询 ====================

/** 支付查询响应 */
export interface PayQueryResponse {
  order_no: string;
  merchant_order_no: string;
  channel: PayChannel;
  channel_order_no?: string;
  status: OrderStatus;
  total_amount: number;
  actual_amount?: number;
  paid_time?: string;
  expire_time?: string;
  refund_status?: RefundStatus;
  refund_amount?: number;
}

// ==================== 回调通知 ====================

/** 回调目标配置 */
export interface NotifyTarget {
  id: number;
  merchant_id: number;
  app_id: string;
  notify_type: 'pay' | 'refund' | 'profit_sharing';
  channel: PayChannel | 'all';
  notify_url: string;
  secret_key?: string;
  retry_enabled: boolean;
  max_retry: number;
  status: 'active' | 'inactive';
}

/** 回调通知日志 */
export interface NotifyLog {
  id: number;
  log_id: string;
  order_id?: number;
  order_no?: string;
  channel: PayChannel;
  notify_type: string;
  notify_data: string;
  status: 'received' | 'processing' | 'success' | 'failed';
  process_result?: string;
  response_data?: string;
  retry_count: number;
  received_at: Date;
  processed_at?: Date;
}

// ==================== 适配器接口 ====================

/** 支付适配器接口 */
export interface PayAdapter {
  readonly channel: PayChannel;
  
  /** 构建支付参数 */
  buildPayParams(request: UnifiedPayRequest, config: MerchantConfig): Promise<PayParams>;
  
  /** 解析回调通知 */
  parseNotify(request: Request, config: MerchantConfig): Promise<NotifyResult>;
  
  /** 验证回调签名 */
  verifyNotifySign(request: Request, config: MerchantConfig): Promise<boolean>;
  
  /** 构建回调响应 */
  buildNotifyResponse(success: boolean, message?: string): Response;
  
  /** 查询订单 */
  queryOrder(orderNo: string, config: MerchantConfig): Promise<OrderQueryResult>;
  
  /** 申请退款 */
  refund(request: UnifiedRefundRequest, config: MerchantConfig): Promise<RefundResult>;
  
  /** 查询退款 */
  queryRefund(refundNo: string, config: MerchantConfig): Promise<RefundQueryResult>;
}

/** 支付参数 */
export interface PayParams {
  url?: string;
  qr_code?: string;
  jsapi_params?: Record<string, unknown>;
  app_params?: Record<string, unknown>;
  h5_params?: Record<string, unknown>;
  trade_no?: string;
}

/** 回调解析结果 */
export interface NotifyResult {
  type: 'pay' | 'refund' | 'profit_sharing';
  order_no: string;
  channel_order_no: string;
  status: string;
  amount: number;
  paid_time?: string;
  raw_data: Record<string, unknown>;
}

/** 订单查询结果 */
export interface OrderQueryResult {
  channel_order_no: string;
  status: string;
  amount: number;
  paid_time?: string;
  refund_amount?: number;
}

/** 退款结果 */
export interface RefundResult {
  channel_refund_no: string;
  refund_amount: number;
  refund_time: string;
}

/** 退款查询结果 */
export interface RefundQueryResult {
  channel_refund_no: string;
  refund_amount: number;
  refund_status: string;
  refund_time?: string;
}

// ==================== 错误类型 ====================

/** 支付异常 */
export class PayException extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PayException';
  }
}

/** 错误码 */
export const PayErrorCode = {
  // 通用错误
  INVALID_PARAMS: 'INVALID_PARAMS',
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
  MERCHANT_DISABLED: 'MERCHANT_DISABLED',
  CHANNEL_NOT_SUPPORTED: 'CHANNEL_NOT_SUPPORTED',
  
  // 订单错误
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_PAID: 'ORDER_ALREADY_PAID',
  ORDER_CLOSED: 'ORDER_CLOSED',
  ORDER_EXPIRED: 'ORDER_EXPIRED',
  
  // 支付错误
  PAY_FAILED: 'PAY_FAILED',
  PAY_TIMEOUT: 'PAY_TIMEOUT',
  REFUND_FAILED: 'REFUND_FAILED',
  
  // 分账错误
  PROFIT_SHARING_NOT_ENABLED: 'PROFIT_SHARING_NOT_ENABLED',
  PROFIT_SHARING_FAILED: 'PROFIT_SHARING_FAILED',
  
  // 签名错误
  SIGN_FAILED: 'SIGN_FAILED',
  VERIFY_FAILED: 'VERIFY_FAILED',
  
  // 系统错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;
