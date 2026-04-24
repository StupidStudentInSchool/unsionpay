// =====================================================
// 统一支付系统 - SQLite 数据库连接
// =====================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 根据环境判断数据库路径
// 正式环境：使用持久化目录 /app/work/data
// 开发环境：使用项目目录
const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
const defaultDbPath = isProd 
  ? '/app/work/data/unified_pay.db'   // 持久化目录
  : path.join(process.cwd(), 'data', 'unified_pay.db');

const DB_PATH = process.env.SQLITE_DB_PATH || defaultDbPath;

// 确保目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// 启用 WAL 模式提高并发性能
db.pragma('journal_mode = WAL');

// 初始化表结构
export function initializeDatabase() {
  // 商户配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchant_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT UNIQUE NOT NULL,
      app_name TEXT NOT NULL,
      channel TEXT DEFAULT 'both',
      alipay_app_id TEXT,
      alipay_private_key TEXT,
      alipay_public_key TEXT,
      alipay_alipay_public_key TEXT, -- 支付宝返回的公钥，用于验签
      alipay_notify_url TEXT,
      wechat_app_id TEXT,
      wechat_mch_id TEXT,
      wechat_api_key TEXT,
      wechat_private_key TEXT,
      wechat_public_cert TEXT,
      wechat_notify_url TEXT,
      profit_sharing_enabled INTEGER DEFAULT 0,
      alipay_royalty_mode TEXT DEFAULT 'ordinary',
      wechat_profit_sharing_enabled INTEGER DEFAULT 0,
      default_channel TEXT DEFAULT 'alipay',
      status TEXT DEFAULT 'active',
      rate_limit INTEGER DEFAULT 100,
      ip_whitelist TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 添加缺失的列（如果表已存在但没有这些列）
  const addColumnIfNotExists = (table: string, column: string, type: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e: unknown) {
      // 忽略错误，列可能已存在
    }
  };
  addColumnIfNotExists('merchant_config', 'alipay_alipay_public_key', 'TEXT');
  addColumnIfNotExists('merchant_config', 'wechat_public_cert', 'TEXT');

  // 分账方配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS profit_sharing_receiver (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      receiver_id TEXT NOT NULL,
      receiver_type TEXT NOT NULL,
      receiver_account TEXT NOT NULL,
      receiver_name TEXT,
      relation_type TEXT,
      relation_name TEXT,
      max_ratio REAL DEFAULT 100,
      max_amount INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchant_config(id)
    )
  `);

  // 支付订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS pay_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      merchant_order_no TEXT NOT NULL,
      app_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      channel_order_no TEXT,
      trade_type TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      actual_amount INTEGER,
      currency TEXT DEFAULT 'CNY',
      subject TEXT,
      body TEXT,
      pay_url TEXT,
      qr_code TEXT,
      pay_params TEXT,
      expire_time DATETIME,
      status TEXT DEFAULT 'pending',
      attach TEXT,
      client_ip TEXT,
      extra TEXT,
      paid_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES merchant_config(app_id)
    )
  `);

  // 退款订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS refund_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refund_no TEXT UNIQUE NOT NULL,
      order_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      merchant_refund_no TEXT NOT NULL,
      channel TEXT NOT NULL,
      channel_refund_no TEXT,
      total_amount INTEGER NOT NULL,
      refund_amount INTEGER NOT NULL,
      refunded_amount INTEGER DEFAULT 0,
      reason TEXT,
      remark TEXT,
      status TEXT DEFAULT 'pending',
      fail_reason TEXT,
      refund_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES pay_order(id)
    )
  `);

  // 分账订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS profit_sharing_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      merchant_order_no TEXT NOT NULL,
      app_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      channel_order_no TEXT,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      finish_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES merchant_config(app_id)
    )
  `);

  // 分账明细表
  db.exec(`
    CREATE TABLE IF NOT EXISTS profit_sharing_detail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sharing_no TEXT NOT NULL,
      order_id INTEGER NOT NULL,
      receiver_id TEXT NOT NULL,
      receiver_type TEXT NOT NULL,
      receiver_account TEXT NOT NULL,
      receiver_name TEXT,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      result TEXT,
      finish_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES profit_sharing_order(id)
    )
  `);

  // 回调日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS notify_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT,
      channel TEXT NOT NULL,
      notify_type TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    )
  `);

  // 回调目标表
  db.exec(`
    CREATE TABLE IF NOT EXISTS notify_target (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      app_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      notify_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      next_retry_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 支付渠道配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS pay_channel_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      config_key TEXT NOT NULL,
      config_value TEXT,
      merchant_id INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT,
      operation_type TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      request_data TEXT,
      response_data TEXT,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pay_order_app_id ON pay_order(app_id);
    CREATE INDEX IF NOT EXISTS idx_pay_order_status ON pay_order(status);
    CREATE INDEX IF NOT EXISTS idx_pay_order_created_at ON pay_order(created_at);
    CREATE INDEX IF NOT EXISTS idx_refund_order_order_id ON refund_order(order_id);
    CREATE INDEX IF NOT EXISTS idx_refund_order_status ON refund_order(status);
    CREATE INDEX IF NOT EXISTS idx_profit_sharing_order_app_id ON profit_sharing_order(app_id);
    CREATE INDEX IF NOT EXISTS idx_notify_log_order_no ON notify_log(order_no);
    CREATE INDEX IF NOT EXISTS idx_notify_target_order_no ON notify_target(order_no);
  `);

  console.log('[DB] Database initialized successfully');
}

// 查询方法 - 返回单一类型数组
export function query<T>(sql: string, params?: unknown[]): T[] {
  const stmt = db.prepare(sql);
  const results = params ? stmt.all(...params) : stmt.all();
  return results as T[];
}

// 执行方法（用于 INSERT/UPDATE/DELETE）
export function execute(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
  // 调试日志
  if (process.env.NODE_ENV === 'development') {
    console.log('[SQLite] Execute:', sql.substring(0, 100) + '...');
    console.log('[SQLite] Params:', params?.map(p => {
      if (typeof p === 'object' && p !== null) {
        return JSON.stringify(p).substring(0, 50);
      }
      return p;
    }));
  }
  
  const stmt = db.prepare(sql);
  try {
    const result = params ? stmt.run(...params) : stmt.run();
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  } catch (err) {
    console.error('[SQLite] Execute error:', err);
    throw err;
  }
}

// 事务方法
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

// 关闭连接
export function close(): void {
  db.close();
}

// 初始化数据库
initializeDatabase();

export default db;
