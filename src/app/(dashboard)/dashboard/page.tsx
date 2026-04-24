'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Users, RefreshCw, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [merchantRes, orderRes] = await Promise.all([
        fetch('/api/merchant?pageSize=1'),
        fetch('/api/order/summary'),
      ]);

      const merchantData = await merchantRes.json();
      
      // 尝试获取订单汇总数据
      let orderSummary = null;
      try {
        const orderData = await orderRes.json();
        if (orderData.code === 0) {
          orderSummary = orderData.data;
        }
      } catch {
        // 订单汇总接口可能不存在
      }

      setStats({
        totalOrders: orderSummary?.totalOrders || 0,
        paidOrders: orderSummary?.paidOrders || 0,
        totalAmount: orderSummary?.totalAmount || 0,
        refundAmount: orderSummary?.refundAmount || 0,
        merchantCount: merchantData.data?.total || 0,
      });

      // 获取最近订单
      try {
        const ordersRes = await fetch('/api/order?pageSize=5');
        const ordersData = await ordersRes.json();
        if (ordersData.code === 0 && ordersData.data?.list) {
          setRecentOrders(ordersData.data.list);
        }
      } catch {
        setRecentOrders([]);
      }
    } catch (err) {
      setError('加载数据失败，请检查数据库连接');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount / 100);
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

      {/* 错误提示 */}
      {error && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">{error}</p>
              <p className="text-sm text-orange-600 mt-1">
                请确保 MySQL 数据库已启动并执行了初始化脚本
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">总订单数</p>
                <p className="text-2xl font-bold mt-1">{(stats?.totalOrders || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>成功率 {stats?.totalOrders ? ((stats.paidOrders / stats.totalOrders) * 100).toFixed(1) : 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">支付成功</p>
                <p className="text-2xl font-bold mt-1">{(stats?.paidOrders || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">交易总额</p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.totalAmount ? formatAmount(stats.totalAmount) : '¥0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">退款总额</p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.refundAmount ? formatAmount(stats.refundAmount) : '¥0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
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
                  <p className="text-sm text-slate-500">{stats?.merchantCount || 0} 个商户</p>
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
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>暂无订单数据</p>
              <p className="text-sm mt-1">创建商户后即可发起支付</p>
            </div>
          ) : (
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
                      {formatAmount(order.total_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-slate-500">{order.created_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
