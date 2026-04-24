// =====================================================
// 统一支付系统 - 数据库连接（自动选择）
// =====================================================

import { query as sqliteQuery, execute as sqliteExecute, transaction as sqliteTransaction, initializeDatabase } from './sqlite';

// 导出 SQLite 的方法（默认使用 SQLite）
export const query = sqliteQuery;
export const execute = sqliteExecute;
export const transaction = sqliteTransaction;
export { initializeDatabase };

// 导出 SQLite 类型
export * from './sqlite-types';

// 初始化数据库（表结构会在模块加载时自动创建）
console.log('[DB] Using SQLite database');

export default { query, execute, transaction };
