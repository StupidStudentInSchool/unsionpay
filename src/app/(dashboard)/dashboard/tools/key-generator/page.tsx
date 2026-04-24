'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, RefreshCw, Key, Shield, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function KeyGeneratorPage() {
  // 支付宝 RSA2 密钥
  const [alipayKeys, setAlipayKeys] = useState({ privateKey: '', publicKey: '' });
  
  // 微信 API 密钥
  const [wechatApiKey, setWechatApiKey] = useState('');
  
  // 微信 RSA 密钥
  const [wechatRsaKeys, setWechatRsaKeys] = useState({ privateKey: '', publicKey: '' });

  // 复制状态
  const [copied, setCopied] = useState<string | null>(null);

  // 生成支付宝 RSA2 密钥对
  const generateAlipayKeys = async () => {
    try {
      const forge = await import('node-forge');
      
      // 生成 RSA 密钥对 (2048位)
      const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      
      // PEM 格式
      const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
      const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
      
      setAlipayKeys({ privateKey, publicKey });
    } catch (error) {
      console.error('Failed to generate Alipay keys:', error);
      alert('生成失败，请重试');
    }
  };

  // 生成微信 API 密钥 (32位随机字符串)
  const generateWechatApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setWechatApiKey(key);
  };

  // 生成微信 RSA 密钥对
  const generateWechatRsaKeys = async () => {
    try {
      const forge = await import('node-forge');
      
      // 生成 RSA 密钥对 (2048位)
      const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      
      // PEM 格式
      const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
      const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
      
      setWechatRsaKeys({ privateKey, publicKey });
    } catch (error) {
      console.error('Failed to generate Wechat RSA keys:', error);
      alert('生成失败，请重试');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 下载文件
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">密钥生成工具</h1>
        <p className="text-slate-500 mt-1">生成支付宝、微信支付所需的密钥和证书</p>
      </div>

      {/* 安全提示 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">安全提示</p>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• 私钥请妥善保管，切勿泄露或提交到代码仓库</li>
              <li>• 支付宝私钥用于服务端签名，请设置到商户配置中</li>
              <li>• 微信 API 密钥为 32 位字符串，请安全存储</li>
              <li>• 生产环境建议使用密钥管理服务（如 AWS KMS）</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 密钥类型选项 */}
      <Tabs defaultValue="alipay" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alipay" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            支付宝密钥
          </TabsTrigger>
          <TabsTrigger value="wechat-api" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            微信 API 密钥
          </TabsTrigger>
          <TabsTrigger value="wechat-rsa" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            微信 RSA 密钥
          </TabsTrigger>
        </TabsList>

        {/* 支付宝 RSA2 密钥 */}
        <TabsContent value="alipay">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                支付宝 RSA2 密钥对
                <Badge variant="outline">推荐</Badge>
              </CardTitle>
              <CardDescription>
                支付宝移动支付使用的 RSA2 签名密钥对（2048位）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={generateAlipayKeys} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  生成密钥对
                </Button>
              </div>

              {alipayKeys.privateKey && (
                <>
                  {/* 应用私钥 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>应用私钥 (APP Private Key)</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(alipayKeys.privateKey, 'alipay-private')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'alipay-private' ? '已复制' : '复制'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadFile(alipayKeys.privateKey, 'alipay_private_key.pem', 'application/x-pem-file')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          下载
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {alipayKeys.privateKey}
                      </pre>
                    </div>
                  </div>

                  {/* 应用公钥 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>应用公钥 (APP Public Key)</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(alipayKeys.publicKey, 'alipay-public')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'alipay-public' ? '已复制' : '复制'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadFile(alipayKeys.publicKey, 'alipay_public_key.pem', 'application/x-pem-file')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          下载
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {alipayKeys.publicKey}
                      </pre>
                    </div>
                  </div>

                  {/* 使用说明 */}
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <p className="font-medium text-amber-800">使用说明</p>
                      <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                        <li>将「应用私钥」配置到商户设置中</li>
                        <li>将「应用公钥」填写到支付宝开放平台后台（密钥设置页面）</li>
                        <li>支付宝会生成「支付宝公钥」，需要配置到商户设置中用于验签</li>
                      </ol>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 微信 API 密钥 */}
        <TabsContent value="wechat-api">
          <Card>
            <CardHeader>
              <CardTitle>微信 API 密钥 (APIv2)</CardTitle>
              <CardDescription>
                用于微信支付 APIv2 签名的 32 位随机字符串
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={generateWechatApiKey} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  生成 API 密钥
                </Button>
              </div>

              {wechatApiKey && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>微信 API 密钥</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(wechatApiKey, 'wechat-apikey')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'wechat-apikey' ? '已复制' : '复制'}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-lg font-mono tracking-widest">
                        {wechatApiKey}
                      </pre>
                    </div>
                  </div>

                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <p className="font-medium text-amber-800">使用说明</p>
                      <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                        <li>将生成的 API 密钥配置到商户设置中</li>
                        <li>APIv2 已逐步废弃，新项目建议使用 APIv3 + RSA 密钥</li>
                      </ol>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 微信 RSA 密钥 */}
        <TabsContent value="wechat-rsa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                微信 APIv3 RSA 密钥对
                <Badge>推荐</Badge>
              </CardTitle>
              <CardDescription>
                用于微信支付 APIv3 的 RSA256 签名密钥对（2048位）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={generateWechatRsaKeys} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  生成 RSA 密钥对
                </Button>
              </div>

              {wechatRsaKeys.privateKey && (
                <>
                  {/* 商户私钥 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>商户私钥 (Merchant Private Key)</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(wechatRsaKeys.privateKey, 'wechat-private')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'wechat-private' ? '已复制' : '复制'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadFile(wechatRsaKeys.privateKey, 'wechat_private_key.pem', 'application/x-pem-file')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          下载
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {wechatRsaKeys.privateKey}
                      </pre>
                    </div>
                  </div>

                  {/* 商户公钥 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>商户公钥 (Merchant Public Key)</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(wechatRsaKeys.publicKey, 'wechat-public')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'wechat-public' ? '已复制' : '复制'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadFile(wechatRsaKeys.publicKey, 'wechat_public_key.pem', 'application/x-pem-file')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          下载
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {wechatRsaKeys.publicKey}
                      </pre>
                    </div>
                  </div>

                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <p className="font-medium text-amber-800">使用说明</p>
                      <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                        <li>将「商户私钥」配置到商户设置中</li>
                        <li>将「商户公钥」上传到微信支付商户平台（API 安全 → RSA加密 → 手动上传）</li>
                        <li>微信支付会提供「微信支付平台证书」，用于解密回调</li>
                      </ol>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 密钥配置说明 */}
      <Card>
        <CardHeader>
          <CardTitle>密钥配置位置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="font-medium mb-2">支付宝配置</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• 应用私钥 → 商户设置中的 alipay_private_key</li>
                <li>• 支付宝公钥 → 商户设置中的 alipay_public_key</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-medium mb-2">微信支付配置</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• APIv2 密钥 → 商户设置中的 wechat_api_key</li>
                <li>• APIv3 私钥 → 商户设置中的 wechat_private_key</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
