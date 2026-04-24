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
  const [alipayKeys, setAlipayKeys] = useState({ 
    privateKey: '', 
    publicKeyPkcs8: '',
    publicKeyPkcs1: ''  // 支付宝要求的格式
  });
  
  // 微信 API 密钥
  const [wechatApiKey, setWechatApiKey] = useState('');
  
  // 微信 RSA 密钥
  const [wechatRsaKeys, setWechatRsaKeys] = useState({ privateKey: '', publicKey: '' });

  // 复制状态
  const [copied, setCopied] = useState<string | null>(null);

  // 生成 PKCS#1 格式公钥的纯 Base64 字符串（支付宝要求）
  // PKCS#1 格式 = RSAPublicKey = { modulus (n), publicExponent (e) }
  // 支付宝需要纯 Base64 字符串，不带 PEM 头部
  const publicKeyToPkcs1Base64 = (forge: typeof import('node-forge'), publicKey: any): string => {
    // 从公钥对象提取 n 和 e
    const publicKeyHex = publicKey.n.toString(16); // modulus
    const exponent = publicKey.e.toString(); // public exponent (通常是 65537)
    
    // 将 hex 转换为 bytes
    const nBytes = hexToBytes(publicKeyHex);
    const eBytes = intToBytes(parseInt(exponent, 10));
    
    // 构建 PKCS#1 RSAPublicKey ASN.1 结构
    // RSAPublicKey ::= SEQUENCE { n INTEGER, e INTEGER }
    const asn1Sequence = forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, nBytes),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, eBytes)
      ]
    );
    
    const der = forge.asn1.toDer(asn1Sequence).getBytes();
    // 返回纯 Base64 字符串（支付宝要求）
    return forge.util.encode64(der);
  };

  // 生成 PKCS#8 格式私钥的纯 Base64 字符串
  const privateKeyToPkcs8Base64 = (forge: typeof import('node-forge'), privateKey: any): string => {
    const asn1 = forge.pki.privateKeyToAsn1(privateKey);
    const der = forge.asn1.toDer(asn1).getBytes();
    return forge.util.encode64(der);
  };

  // 生成 PKCS#1 格式私钥（支付宝要求）
  // PKCS#1 RSAPrivateKey = { version, modulus, publicExponent, privateExponent, prime1, prime2, exponent1, exponent2, coefficient }
  const privateKeyToPkcs1Base64 = (forge: typeof import('node-forge'), privateKey: any): string => {
    const asn1 = forge.pki.privateKeyToAsn1(privateKey);
    const der = forge.asn1.toDer(asn1).getBytes();
    return forge.util.encode64(der);
  };

  // 将十六进制字符串转换为字节数组
  const hexToBytes = (hex: string): string => {
    let bytes = '';
    // 确保是偶数长度
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substr(i, 2), 16);
      bytes += String.fromCharCode(charCode);
    }
    return bytes;
  };

  // 将整数转换为字节数组
  const intToBytes = (num: number): string => {
    if (num < 256) {
      return String.fromCharCode(num);
    }
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }
    return hexToBytes(hex);
  };

  // 生成支付宝 RSA2 密钥对
  const generateAlipayKeys = async () => {
    try {
      const forge = await import('node-forge');
      
      // 生成 RSA 密钥对 (2048位)
      const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      
      // PKCS#8 格式私钥（纯 Base64 字符串）
      const privateKey = privateKeyToPkcs8Base64(forge, keypair.privateKey);
      
      // PKCS#8 格式公钥（通用格式）
      const publicKeyPkcs8 = forge.pki.publicKeyToPem(keypair.publicKey);
      
      // PKCS#1 格式公钥（支付宝要求：纯 Base64 字符串）
      const publicKeyPkcs1 = publicKeyToPkcs1Base64(forge, keypair.publicKey);
      
      setAlipayKeys({ privateKey, publicKeyPkcs8, publicKeyPkcs1: publicKeyPkcs1 });
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

  // 生成微信 RSA 密钥对 (PKCS#8 格式)
  const generateWechatRsaKeys = async () => {
    try {
      const forge = await import('node-forge');
      
      // 生成 RSA 密钥对 (2048位)
      const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
      
      // PKCS#8 格式私钥（微信支付 APIv3 要求）
      const privateKeyPkcs8 = forge.asn1.toDer(forge.pki.privateKeyToAsn1(keypair.privateKey)).getBytes();
      const privateKey = '-----BEGIN PRIVATE KEY-----\n' + 
        forge.util.encode64(privateKeyPkcs8) + 
        '\n-----END PRIVATE KEY-----';
      
      // PKCS#8 公钥
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
                      <Label>应用私钥</Label>
                      <Button 
                        variant="default" 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => copyToClipboard(alipayKeys.privateKey, 'alipay-private')}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copied === 'alipay-private' ? '已复制' : '复制'}
                      </Button>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {alipayKeys.privateKey}
                      </pre>
                    </div>
                    <p className="text-xs text-slate-500">用于：配置到商户设置中，服务端调用支付宝 API 时签名使用</p>
                  </div>

                  {/* 应用公钥 - 支付宝要求的纯 Base64 字符串 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>应用公钥 (上传到支付宝后台)</Label>
                        <Badge className="bg-green-100 text-green-700 border-green-300">纯 Base64</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => copyToClipboard(alipayKeys.publicKeyPkcs1, 'alipay-public')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'alipay-public' ? '已复制' : '复制'}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {alipayKeys.publicKeyPkcs1}
                      </pre>
                    </div>
                    <p className="text-xs text-slate-500">用于：复制此纯字符串（不含 -----BEGIN 行）到支付宝开放平台</p>
                  </div>

                  {/* PKCS#8 格式公钥 - 仅供调试 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>应用公钥 (PKCS#8 格式)</Label>
                        <Badge variant="outline">调试用</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(alipayKeys.publicKeyPkcs8, 'alipay-public-pkcs8')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'alipay-public-pkcs8' ? '已复制' : '复制'}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800 rounded-lg">
                      <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {alipayKeys.publicKeyPkcs8}
                      </pre>
                    </div>
                    <p className="text-xs text-slate-500">说明：PKCS#8 格式公钥，部分第三方系统可能需要此格式</p>
                  </div>

                  {/* 使用说明 */}
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium text-green-800">配置步骤</p>
                      <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                        <li>点击「生成密钥对」获取新的密钥</li>
                        <li>复制上面的「应用公钥」纯字符串（蓝色高亮区域）</li>
                        <li>登录支付宝开放平台 → 我的应用 → 密钥设置</li>
                        <li>选择「RSA2(SHA256)」签名方式，粘贴公钥内容</li>
                        <li>支付宝会返回「支付宝公钥」，需配置到商户设置中</li>
                        <li>将「应用私钥」配置到本系统的商户设置中</li>
                      </ol>
                      <p className="text-xs text-green-600 mt-2">
                        注意：只需复制公钥的 Base64 字符串，不要复制 -----BEGIN----- 行
                      </p>
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
              <CardTitle className="flex items-center gap-2">
                微信支付 API 密钥
                <Badge variant="outline">APIv2</Badge>
              </CardTitle>
              <CardDescription>
                微信支付 APIv2 使用的 32 位密钥字符串
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
                      <Label>API 密钥 (32位)</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(wechatApiKey, 'wechat-api')}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copied === 'wechat-api' ? '已复制' : '复制'}
                      </Button>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg">
                      <pre className="text-green-400 text-lg font-mono tracking-wider">
                        {wechatApiKey}
                      </pre>
                    </div>
                  </div>

                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <p className="font-medium text-amber-800">使用说明</p>
                      <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                        <li>复制生成的 API 密钥</li>
                        <li>登录微信支付商户平台 → 账户中心 → API 安全</li>
                        <li>设置 API 密钥（32位，必须与这里生成的保持一致）</li>
                        <li>将相同密钥配置到本系统的商户设置中</li>
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
                微信支付 RSA 密钥对
                <Badge variant="outline">APIv3</Badge>
              </CardTitle>
              <CardDescription>
                微信支付 APIv3 使用的 RSA 签名密钥对（2048位）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={generateWechatRsaKeys} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  生成密钥对
                </Button>
              </div>

              {wechatRsaKeys.privateKey && (
                <>
                  {/* 商户私钥 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>商户私钥 (PKCS#8 格式)</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(wechatRsaKeys.privateKey, 'wechat-rsa-private')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'wechat-rsa-private' ? '已复制' : '复制'}
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
                      <Label>商户公钥 (PKCS#8 格式)</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(wechatRsaKeys.publicKey, 'wechat-rsa-public')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copied === 'wechat-rsa-public' ? '已复制' : '复制'}
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
                        <li>将「商户私钥」配置到本系统的商户设置中</li>
                        <li>登录微信支付商户平台 → 账户中心 → API 安全</li>
                        <li>申请设置商户公钥（上传此页面显示的公钥内容）</li>
                        <li>微信审核通过后，会返回「微信平台公钥」</li>
                      </ol>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 格式说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">密钥格式说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700">PKCS#1 格式</p>
              <p className="text-slate-500 mt-1">-----BEGIN RSA PUBLIC KEY-----</p>
              <p className="text-slate-500">用于：支付宝上传公钥</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700">PKCS#8 格式</p>
              <p className="text-slate-500 mt-1">-----BEGIN PUBLIC KEY-----</p>
              <p className="text-slate-500">用于：通用场景、部分第三方系统</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
