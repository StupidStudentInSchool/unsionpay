-- =====================================================
-- 统一支付系统 - MySQL 数据库表结构
-- 支持：支付宝、微信支付、分账
-- =====================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS unified_pay DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unified_pay;

-- =====================================================
-- 1. 商户配置表 (merchant_config)
-- 存储不同业务应用的支付渠道配置
-- =====================================================
CREATE TABLE IF NOT EXISTS `merchant_config` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `app_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '业务应用ID（对外标识）',
    `app_name` VARCHAR(128) NOT NULL COMMENT '应用名称',
    `channel` ENUM('alipay', 'wechat', 'both') NOT NULL DEFAULT 'both' COMMENT '支持的支付渠道',
    
    -- 支付宝配置
    `alipay_app_id` VARCHAR(64) DEFAULT NULL COMMENT '支付宝应用ID',
    `alipay_private_key` TEXT DEFAULT NULL COMMENT '支付宝私钥（RSA2，密文存储）',
    `alipay_public_key` TEXT DEFAULT NULL COMMENT '支付宝公钥',
    `alipay_notify_url` VARCHAR(512) DEFAULT NULL COMMENT '支付宝回调地址',
    
    -- 微信支付配置
    `wechat_app_id` VARCHAR(64) DEFAULT NULL COMMENT '微信应用ID',
    `wechat_mch_id` VARCHAR(32) DEFAULT NULL COMMENT '微信商户号',
    `wechat_api_key` VARCHAR(128) DEFAULT NULL COMMENT '微信API密钥（APIv2）',
    `wechat_private_key` TEXT DEFAULT NULL COMMENT '微信APIv3私钥（密文存储）',
    `wechat_public_cert` TEXT DEFAULT NULL COMMENT '微信平台证书',
    `wechat_notify_url` VARCHAR(512) DEFAULT NULL COMMENT '微信回调地址',
    
    -- 分账配置
    `profit_sharing_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用分账',
    `alipay_royalty_mode` ENUM('transfer', 'plan') DEFAULT NULL COMMENT '支付宝分账模式',
    `wechat_profit_sharing_enabled` TINYINT(1) DEFAULT 0 COMMENT '微信分账是否开通',
    
    -- 通用配置
    `default_channel` ENUM('alipay', 'wechat') DEFAULT 'alipay' COMMENT '默认支付渠道',
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' COMMENT '状态',
    `rate_limit` INT UNSIGNED DEFAULT 100 COMMENT '每分钟限流次数',
    `ip_whitelist` TEXT DEFAULT NULL COMMENT 'IP白名单，逗号分隔',
    
    -- 审计字段
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    `remark` VARCHAR(512) DEFAULT NULL COMMENT '备注',
    
    INDEX `idx_app_id` (`app_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户配置表';

-- =====================================================
-- 2. 分账方配置表 (profit_sharing_receiver)
-- 配置可接收分账的账户信息
-- =====================================================
CREATE TABLE IF NOT EXISTS `profit_sharing_receiver` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `merchant_id` BIGINT UNSIGNED NOT NULL COMMENT '商户配置ID',
    `receiver_id` VARCHAR(64) NOT NULL COMMENT '分账方唯一标识',
    `receiver_type` ENUM('alipay', 'wechat', 'bankcard') NOT NULL COMMENT '分账方类型',
    `receiver_account` VARCHAR(128) NOT NULL COMMENT '分账收款账号',
    `receiver_name` VARCHAR(128) DEFAULT NULL COMMENT '收款方名称',
    `relation_type` VARCHAR(32) DEFAULT NULL COMMENT '关系类型（微信）',
    `relation_name` VARCHAR(64) DEFAULT NULL COMMENT '关系名称',
    
    -- 分账比例/金额限制
    `max_ratio` DECIMAL(5,2) DEFAULT 50.00 COMMENT '最大分账比例(%)',
    `max_amount` DECIMAL(12,2) DEFAULT NULL COMMENT '最大分账金额',
    
    -- 状态
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_merchant_id` (`merchant_id`),
    INDEX `idx_receiver_id` (`receiver_id`),
    UNIQUE KEY `uk_merchant_receiver` (`merchant_id`, `receiver_type`, `receiver_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分账方配置表';

-- =====================================================
-- 3. 支付订单表 (pay_order)
-- 核心订单表，记录所有支付请求
-- =====================================================
CREATE TABLE IF NOT EXISTS `pay_order` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `order_no` VARCHAR(64) NOT NULL UNIQUE COMMENT '系统订单号',
    `merchant_order_no` VARCHAR(128) NOT NULL COMMENT '商户订单号（业务侧）',
    `app_id` VARCHAR(64) NOT NULL COMMENT '业务应用ID',
    
    -- 支付渠道信息
    `channel` ENUM('alipay', 'wechat') NOT NULL COMMENT '支付渠道',
    `channel_order_no` VARCHAR(128) DEFAULT NULL COMMENT '渠道订单号',
    `trade_type` VARCHAR(32) NOT NULL COMMENT '交易类型（native/app/h5/jsapi）',
    
    -- 金额信息
    `total_amount` DECIMAL(12,2) NOT NULL COMMENT '订单总金额',
    `actual_amount` DECIMAL(12,2) DEFAULT NULL COMMENT '实际支付金额',
    `currency` VARCHAR(8) NOT NULL DEFAULT 'CNY' COMMENT '货币类型',
    
    -- 商品信息
    `subject` VARCHAR(256) NOT NULL COMMENT '商品标题',
    `body` VARCHAR(512) DEFAULT NULL COMMENT '商品描述',
    
    -- 支付参数（渠道返回）
    `pay_params` TEXT DEFAULT NULL COMMENT '支付参数（JSON，如调起支付的参数）',
    `pay_url` VARCHAR(1024) DEFAULT NULL COMMENT '支付链接/二维码',
    `qr_code` TEXT DEFAULT NULL COMMENT '二维码内容',
    
    -- 时间信息
    `expire_time` DATETIME DEFAULT NULL COMMENT '订单过期时间',
    `paid_time` DATETIME DEFAULT NULL COMMENT '支付成功时间',
    
    -- 订单状态
    `status` ENUM('pending', 'processing', 'paid', 'closed', 'refunded', 'partial_refund') 
        NOT NULL DEFAULT 'pending' COMMENT '订单状态',
    
    -- 扩展信息
    `attach` VARCHAR(512) DEFAULT NULL COMMENT '附加数据（透传）',
    `client_ip` VARCHAR(64) DEFAULT NULL COMMENT '客户端IP',
    `extra` JSON DEFAULT NULL COMMENT '扩展字段',
    
    -- 审计字段
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_merchant_order` (`app_id`, `merchant_order_no`),
    INDEX `idx_channel_order` (`channel`, `channel_order_no`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_expire` (`expire_time`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- =====================================================
-- 4. 退款订单表 (refund_order)
-- 记录退款请求
-- =====================================================
CREATE TABLE IF NOT EXISTS `refund_order` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `refund_no` VARCHAR(64) NOT NULL UNIQUE COMMENT '退款单号',
    `order_id` BIGINT UNSIGNED NOT NULL COMMENT '原支付订单ID',
    `order_no` VARCHAR(64) NOT NULL COMMENT '原系统订单号',
    `merchant_refund_no` VARCHAR(128) NOT NULL COMMENT '商户退款单号',
    
    `channel` ENUM('alipay', 'wechat') NOT NULL COMMENT '退款渠道',
    `channel_refund_no` VARCHAR(128) DEFAULT NULL COMMENT '渠道退款单号',
    
    -- 金额
    `total_amount` DECIMAL(12,2) NOT NULL COMMENT '原订单金额',
    `refund_amount` DECIMAL(12,2) NOT NULL COMMENT '退款金额',
    `refunded_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '已退金额',
    
    -- 退款原因
    `reason` VARCHAR(512) DEFAULT NULL COMMENT '退款原因',
    `remark` VARCHAR(256) DEFAULT NULL COMMENT '备注',
    
    -- 状态
    `status` ENUM('pending', 'processing', 'success', 'failed', 'closed') 
        NOT NULL DEFAULT 'pending' COMMENT '退款状态',
    `fail_reason` VARCHAR(512) DEFAULT NULL COMMENT '失败原因',
    
    -- 时间
    `refund_time` DATETIME DEFAULT NULL COMMENT '退款成功时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_merchant_refund` (`merchant_refund_no`),
    INDEX `idx_channel_refund` (`channel`, `channel_refund_no`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款订单表';

-- =====================================================
-- 5. 分账订单表 (profit_sharing_order)
-- 记录分账请求
-- =====================================================
CREATE TABLE IF NOT EXISTS `profit_sharing_order` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `sharing_no` VARCHAR(64) NOT NULL UNIQUE COMMENT '分账单号',
    `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联支付订单ID',
    `order_no` VARCHAR(64) NOT NULL COMMENT '关联系统订单号',
    
    `channel` ENUM('alipay', 'wechat') NOT NULL COMMENT '分账渠道',
    `channel_batch_no` VARCHAR(128) DEFAULT NULL COMMENT '渠道批次号',
    
    -- 分账金额
    `total_amount` DECIMAL(12,2) NOT NULL COMMENT '分账总金额',
    `shared_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '已分账金额',
    
    -- 状态
    `status` ENUM('pending', 'processing', 'finished', 'failed', 'closed') 
        NOT NULL DEFAULT 'pending' COMMENT '分账状态',
    `fail_reason` VARCHAR(512) DEFAULT NULL COMMENT '失败原因',
    
    -- 标记
    `finish_reason` VARCHAR(64) DEFAULT NULL COMMENT '完结原因',
    `unfreeze_amount` DECIMAL(12,2) DEFAULT NULL COMMENT '解冻金额（微信）',
    
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_channel_batch` (`channel`, `channel_batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分账订单表';

-- =====================================================
-- 6. 分账明细表 (profit_sharing_detail)
-- 记录每笔分账的明细
-- =====================================================
CREATE TABLE IF NOT EXISTS `profit_sharing_detail` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `sharing_id` BIGINT UNSIGNED NOT NULL COMMENT '分账订单ID',
    `detail_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '分账明细单号',
    
    `receiver_id` VARCHAR(64) NOT NULL COMMENT '分账接收方ID',
    `receiver_type` ENUM('alipay', 'wechat', 'bankcard') NOT NULL COMMENT '接收方类型',
    `receiver_account` VARCHAR(128) NOT NULL COMMENT '接收方账号',
    `receiver_name` VARCHAR(128) DEFAULT NULL COMMENT '接收方名称',
    
    -- 金额
    `amount` DECIMAL(12,2) NOT NULL COMMENT '分账金额',
    `share_ratio` DECIMAL(5,2) DEFAULT NULL COMMENT '分账比例(%)',
    
    -- 状态
    `status` ENUM('pending', 'processing', 'success', 'failed', 'returned') 
        NOT NULL DEFAULT 'pending' COMMENT '分账明细状态',
    `result_code` VARCHAR(64) DEFAULT NULL COMMENT '结果码',
    `fail_reason` VARCHAR(512) DEFAULT NULL COMMENT '失败原因',
    
    -- 微信特有
    `wx_transfer_no` VARCHAR(128) DEFAULT NULL COMMENT '微信转账单号',
    
    -- 时间
    `finish_time` DATETIME DEFAULT NULL COMMENT '完成时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_sharing_id` (`sharing_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分账明细表';

-- =====================================================
-- 7. 回调通知日志表 (notify_log)
-- 记录所有支付渠道的回调通知
-- =====================================================
CREATE TABLE IF NOT EXISTS `profit_sharing_detail` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `log_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '日志ID',
    `order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联订单ID',
    `order_no` VARCHAR(64) DEFAULT NULL COMMENT '关联订单号',
    
    `channel` ENUM('alipay', 'wechat') NOT NULL COMMENT '渠道',
    `notify_type` VARCHAR(64) NOT NULL COMMENT '通知类型（trade/payment/refund）',
    `notify_data` TEXT NOT NULL COMMENT '通知原始数据',
    
    -- 处理结果
    `status` ENUM('received', 'processing', 'success', 'failed') 
        NOT NULL DEFAULT 'received' COMMENT '处理状态',
    `process_result` TEXT DEFAULT NULL COMMENT '处理结果',
    `response_data` TEXT DEFAULT NULL COMMENT '响应数据',
    
    -- 重试
    `retry_count` INT UNSIGNED DEFAULT 0 COMMENT '重试次数',
    `max_retry` INT UNSIGNED DEFAULT 3 COMMENT '最大重试次数',
    
    -- 时间
    `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '接收时间',
    `processed_at` DATETIME DEFAULT NULL COMMENT '处理完成时间',
    `next_retry_at` DATETIME DEFAULT NULL COMMENT '下次重试时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_order_no` (`order_no`),
    INDEX `idx_channel_type` (`channel`, `notify_type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_received_at` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='回调通知日志表';

-- =====================================================
-- 8. 回调目标配置表 (notify_target)
-- 配置不同业务的回调地址
-- =====================================================
CREATE TABLE IF NOT EXISTS `notify_target` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `merchant_id` BIGINT UNSIGNED NOT NULL COMMENT '商户配置ID',
    `app_id` VARCHAR(64) NOT NULL COMMENT '业务应用ID',
    
    `notify_type` ENUM('pay', 'refund', 'profit_sharing') NOT NULL COMMENT '通知类型',
    `channel` ENUM('alipay', 'wechat', 'all') NOT NULL DEFAULT 'all' COMMENT '渠道',
    
    `notify_url` VARCHAR(512) NOT NULL COMMENT '回调目标地址',
    `secret_key` VARCHAR(128) DEFAULT NULL COMMENT '签名密钥',
    `retry_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用重试',
    `max_retry` INT UNSIGNED DEFAULT 3 COMMENT '最大重试次数',
    
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_merchant_type` (`merchant_id`, `notify_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='回调目标配置表';

-- =====================================================
-- 9. 支付渠道表 (pay_channel_config)
-- 渠道级配置
-- =====================================================
CREATE TABLE IF NOT EXISTS `pay_channel_config` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `channel` ENUM('alipay', 'wechat') NOT NULL UNIQUE COMMENT '渠道标识',
    `channel_name` VARCHAR(64) NOT NULL COMMENT '渠道名称',
    
    -- 支付宝
    `alipay_gateway` VARCHAR(256) DEFAULT 'https://openapi.alipay.com/gateway.do' COMMENT '支付宝网关',
    `alipay_app_cert` TEXT DEFAULT NULL COMMENT '应用公钥证书',
    `alipay_root_cert` TEXT DEFAULT NULL COMMENT '支付宝根证书',
    
    -- 微信
    `wechat_gateway` VARCHAR(256) DEFAULT 'https://api.mch.weixin.qq.com' COMMENT '微信网关',
    `wechat_cert_path` VARCHAR(256) DEFAULT NULL COMMENT '证书路径（apiclient_cert.p12）',
    
    -- 状态
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `remark` VARCHAR(256) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付渠道配置表';

-- =====================================================
-- 10. 操作日志表 (operation_log)
-- 记录关键操作
-- =====================================================
CREATE TABLE IF NOT EXISTS `operation_log` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `operator` VARCHAR(64) DEFAULT NULL COMMENT '操作人',
    `operation_type` VARCHAR(64) NOT NULL COMMENT '操作类型',
    `target_type` VARCHAR(64) DEFAULT NULL COMMENT '操作对象类型',
    `target_id` VARCHAR(64) DEFAULT NULL COMMENT '操作对象ID',
    
    `request_data` JSON DEFAULT NULL COMMENT '请求数据',
    `response_data` JSON DEFAULT NULL COMMENT '响应数据',
    `status` TINYINT DEFAULT 1 COMMENT '状态（1成功 0失败）',
    `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
    
    `client_ip` VARCHAR(64) DEFAULT NULL COMMENT '客户端IP',
    `user_agent` VARCHAR(512) DEFAULT NULL COMMENT 'User-Agent',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_operation_type` (`operation_type`),
    INDEX `idx_target` (`target_type`, `target_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- =====================================================
-- 初始化数据
-- =====================================================

-- 插入渠道配置
INSERT INTO `pay_channel_config` (`channel`, `channel_name`, `status`) VALUES
('alipay', '支付宝', 'active'),
('wechat', '微信支付', 'active');

-- 插入示例商户配置（测试用，密钥需要替换）
INSERT INTO `merchant_config` (
    `app_id`, `app_name`, `channel`, 
    `alipay_app_id`, `alipay_notify_url`,
    `wechat_app_id`, `wechat_mch_id`, `wechat_notify_url`,
    `profit_sharing_enabled`, `default_channel`,
    `status`, `remark`
) VALUES (
    'app_test_001', '测试应用', 'both',
    '2021000123456789', 'https://your-domain.com/api/notify/alipay',
    'wx1234567890abcd', '1234567890', 'https://your-domain.com/api/notify/wechat',
    1, 'alipay',
    'active', '测试用商户配置，请替换真实密钥'
);

-- =====================================================
-- 存储过程：自动关闭超时订单
-- =====================================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `close_expired_orders`()
BEGIN
    UPDATE `pay_order` 
    SET `status` = 'closed', 
        `updated_at` = NOW()
    WHERE `status` = 'pending' 
      AND `expire_time` < NOW()
      AND `expire_time` IS NOT NULL;
    
    SELECT ROW_COUNT() AS closed_count;
END //
DELIMITER ;

-- =====================================================
-- 视图：订单汇总统计
-- =====================================================
CREATE OR REPLACE VIEW `v_order_summary` AS
SELECT 
    app_id,
    channel,
    DATE(created_at) AS date,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
    SUM(CASE WHEN status = 'paid' THEN actual_amount ELSE 0 END) AS total_amount,
    SUM(CASE WHEN status = 'refunded' OR status = 'partial_refund' THEN refund_amount ELSE 0 END) AS refund_amount
FROM pay_order
GROUP BY app_id, channel, DATE(created_at);
