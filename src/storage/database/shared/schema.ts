// Schema 文件 - Supabase 表定义
// 表已通过 SQL 直接创建，此文件仅用于类型推导

import { sql } from "drizzle-orm";
import { pgTable, timestamp, varchar, integer, text } from "drizzle-orm/pg-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyPgTable = (name: string, columns: any) => {
  return pgTable(name, columns);
};

// 商户配置表
export const merchantConfig = anyPgTable(
  "merchant_config",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    app_id: varchar("app_id", { length: 64 }).notNull().unique(),
    app_name: varchar("app_name", { length: 128 }).notNull(),
    channel: varchar("channel", { length: 20 }).default('both'),
    alipay_app_id: varchar("alipay_app_id", { length: 64 }),
    alipay_private_key: text("alipay_private_key"),
    alipay_public_key: text("alipay_public_key"),
    alipay_alipay_public_key: text("alipay_alipay_public_key"),
    alipay_notify_url: varchar("alipay_notify_url", { length: 512 }),
    wechat_app_id: varchar("wechat_app_id", { length: 64 }),
    wechat_mch_id: varchar("wechat_mch_id", { length: 32 }),
    wechat_api_key: varchar("wechat_api_key", { length: 128 }),
    wechat_private_key: text("wechat_private_key"),
    wechat_public_cert: text("wechat_public_cert"),
    wechat_notify_url: varchar("wechat_notify_url", { length: 512 }),
    profit_sharing_enabled: integer("profit_sharing_enabled").default(0),
    alipay_royalty_mode: varchar("alipay_royalty_mode", { length: 20 }).default('ordinary'),
    wechat_profit_sharing_enabled: integer("wechat_profit_sharing_enabled").default(0),
    default_channel: varchar("default_channel", { length: 20 }).default('alipay'),
    status: varchar("status", { length: 20 }).default('active'),
    rate_limit: integer("rate_limit").default(100),
    ip_whitelist: text("ip_whitelist"),
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  }
);

// 分账方配置表
export const profitSharingReceiver = anyPgTable(
  "profit_sharing_receiver",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    merchant_id: varchar("merchant_id", { length: 36 }).notNull(),
    receiver_id: varchar("receiver_id", { length: 64 }).notNull(),
    receiver_type: varchar("receiver_type", { length: 20 }).notNull(),
    receiver_account: varchar("receiver_account", { length: 128 }).notNull(),
    receiver_name: varchar("receiver_name", { length: 128 }),
    relation_type: varchar("relation_type", { length: 32 }),
    relation_name: varchar("relation_name", { length: 64 }),
    max_ratio: sql`real DEFAULT 100`,
    max_amount: integer("max_amount"),
    status: varchar("status", { length: 20 }).default('active'),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  }
);

// 支付订单表
export const payOrder = anyPgTable(
  "pay_order",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    order_no: varchar("order_no", { length: 64 }).notNull().unique(),
    merchant_order_no: varchar("merchant_order_no", { length: 64 }).notNull(),
    app_id: varchar("app_id", { length: 64 }).notNull(),
    channel: varchar("channel", { length: 20 }).notNull(),
    channel_order_no: varchar("channel_order_no", { length: 128 }),
    trade_type: varchar("trade_type", { length: 20 }).notNull(),
    total_amount: integer("total_amount").notNull(),
    actual_amount: integer("actual_amount"),
    currency: varchar("currency", { length: 10 }).default('CNY'),
    subject: varchar("subject", { length: 256 }),
    body: text("body"),
    pay_url: text("pay_url"),
    qr_code: text("qr_code"),
    pay_params: text("pay_params"),
    expire_time: timestamp("expire_time", { withTimezone: true, mode: 'string' }),
    status: varchar("status", { length: 20 }).default('pending'),
    attach: text("attach"),
    client_ip: text("client_ip"),
    extra: text("extra"),
    paid_time: timestamp("paid_time", { withTimezone: true, mode: 'string' }),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  }
);

// 退款订单表
export const refundOrder = anyPgTable(
  "refund_order",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    refund_no: varchar("refund_no", { length: 64 }).notNull().unique(),
    order_id: varchar("order_id", { length: 36 }).notNull(),
    order_no: varchar("order_no", { length: 64 }).notNull(),
    merchant_refund_no: varchar("merchant_refund_no", { length: 64 }).notNull(),
    channel: varchar("channel", { length: 20 }).notNull(),
    channel_refund_no: varchar("channel_refund_no", { length: 128 }),
    total_amount: integer("total_amount").notNull(),
    refund_amount: integer("refund_amount").notNull(),
    refunded_amount: integer("refunded_amount").default(0),
    reason: text("reason"),
    remark: text("remark"),
    status: varchar("status", { length: 20 }).default('pending'),
    fail_reason: text("fail_reason"),
    refund_time: timestamp("refund_time", { withTimezone: true, mode: 'string' }),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  }
);

// 导出类型
export type MerchantConfig = typeof merchantConfig.$inferSelect;
export type MerchantConfigInsert = typeof merchantConfig.$inferInsert;
export type ProfitSharingReceiver = typeof profitSharingReceiver.$inferSelect;
export type PayOrder = typeof payOrder.$inferSelect;
export type RefundOrder = typeof refundOrder.$inferSelect;
