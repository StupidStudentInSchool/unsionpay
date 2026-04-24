// =====================================================
// SQLite 数据库类型定义
// =====================================================

// 通用行类型
export interface SqliteRow {
  [key: string]: unknown;
}

// 商户配置行
export interface MerchantRow {
  id: number;
  app_id: string;
  app_name: string;
  channel: string;
  alipay_app_id: string | null;
  alipay_private_key: string | null;
  alipay_public_key: string | null;
  alipay_notify_url: string | null;
  wechat_app_id: string | null;
  wechat_mch_id: string | null;
  wechat_api_key: string | null;
  wechat_private_key: string | null;
  wechat_public_cert: string | null;
  wechat_notify_url: string | null;
  profit_sharing_enabled: number;
  alipay_royalty_mode: string;
  wechat_profit_sharing_enabled: number;
  default_channel: string;
  status: string;
  rate_limit: number;
  ip_whitelist: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

// 支付订单行
export interface OrderRow {
  id: number;
  order_no: string;
  merchant_order_no: string;
  app_id: string;
  channel: string;
  channel_order_no: string | null;
  trade_type: string;
  total_amount: number;
  actual_amount: number | null;
  currency: string;
  subject: string | null;
  body: string | null;
  pay_url: string | null;
  qr_code: string | null;
  pay_params: string | null;
  expire_time: string | null;
  status: string;
  attach: string | null;
  client_ip: string | null;
  extra: string | null;
  paid_time: string | null;
  created_at: string;
  updated_at: string;
}

// 退款订单行
export interface RefundRow {
  id: number;
  refund_no: string;
  order_id: number;
  order_no: string;
  merchant_refund_no: string;
  channel: string;
  channel_refund_no: string | null;
  total_amount: number;
  refund_amount: number;
  refunded_amount: number;
  reason: string | null;
  remark: string | null;
  status: string;
  fail_reason: string | null;
  refund_time: string | null;
  created_at: string;
  updated_at: string;
}

// 分账订单行
export interface SharingRow {
  id: number;
  sharing_no: string;
  merchant_order_no: string;
  app_id: string;
  channel: string;
  channel_order_no: string | null;
  total_amount: number;
  status: string;
  finish_time: string | null;
  created_at: string;
  updated_at: string;
}

// 分账明细行
export interface DetailRow {
  id: number;
  sharing_no: string;
  order_id: number;
  receiver_id: string;
  receiver_type: string;
  receiver_account: string;
  receiver_name: string | null;
  amount: number;
  status: string;
  result: string | null;
  finish_time: string | null;
  created_at: string;
  updated_at: string;
}

// 回调日志行
export interface NotifyLogRow {
  id: number;
  order_no: string | null;
  channel: string;
  notify_type: string;
  content: string | null;
  status: string;
  retry_count: number;
  response: string | null;
  created_at: string;
  processed_at: string | null;
}

// 回调目标行
export interface NotifyTargetRow {
  id: number;
  order_no: string;
  app_id: string;
  channel: string;
  notify_url: string;
  status: string;
  next_retry_time: string | null;
  created_at: string;
  updated_at: string;
}

// 分账方配置行
export interface ReceiverRow {
  id: number;
  merchant_id: number;
  receiver_id: string;
  receiver_type: string;
  receiver_account: string;
  receiver_name: string | null;
  relation_type: string | null;
  relation_name: string | null;
  max_ratio: number;
  max_amount: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}
