'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface Order {
  order_no: string;
  merchant_order_no: string;
  app_id: string;
  channel: string;
  trade_type: string;
  total_amount: number;
  status: string;
  paid_time?: string;
  created_at: string;
}

export default function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [channel, setChannel] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [page, status, channel]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      });
      if (status !== 'all') params.set('status', status);
      if (channel !== 'all') params.set('channel', channel);

      const response = await fetch(`/api/order?${params}`);
      const data = await response.json();

      if (data.code === 0) {
        setOrders(data.data?.list || []);
        setTotal(data.data?.total || 0);
        setTotalPages(Math.ceil((data.data?.total || 0) / 10));
      } else {
        setError(data.message || '获取订单列表失败');
      }
    } catch (err) {
      setError('网络错误，请检查数据库连接');
      console.error('Failed to fetch orders:', err);
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
      processing: { variant: 'secondary', label: '处理中' },
      paid: { variant: 'default', label: '已支付' },
      closed: { variant: 'secondary', label: '已关闭' },
      refunded: { variant: 'destructive', label: '已退款' },
      partial_refund: { variant: 'destructive', label: '部分退款' },
    };
    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getChannelBadge = (channel: string) => {
    return (
      <Badge variant={channel === 'alipay' ? 'default' : 'secondary'}>
        {channel === 'alipay' ? '支付宝' : '微信'}
      </Badge>
    );
  };

  const getTradeTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      native: '扫码',
      app: 'App支付',
      h5: 'H5支付',
      jsapi: 'JSAPI',
      web: '网页支付',
    };
    return typeMap[type] || type;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_no.toLowerCase().includes(search.toLowerCase()) ||
      order.merchant_order_no.toLowerCase().includes(search.toLowerCase()) ||
      order.app_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">支付订单</h1>
        <p className="text-slate-500 mt-1">查看和管理所有支付订单</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">{error}</p>
              <p className="text-sm text-orange-600 mt-1">
                请确保数据库已连接并执行了初始化脚本
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索订单号/商户订单号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="订单状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待支付</SelectItem>
                <SelectItem value="paid">已支付</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
                <SelectItem value="refunded">已退款</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="支付渠道" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部渠道</SelectItem>
                <SelectItem value="alipay">支付宝</SelectItem>
                <SelectItem value="wechat">微信支付</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>

            <span className="text-sm text-slate-500 ml-auto">共 {total} 笔订单</span>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>暂无订单数据</p>
              <p className="text-sm mt-1">创建商户后即可发起支付</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>商户订单号</TableHead>
                  <TableHead>应用</TableHead>
                  <TableHead>渠道</TableHead>
                  <TableHead>支付方式</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.order_no}>
                    <TableCell className="font-mono text-sm">{order.order_no}</TableCell>
                    <TableCell className="font-mono text-sm">{order.merchant_order_no}</TableCell>
                    <TableCell className="text-slate-600">{order.app_id}</TableCell>
                    <TableCell>{getChannelBadge(order.channel)}</TableCell>
                    <TableCell className="text-slate-600">{getTradeTypeLabel(order.trade_type)}</TableCell>
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

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
