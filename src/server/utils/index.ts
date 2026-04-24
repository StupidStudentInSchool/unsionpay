// =====================================================
// 统一支付系统 - 工具函数
// =====================================================

import { v4 as uuidv4 } from 'uuid';

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * 生成订单号
 * 格式: pay{时间戳}{随机数}
 */
export function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY${timestamp}${random}`;
}

/**
 * 生成退款单号
 */
export function generateRefundNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `REF${timestamp}${random}`;
}

/**
 * 生成分账单号
 */
export function generateSharingNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SHR${timestamp}${random}`;
}

/**
 * 生成日志ID
 */
export function generateLogId(): string {
  return `log_${Date.now()}_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * 格式化金额（分转元）
 */
export function fenToYuan(fen: number): number {
  return Number((fen / 100).toFixed(2));
}

/**
 * 格式化金额（元转分）
 */
export function yuanToFen(yuan: number | string): number {
  return Math.round(Number(yuan) * 100);
}

/**
 * 格式化日期为指定格式
 */
export function formatDate(date: Date | string, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 计算过期时间
 */
export function calculateExpireTime(minutes: number): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}

/**
 * 异步延迟
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全解析 JSON
 */
export function safeJsonParse<T>(str: string, defaultValue: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * 构造 URL 参数
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs.join('&');
}

/**
 * 解析 URL 参数
 */
export function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = query.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }
  return params;
}

/**
 * 过滤对象中的空值
 */
export function filterEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * 验证手机号
 */
export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证邮箱
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 掩码手机号
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/**
 * 掩码邮箱
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return email;
  return name.slice(0, 2) + '***@' + domain;
}

/**
 * 简单的 HMAC-SHA256 签名
 */
export async function hmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA256 哈希
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default {
  generateRequestId,
  generateOrderNo,
  generateRefundNo,
  generateSharingNo,
  generateLogId,
  fenToYuan,
  yuanToFen,
  formatDate,
  calculateExpireTime,
  delay,
  safeJsonParse,
  buildQueryString,
  parseQueryString,
  filterEmpty,
  validatePhone,
  validateEmail,
  maskPhone,
  maskEmail,
  hmacSha256,
  sha256,
};
