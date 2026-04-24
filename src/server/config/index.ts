// =====================================================
// 统一支付系统 - 配置文件
// =====================================================

export const config = {
  // 服务配置
  server: {
    port: parseInt(process.env.DEPLOY_RUN_PORT || '5000'),
    env: process.env.COZE_PROJECT_ENV || 'DEV',
    requestIdHeader: 'X-Request-ID',
  },

  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'unified_pay',
    charset: 'utf8mb4',
    timezone: '+08:00',
    connectionLimit: 10,
  },

  // Redis 配置（可选）
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // 支付配置
  pay: {
    // 默认订单过期时间（分钟）
    defaultExpireMinutes: 30,
    // 最大订单过期时间（分钟）
    maxExpireMinutes: 1440,
    // 签名算法
    signAlgorithm: 'RSA2',
    // 签名编码
    signCharset: 'UTF-8',
  },

  // 支付宝配置
  alipay: {
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    sandboxGateway: 'https://openapi.alipaydev.com/gateway.do',
    format: 'JSON',
    version: '1.0',
    timeout: '30m',
  },

  // 微信支付配置
  wechat: {
    gateway: 'https://api.mch.weixin.qq.com',
    h5Gateway: 'https://api.mch.weixin.qq.com',
    sandboxGateway: 'https://api.sandbox.mch.weixin.qq.com',
    timeout: 30000,
  },

  // 回调配置
  notify: {
    // 回调最大重试次数
    maxRetry: 3,
    // 回调重试间隔（秒）
    retryInterval: 60,
    // 回调超时时间（毫秒）
    timeout: 10000,
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: '/app/work/logs/bypass',
  },

  // 安全配置
  security: {
    // API 签名密钥
    apiSecret: process.env.API_SECRET || 'default-secret-key',
    // 是否启用 IP 白名单
    enableIpWhitelist: process.env.ENABLE_IP_WHITELIST === 'true',
    // 每分钟限流次数
    rateLimit: 100,
  },
};

export default config;
