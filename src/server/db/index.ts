// =====================================================
// 统一支付系统 - 数据库连接模块
// =====================================================

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import config from '../config';

let pool: Pool | null = null;

/**
 * 获取数据库连接池
 */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: config.database.charset,
      timezone: config.database.timezone,
      connectionLimit: config.database.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

/**
 * 执行查询
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const dbPool = getPool();
  const [rows] = await dbPool.query<T>(sql, params);
  return rows;
}

/**
 * 执行更新/插入/删除
 */
export async function execute(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[]
): Promise<ResultSetHeader> {
  const dbPool = getPool();
  const [result] = await dbPool.execute<ResultSetHeader>(sql, params);
  return result;
}

/**
 * 获取单个连接
 */
export async function getConnection(): Promise<PoolConnection> {
  const dbPool = getPool();
  return dbPool.getConnection();
}

/**
 * 事务执行
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const dbPool = getPool();
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

const dbModule = {
  getPool,
  query,
  execute,
  getConnection,
  transaction,
  closePool,
  testConnection,
};

export default dbModule;
