'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MerchantForm } from '@/components/merchant-form';

interface Merchant {
  id: number;
  app_id: string;
  app_name: string;
  channel: string;
  profit_sharing_enabled: boolean;
  status: string;
  created_at: string;
}

export default function MerchantPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await fetch('/api/merchant');
      const data = await response.json();
      if (data.code === 0) {
        setMerchants(data.data.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
      // 使用模拟数据
      setMerchants([
        {
          id: 1,
          app_id: 'app_test_001',
          app_name: '测试应用',
          channel: 'both',
          profit_sharing_enabled: true,
          status: 'active',
          created_at: '2024-01-01 10:00:00',
        },
        {
          id: 2,
          app_id: 'app_ec_001',
          app_name: '电商平台',
          channel: 'both',
          profit_sharing_enabled: true,
          status: 'active',
          created_at: '2024-01-05 15:30:00',
        },
        {
          id: 3,
          app_id: 'app_mini_001',
          app_name: '小程序应用',
          channel: 'wechat',
          profit_sharing_enabled: false,
          status: 'active',
          created_at: '2024-01-10 09:00:00',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    fetchMerchants();
  };

  const handleEditSuccess = () => {
    setEditingMerchant(null);
    fetchMerchants();
  };

  const getChannelBadge = (channel: string) => {
    if (channel === 'both') {
      return (
        <div className="flex gap-1">
          <Badge variant="default">支付宝</Badge>
          <Badge variant="secondary">微信</Badge>
        </div>
      );
    }
    return (
      <Badge variant={channel === 'alipay' ? 'default' : 'secondary'}>
        {channel === 'alipay' ? '支付宝' : '微信'}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      active: { variant: 'default', label: '正常' },
      inactive: { variant: 'secondary', label: '停用' },
      suspended: { variant: 'destructive', label: '暂停' },
    };
    const config = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredMerchants = merchants.filter(
    (m) =>
      m.app_id.includes(search) ||
      m.app_name.includes(search)
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">商户管理</h1>
          <p className="text-slate-500 mt-1">管理所有接入支付的应用</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建商户
        </Button>
      </div>

      {/* 搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索商户ID或名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 商户列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商户ID</TableHead>
                <TableHead>商户名称</TableHead>
                <TableHead>支付渠道</TableHead>
                <TableHead>分账</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-mono">{merchant.app_id}</TableCell>
                  <TableCell className="font-medium">{merchant.app_name}</TableCell>
                  <TableCell>{getChannelBadge(merchant.channel)}</TableCell>
                  <TableCell>
                    {merchant.profit_sharing_enabled ? (
                      <Badge variant="default">已开通</Badge>
                    ) : (
                      <Badge variant="outline">未开通</Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                  <TableCell className="text-slate-500">{merchant.created_at}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingMerchant(merchant)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建商户弹窗 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建商户</DialogTitle>
            <DialogDescription>
              填写商户信息以创建新的支付接入应用
            </DialogDescription>
          </DialogHeader>
          <MerchantForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* 编辑商户弹窗 */}
      <Dialog open={!!editingMerchant} onOpenChange={() => setEditingMerchant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑商户</DialogTitle>
            <DialogDescription>
              修改商户配置信息
            </DialogDescription>
          </DialogHeader>
          {editingMerchant && (
            <MerchantForm
              merchant={editingMerchant}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingMerchant(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
