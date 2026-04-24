'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap, Copy, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Merchant {
  app_id: string;
  app_name: string;
  channel: string;
}

interface TestResult {
  success: boolean;
  order_no?: string;
  qr_code?: string;
  url?: string;
  error?: string;
  details?: {
    channel: string;
    trade_type: string;
    amount: number;
    signed_url?: string;
    raw_response?: string;
  };
}

export default function PayTestPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  
  // 表单状态
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [channel, setChannel] = useState('alipay');
  const [tradeType, setTradeType] = useState('native');
  const [amount, setAmount] = useState('1');
  const [subject, setSubject] = useState('支付测试');
  const [outTradeNo, setOutTradeNo] = useState(`TEST${Date.now()}`);
  
  // 测试结果
  const [result, setResult] = useState<TestResult | null>(null);
  
  // 配置检查结果
  const [configCheck, setConfigCheck] = useState<{
    alipay: { complete: boolean; missing: string[] };
    wechat: { complete: boolean; missing: string[] };
  } | null>(null);

  // 加载商户列表
  useEffect(() => {
    fetchMerchants();
  }, []);

  // 选中商户后检查配置
  useEffect(() => {
    if (selectedMerchant) {
      checkMerchantConfig(selectedMerchant);
    }
  }, [selectedMerchant]);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/merchant');
      const data = await response.json();
      if (data.code === 0) {
        setMerchants(data.data?.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMerchantConfig = async (appId: string) => {
    try {
      const merchant = merchants.find(m => m.app_id === appId);
      if (!merchant) return;

      const check = {
        alipay: { complete: true, missing: [] as string[] },
        wechat: { complete: true, missing: [] as string[] },
      };

      // 获取完整商户配置
      const response = await fetch(`/api/merchant/${appId}`);
      const data = await response.json();
      
      if (data.code === 0 && data.data) {
        const config = data.data;
        
        // 检查支付宝配置
        if (config.channel === 'alipay' || config.channel === 'both') {
          if (!config.alipay_app_id) {
            check.alipay.complete = false;
            check.alipay.missing.push('支付宝 AppID');
          }
          if (!config.alipay_private_key) {
            check.alipay.complete = false;
            check.alipay.missing.push('应用私钥');
          }
          // 支付宝公钥可选（用于验签）
        }
        
        // 检查微信配置
        if (config.channel === 'wechat' || config.channel === 'both') {
          if (!config.wechat_app_id) {
            check.wechat.complete = false;
            check.wechat.missing.push('微信 AppID');
          }
          if (!config.wechat_mch_id) {
            check.wechat.complete = false;
            check.wechat.missing.push('商户号');
          }
          if (!config.wechat_api_key && !config.wechat_private_key) {
            check.wechat.complete = false;
            check.wechat.missing.push('API密钥或私钥');
          }
        }
      }
      
      setConfigCheck(check);
    } catch (error) {
      console.error('Failed to check config:', error);
    }
  };

  const handleTest = async () => {
    if (!selectedMerchant) {
      alert('请选择商户');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: selectedMerchant,
          channel,
          trade_type: tradeType,
          out_trade_no: outTradeNo,
          total_amount: parseFloat(amount) * 100, // 转换为分
          subject,
          body: `支付测试 - ${new Date().toLocaleString()}`,
        }),
      });

      const data = await response.json();
      
      if (data.code === 0) {
        setResult({
          success: true,
          order_no: data.data.order_no,
          qr_code: data.data.qr_code,
          url: data.data.pay_url || data.data.h5_url,
          details: {
            channel,
            trade_type: tradeType,
            amount: parseFloat(amount) * 100,
            signed_url: data.data.pay_url,
            raw_response: JSON.stringify(data.data, null, 2),
          },
        });
      } else {
        setResult({
          success: false,
          error: data.message || '支付下单失败',
          details: {
            channel,
            trade_type: tradeType,
            amount: parseFloat(amount) * 100,
            raw_response: JSON.stringify(data, null, 2),
          },
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          channel,
          trade_type: tradeType,
          amount: parseFloat(amount) * 100,
        },
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const getConfigStatus = (type: 'alipay' | 'wechat') => {
    if (!configCheck) return null;
    const check = configCheck[type];
    if (check.complete) {
      return { icon: CheckCircle, color: 'text-green-600', text: '配置完整' };
    } else {
      return { icon: XCircle, color: 'text-red-600', text: `缺少: ${check.missing.join(', ')}` };
    }
  };

  const selectedMerchantData = merchants.find(m => m.app_id === selectedMerchant);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">支付测试工具</h1>
        <p className="text-slate-500 mt-1">测试商户配置是否正确，验证支付通道是否可用</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：配置表单 */}
        <div className="space-y-6">
          {/* 商户选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. 选择商户</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </div>
              ) : merchants.length === 0 ? (
                <div className="text-slate-500">
                  暂无商户，请先创建商户
                </div>
              ) : (
                <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择要测试的商户" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map(merchant => (
                      <SelectItem key={merchant.app_id} value={merchant.app_id}>
                        <div className="flex items-center gap-2">
                          <span>{merchant.app_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {merchant.channel === 'both' ? '支付宝+微信' : 
                             merchant.channel === 'alipay' ? '支付宝' : '微信'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* 配置检查 */}
          {selectedMerchant && configCheck && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. 配置检查</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedMerchantData?.channel === 'both' || selectedMerchantData?.channel === 'alipay') && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = getConfigStatus('alipay');
                      if (!status) return null;
                      const Icon = status.icon;
                      return (
                        <>
                          <Icon className={`w-4 h-4 ${status.color}`} />
                          <span className="text-sm">支付宝: {status.text}</span>
                        </>
                      );
                    })()}
                  </div>
                )}
                {(selectedMerchantData?.channel === 'both' || selectedMerchantData?.channel === 'wechat') && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = getConfigStatus('wechat');
                      if (!status) return null;
                      const Icon = status.icon;
                      return (
                        <>
                          <Icon className={`w-4 h-4 ${status.color}`} />
                          <span className="text-sm">微信支付: {status.text}</span>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {!configCheck.alipay.complete || !configCheck.wechat.complete ? (
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium">配置不完整，请先完善商户配置</p>
                        <p className="text-xs mt-1">缺少的字段会影响支付功能</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">配置检查通过，可以测试支付</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 支付参数 */}
          {selectedMerchant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. 支付参数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>支付渠道</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedMerchantData?.channel === 'both' && (
                          <>
                            <SelectItem value="alipay">支付宝</SelectItem>
                            <SelectItem value="wechat">微信支付</SelectItem>
                          </>
                        )}
                        {selectedMerchantData?.channel === 'alipay' && (
                          <SelectItem value="alipay">支付宝</SelectItem>
                        )}
                        {selectedMerchantData?.channel === 'wechat' && (
                          <SelectItem value="wechat">微信支付</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>支付方式</Label>
                    <Select value={tradeType} onValueChange={setTradeType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="native">扫码支付</SelectItem>
                        <SelectItem value="app">APP支付</SelectItem>
                        <SelectItem value="h5">H5支付</SelectItem>
                        <SelectItem value="jsapi">JSAPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>金额（元）</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>订单号</Label>
                    <Input
                      value={outTradeNo}
                      onChange={(e) => setOutTradeNo(e.target.value)}
                      placeholder="自定义订单号"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>商品名称</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="商品描述"
                  />
                </div>

                <Button 
                  onClick={handleTest} 
                  disabled={testing || !configCheck?.alipay.complete && !configCheck?.wechat.complete}
                  className="w-full gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      发起测试支付
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：测试结果 */}
        <div className="space-y-6">
          {result && (
            <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {result.success ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700">支付下单成功</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-700">支付下单失败</span>
                      </>
                    )}
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setResult(null)}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.success ? (
                  <>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">订单号:</span>
                          <span className="font-mono">{result.order_no}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">金额:</span>
                          <span className="font-medium">¥{parseFloat(amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">渠道:</span>
                          <Badge>{channel === 'alipay' ? '支付宝' : '微信支付'}</Badge>
                        </div>
                      </div>
                    </div>

                    {result.qr_code && (
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-2">扫码支付</p>
                        <div className="inline-block p-4 bg-white border rounded-lg">
                          {result.qr_code.startsWith('weixin://') ? (
                            <div className="text-center">
                              <Zap className="w-16 h-16 mx-auto text-green-600" />
                              <p className="mt-2 text-sm text-slate-600">微信支付二维码</p>
                              <p className="text-xs text-slate-400 mt-1 break-all">{result.qr_code}</p>
                            </div>
                          ) : result.qr_code.startsWith('https://') || result.qr_code.startsWith('http://') ? (
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.qr_code)}`}
                              alt="QR Code"
                              className="mx-auto"
                            />
                          ) : (
                            <p className="text-sm text-slate-500">{result.qr_code}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {result.url && (
                      <div>
                        <Label className="text-sm">支付链接</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={result.url} 
                            readOnly 
                            className="text-xs font-mono"
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => copyToClipboard(result.url!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-700 font-medium">{result.error}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">原始响应</Label>
                    {result.details?.raw_response && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => copyToClipboard(result.details!.raw_response!)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        复制
                      </Button>
                    )}
                  </div>
                  <pre className="p-3 bg-slate-900 text-green-400 text-xs rounded-lg overflow-auto max-h-60">
                    {result.details?.raw_response || JSON.stringify({ error: result.error }, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 无结果时的提示 */}
          {!result && selectedMerchant && (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="w-12 h-12 mx-auto text-slate-300" />
                <p className="mt-4 text-slate-500">点击「发起测试支付」开始测试</p>
                <p className="text-sm text-slate-400 mt-2">
                  系统将调用支付接口并返回结果
                </p>
              </CardContent>
            </Card>
          )}

          {/* 未选择商户 */}
          {!selectedMerchant && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">请先选择要测试的商户</p>
              </CardContent>
            </Card>
          )}

          {/* 测试说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">测试说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p><strong>测试流程：</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>选择要测试的商户</li>
                <li>检查配置是否完整（绿色表示完整，红色表示缺少字段）</li>
                <li>填写支付参数（金额、订单号等）</li>
                <li>点击「发起测试支付」</li>
                <li>查看返回结果</li>
              </ol>
              
              <Separator className="my-3" />
              
              <p><strong>注意事项：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>测试金额建议使用 0.01 元</li>
                <li>沙箱环境不会产生真实扣款</li>
                <li>生产环境请确保配置正确的密钥</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
