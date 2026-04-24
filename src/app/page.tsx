'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Users,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Globe,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">统一支付系统</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
              功能特性
            </Link>
            <Link href="#api" className="text-slate-600 hover:text-slate-900 transition-colors">
              API 文档
            </Link>
            <Link href="/dashboard">
              <Button>管理后台</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            一次对接，多端复用
          </div>
          <h1 className="text-5xl font-bold text-slate-900 leading-tight">
            统一支付网关
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              简化支付接入
            </span>
          </h1>
          <p className="text-xl text-slate-600 mt-6 max-w-2xl mx-auto">
            支持支付宝、微信支付等多种支付渠道，一次对接即可在电商、SaaS、小程序、App
            等多场景使用，轻松管理商户配置和分账。
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8">
                立即使用
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#api">
              <Button size="lg" variant="outline" className="h-12 px-8">
                查看 API
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">核心功能</h2>
            <p className="text-slate-600 mt-3">一站式解决所有支付场景需求</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>统一支付</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">
                支付宝、微信支付一键接入，支持扫码、App、H5、JSAPI
                等多种支付方式，统一接口，统一回调。
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>分账管理</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">
                支持平台抽佣、多方分润等场景，灵活配置分账方，自动执行分账，确保资金高效流转。
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>安全可靠</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">
                签名加密、IP 白名单、限流熔断，全方位保障交易安全，敏感信息脱敏存储。
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>多场景适配</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">
                电商平台、SaaS 服务、小程序、App 应用，一次对接即可在所有场景使用，无需重复配置。
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-cyan-600" />
                </div>
                <CardTitle>简洁 API</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">
                RESTful API 设计，文档清晰，示例丰富，只需几行代码即可完成支付接入。
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* API 文档 */}
      <section id="api" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">快速接入</h2>
            <p className="text-slate-600 mt-3">只需几步，即可完成支付对接</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 支付下单 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  支付下单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                  <pre className="text-slate-300">
{`POST /api/pay
{
  "app_id": "your-app-id",
  "out_trade_no": "订单号",
  "trade_type": "native",
  "total_amount": 1.00,
  "subject": "商品名称"
}`}
                  </pre>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>返回支付链接/二维码</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>自动异步回调通知</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 支付查询 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  支付查询
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                  <pre className="text-slate-300">
{`GET /api/pay?app_id=xxx&out_trade_no=xxx

// 返回
{
  "order_no": "PAY...",
  "status": "paid",
  "paid_time": "2024-01-01T10:00:00Z"
}`}
                  </pre>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>实时查询订单状态</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>支持退款状态查询</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 退款 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  退款
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                  <pre className="text-slate-300">
{`POST /api/refund
{
  "app_id": "your-app-id",
  "out_trade_no": "原订单号",
  "out_refund_no": "退款单号",
  "refund_amount": 1.00,
  "reason": "用户申请退款"
}`}
                  </pre>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>支持全额/部分退款</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>自动处理分账回退</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 分账 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  分账
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                  <pre className="text-slate-300">
{`POST /api/profit-sharing
{
  "app_id": "your-app-id",
  "out_trade_no": "订单号",
  "out_sharing_no": "分账单号",
  "amount": 0.50,
  "receivers": [{
    "receiver_account": "账号",
    "amount": 0.50
  }]
}`}
                  </pre>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>多方分账</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>支持完结和回退</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 回调说明 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">回调通知</h2>
            <p className="text-slate-600 mt-3">支付完成后，系统自动推送通知到您的服务器</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">回调地址配置</h3>
                  <p className="text-slate-600 text-sm">
                    在商户配置中设置 notify_url，或在支付请求中传入 notify_url 参数。
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">回调地址</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm">
                      https://your-domain.com/api/notify/alipay
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('https://your-domain.com/api/notify/alipay')}
                    >
                      {copied ? '已复制' : '复制'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm">
                      https://your-domain.com/api/notify/wechat
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">响应要求</h3>
                  <p className="text-slate-600 text-sm">
                    收到回调后返回 <code className="bg-slate-100 px-1 rounded">success</code> 表示成功，
                    其他内容会触发重试。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span>统一支付系统</span>
          </div>
          <div>Powered by Next.js</div>
        </div>
      </footer>
    </div>
  );
}
