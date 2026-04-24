'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw, ArrowLeftRight, AlertCircle } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface Refund {
  refund_no: string;
  order_no: string;
  merchant_order_no: string;
  channel: string;
  total_amount: number;
  refund_amount: number;
  status: string;
  reason?: string;
  created_at: string;
  refund_time?: string;
}

export default function RefundPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundForm, setRefundForm] = useState({
    app_id: '',
    out_trade_no: '',
    out_refund_no: '',
    refund_amount: '',
    reason: '',
  });
  const [refunding, setRefunding] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchRefunds();
  }, [page, status]);

  const fetchRefunds = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      });
      if (status !== 'all') params.set('status', status);

      const response = await fetch(`/api/refund/list?${params}`);
      const data = await response.json();

      if (data.code === 0) {
        setRefunds(data.data?.list || []);
        setTotal(data.data?.total || 0);
        setTotalPages(Math.ceil((data.data?.total || 0) / 10));
      } else {
        setError(data.message || '获取退款列表失败');
      }
    } catch (err) {
      setError('网络错误，请检查数据库连接');
      console.error('Failed to fetch refunds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundForm.app_id || !refundForm.out_trade_no || !refundForm.out_refund_no || !refundForm.refund_amount) {
      setSubmitError('请填写完整信息');
      return;
    }

    setRefunding(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...refundForm,
          refund_amount: parseFloat(refundForm.refund_amount) * 100,
        }),
      });

      const result = await response.json();
      if (result.code === 0) {
        setShowRefundDialog(false);
        setRefundForm({
          app_id: '',
          out_trade_no: '',
          out_refund_no: '',
          refund_amount: '',
          reason: '',
        });
        fetchRefunds();
      } else {
        setSubmitError(result.message || '退款失败');
      }
    } catch (err) {
      setSubmitError('网络错误，请重试');
    } finally {
      setRefunding(false);
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
      pending: { variant: 'outline', label: '待处理' },
      processing: { variant: 'secondary', label: '处理中' },
      success: { variant: 'default', label: '已退款' },
      failed: { variant: 'destructive', label: '失败' },
      closed: { variant: 'secondary', label: '已关闭' },
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

  const filteredRefunds = refunds.filter((refund) => {
    const matchesSearch =
      refund.refund_no.toLowerCase().includes(search.toLowerCase()) ||
      refund.order_no.toLowerCase().includes(search.toLowerCase()) ||
      refund.merchant_order_no.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">退款管理</h1>
          <p className="text-slate-500 mt-1">处理退款请求</p>
        </div>

        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogTrigger asChild>
            <Button>
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              发起退款
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>发起退款</DialogTitle>
              <DialogDescription>填写退款信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {submitError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {submitError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">应用ID *</label>
                <Input
                  placeholder="app_test_001"
                  value={refundForm.app_id}
                  onChange={(e) => setRefundForm({ ...refundForm, app_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">商户订单号 *</label>
                <Input
                  placeholder="原支付订单号"
                  value={refundForm.out_trade_no}
                  onChange={(e) => setRefundForm({ ...refundForm, out_trade_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">退款单号 *</label>
                <Input
                  placeholder="商户侧退款单号"
                  value={refundForm.out_refund_no}
                  onChange={(e) => setRefundForm({ ...refundForm, out_refund_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">退款金额（元）*</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={refundForm.refund_amount}
                  onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">退款原因</label>
                <Input
                  placeholder="退款原因（可选）"
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                取消
              </Button>
              <Button onClick={handleRefund} disabled={refunding}>
                {refunding ? '处理中...' : '确认退款'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                placeholder="搜索退款单号/订单号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="退款状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="success">已退款</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchRefunds}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>

            <span className="text-sm text-slate-500 ml-auto">共 {total} 笔退款</span>
          </div>
        </CardContent>
      </Card>

      {/* 退款列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>暂无退款数据</p>
              <p className="text-sm mt-1">有支付订单后即可发起退款</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>退款单号</TableHead>
                  <TableHead>原订单号</TableHead>
                  <TableHead>商户订单号</TableHead>
                  <TableHead>渠道</TableHead>
                  <TableHead className="text-right">订单金额</TableHead>
                  <TableHead className="text-right">退款金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>申请时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRefunds.map((refund) => (
                  <TableRow key={refund.refund_no}>
                    <TableCell className="font-mono text-sm">{refund.refund_no}</TableCell>
                    <TableCell className="font-mono text-sm">{refund.order_no}</TableCell>
                    <TableCell className="font-mono text-sm">{refund.merchant_order_no}</TableCell>
                    <TableCell>{getChannelBadge(refund.channel)}</TableCell>
                    <TableCell className="text-right text-slate-600">
                      {formatAmount(refund.total_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      {formatAmount(refund.refund_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell className="text-slate-500 max-w-[150px] truncate">
                      {refund.reason || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500">{refund.created_at}</TableCell>
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
