'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Users,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalOrders: number;
  paidOrders: number;
  totalAmount: number;
  refundAmount: number;
  merchantCount: number;
}

interface RecentOrder {
  order_no: string;
  merchant_order_no: string;
  channel: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    paidOrders: 0,
    totalAmount: 0,
    refundAmount: 0,
    merchantCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载数据
    const timer = setTimeout(() => {
      setStats({
        totalOrders: 1256,
        paidOrders: 1189,
        totalAmount: 156789.50,
        refundAmount: 3250.00,
        merchantCount: 8,
      });
      setRecentOrders([
        {
          order_no: 'PAY1A2B3C4D5E',
          merchant_order_no: 'ORD20240101001',
          channel: 'alipay',
          total_amount: 299.00,
          status: 'paid',
          created_at: '2024-01-15 10:30:00',
        },
        {
          order_no: 'PAY6E7F8G9H0I',
          merchant_order_no: 'ORD20240101002',
          channel: 'wechat',
          total_amount: 1580.00,
          status: 'paid',
          created_at: '2024-01-15 11:15:00',
        },
        {
          order_no: 'PAY2J3K4L5M6N',
          merchant_order_no: 'ORD20240101003',
          channel: 'alipay',
          total_amount: 89.90,
          status: 'pending',
          created_at: '2024-01-15 12:00:00',
        },
        {
          order_no: 'PAY7O8P9Q0R1S',
          merchant_order_no: 'ORD20240101004',
          channel: 'wechat',
          total_amount: 456.00,
          status: 'paid',
          created_at: '2024-01-15 13:30:00',
        },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: '待支付' },
      paid: { variant: 'default', label: '已支付' },
      closed: { variant: 'secondary', label: '已关闭' },
      refunded: { variant: 'destructive', label: '已退款' },
    };
    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getChannelBadge = (channel: string) => {
    return (
      <Badge variant={channel === 'alipay' ? 'default' : 'secondary'}>
        {channel === 'alipay' ? '支付宝' : '微信支付'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
        <p className="text-slate-500 mt-1">支付数据概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">总订单数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalOrders.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12.5% 较上月</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">支付成功</p>
                <p className="text-2xl font-bold mt-1">{stats.paidOrders.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <span>{((stats.paidOrders / stats.totalOrders) * 100).toFixed(1)}% 成功率</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">交易总额</p>
                <p className="text-2xl font-bold mt-1">{formatAmount(stats.totalAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+8.3% 较上月</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">退款总额</p>
                <p className="text-2xl font-bold mt-1">{formatAmount(stats.refundAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-slate-500">
              <span>{((stats.refundAmount / stats.totalAmount) * 100).toFixed(2)}% 退款率</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/merchant">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">商户管理</p>
                  <p className="text-sm text-slate-500">{stats.merchantCount} 个商户</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/order">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">支付订单</p>
                  <p className="text-sm text-slate-500">查看所有订单</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/refund">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">退款管理</p>
                  <p className="text-sm text-slate-500">处理退款请求</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 最近订单 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近订单</CardTitle>
          <Link href="/dashboard/order">
            <Button variant="ghost" size="sm">
              查看全部
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>商户订单号</TableHead>
                <TableHead>支付渠道</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.order_no}>
                  <TableCell className="font-mono text-sm">{order.order_no}</TableCell>
                  <TableCell className="font-mono text-sm">{order.merchant_order_no}</TableCell>
                  <TableCell>{getChannelBadge(order.channel)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(order.total_amount / 100)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-slate-500">{order.created_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
