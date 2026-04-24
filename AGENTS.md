# 统一支付系统 - 开发规范

## 项目概述

统一支付网关系统，支持支付宝、微信支付，具备分账能力。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + TypeScript + shadcn/ui
- **后端**: Next.js API Routes
- **数据库**: MySQL 8.0+
- **包管理**: pnpm

## 目录结构

```
├── sql/                          # 数据库脚本
│   └── init.sql                  # 数据库初始化脚本
├── src/
│   ├── app/                      # 页面路由
│   │   ├── api/                  # API 路由
│   │   │   ├── pay/              # 支付相关
│   │   │   ├── refund/            # 退款相关
│   │   │   ├── profit-sharing/    # 分账相关
│   │   │   ├── merchant/          # 商户管理
│   │   │   └── notify/            # 回调通知
│   │   ├── (dashboard)/           # 管理后台
│   │   └── page.tsx               # 首页
│   ├── components/               # 组件
│   └── server/                   # 服务端代码
│       ├── adapters/             # 支付渠道适配器
│       ├── config/               # 配置
│       ├── db/                   # 数据库
│       ├── services/             # 业务服务
│       ├── types/                # 类型定义
│       └── utils/                # 工具函数
```

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_USER | 数据库用户 | root |
| DB_PASSWORD | 数据库密码 | - |
| DB_NAME | 数据库名 | unified_pay |
| DEPLOY_RUN_PORT | 服务端口 | 5000 |

## 数据库部署

1. 创建数据库并执行初始化脚本:
```bash
mysql -u root -p < sql/init.sql
```

2. 配置环境变量或创建 `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=unified_pay
```

## 开发命令

```bash
pnpm install    # 安装依赖
pnpm dev        # 开发模式
pnpm build      # 构建生产版本
pnpm lint       # 代码检查
pnpm ts-check   # 类型检查
```

## API 接口

### 支付

```
POST /api/pay          # 统一支付下单
GET  /api/pay          # 支付查询
```

### 退款

```
POST /api/refund       # 统一退款
GET  /api/refund       # 退款查询
```

### 分账

```
POST /api/profit-sharing   # 统一分账
GET  /api/profit-sharing   # 分账查询
POST /api/profit-sharing/finish  # 完结分账
```

### 商户管理

```
GET  /api/merchant         # 商户列表
POST /api/merchant          # 创建商户
GET  /api/merchant/:appId   # 商户详情
PUT  /api/merchant/:appId   # 更新商户
```

### 回调通知

```
POST /api/notify/alipay     # 支付宝回调
POST /api/notify/wechat     # 微信支付回调
```

## 页面访问

- 首页/文档: `http://localhost:5000/`
- 管理后台: `http://localhost:5000/dashboard`
