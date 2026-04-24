// =====================================================
// 统一支付系统 - 签名模块
// =====================================================

import crypto from 'crypto';
import { PayChannel } from '../../types';

/**
 * 签名类型
 */
export type SignType = 'RSA' | 'RSA2' | 'HMAC-SHA256';

/**
 * 签名服务
 */
export class SignService {
  /**
   * 将纯 Base64 密钥转换为 PEM 格式
   */
  private static toPemKey(key: string, type: 'PRIVATE' | 'PUBLIC' | 'RSA PUBLIC' | 'RSA PRIVATE' | 'PRIVATE KEY' | 'PUBLIC KEY'): string {
    // 如果已经是 PEM 格式，直接返回
    if (key.includes('-----BEGIN')) {
      return key;
    }
    
    // 移除可能的空白字符
    const cleanKey = key.replace(/\\s/g, '');
    
    // 添加 PEM 头部和尾部，每 64 字符换行
    const lines = ['-----BEGIN ' + type + '-----'];
    for (let i = 0; i < cleanKey.length; i += 64) {
      lines.push(cleanKey.substring(i, i + 64));
    }
    lines.push('-----END ' + type + '-----');
    
    return lines.join('\n');
  }

  /**
   * 支付宝签名
   */
  static alipaySign(
    params: Record<string, unknown>,
    privateKey: string,
    signType: SignType = 'RSA2'
  ): string {
    // 1. 移除 sign 和 sign_type 参数
    const filteredParams = { ...params };
    delete filteredParams.sign;
    delete filteredParams.sign_type;

    // 2. 按字典序排序
    const sortedKeys = Object.keys(filteredParams).sort();
    const signString = sortedKeys
      .filter(key => filteredParams[key] !== undefined && filteredParams[key] !== '')
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    // 3. 使用 RSA 签名
    const sign = this.rsaSign(signString, privateKey, signType);
    return sign;
  }

  /**
   * 支付宝验签
   */
  static alipayVerify(
    params: Record<string, unknown>,
    sign: string,
    publicKey: string,
    signType: SignType = 'RSA2'
  ): boolean {
    // 1. 移除 sign 和 sign_type 参数
    const filteredParams = { ...params };
    delete filteredParams.sign;
    delete filteredParams.sign_type;

    // 2. 按字典序排序
    const sortedKeys = Object.keys(filteredParams).sort();
    const signString = sortedKeys
      .filter(key => filteredParams[key] !== undefined && filteredParams[key] !== '')
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    // 3. 验签
    return this.rsaVerify(signString, sign, publicKey, signType);
  }

  /**
   * 微信支付签名 (APIv2)
   */
  static wechatSignV2(
    params: Record<string, unknown>,
    apiKey: string
  ): string {
    // 1. 过滤空值和 sign 参数
    const filteredParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'sign' && value !== undefined && value !== null && value !== '') {
        filteredParams[key] = value;
      }
    }

    // 2. 按字典序排序并拼接
    const sortedKeys = Object.keys(filteredParams).sort();
    const signString = sortedKeys
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&') + `&key=${apiKey}`;

    // 3. MD5 签名并转大写
    return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 微信支付验签 (APIv2)
   */
  static wechatVerifyV2(
    params: Record<string, unknown>,
    apiKey: string
  ): boolean {
    const sign = params.sign as string;
    if (!sign) return false;

    const calculatedSign = this.wechatSignV2(params, apiKey);
    return sign === calculatedSign;
  }

  /**
   * 微信支付签名 (APIv3)
   */
  static wechatSignV3(
    method: string,
    url: string,
    timestamp: string,
    nonce: string,
    body: string,
    privateKey: string,
    serialNo: string
  ): string {
    // 构建签名串
    const signString = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;

    // 使用 RSA 签名
    return this.rsaSign(signString, privateKey, 'RSA2');
  }

  /**
   * 微信支付 APIv3 构建 Authorization 头
   */
  static wechatBuildAuthorizationV3(
    method: string,
    url: string,
    body: string,
    privateKey: string,
    serialNo: string,
    mchId: string
  ): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const signature = this.wechatSignV3(
      method,
      url,
      timestamp,
      nonce,
      body,
      privateKey,
      serialNo
    );

    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
  }

  /**
   * RSA 签名 - 使用 crypto.sign 兼容 OpenSSL 3.0
   */
  static rsaSign(
    data: string,
    privateKey: string,
    signType: SignType
  ): string {
    // 转换为 PEM 格式
    let pemKey = this.toPemKey(privateKey, 'PRIVATE KEY');
    
    // 如果不是 PKCS#8 格式，尝试转换
    if (!pemKey.includes('-----BEGIN PRIVATE KEY-----')) {
      try {
        const keyObject = crypto.createPrivateKey(pemKey);
        pemKey = keyObject.export({ type: 'pkcs8', format: 'pem' }) as string;
      } catch {
        // 如果转换失败，使用原始格式
      }
    }
    
    // 使用 crypto.sign 代替 createSign，更兼容 OpenSSL 3.0
    const algorithm = signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1';
    const sign = crypto.sign(algorithm, Buffer.from(data, 'utf8'), pemKey);
    return sign.toString('base64');
  }

  /**
   * RSA 验签 - 使用 crypto.verify 兼容 OpenSSL 3.0
   */
  static rsaVerify(
    data: string,
    sign: string,
    publicKey: string,
    signType: SignType
  ): boolean {
    // 转换为 PEM 格式
    let pemKey = this.toPemKey(publicKey, 'PUBLIC KEY');
    
    // 如果不是 X.509 格式，尝试转换
    if (!pemKey.includes('-----BEGIN PUBLIC KEY-----')) {
      try {
        const keyObject = crypto.createPublicKey(pemKey);
        pemKey = keyObject.export({ type: 'spki', format: 'pem' }) as string;
      } catch {
        // 如果转换失败，使用原始格式
      }
    }
    
    // 使用 crypto.verify 代替 createVerify，更兼容 OpenSSL 3.0
    const algorithm = signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1';
    return crypto.verify(algorithm, Buffer.from(data, 'utf8'), pemKey, Buffer.from(sign, 'base64'));
  }

  /**
   * MD5 签名
   */
  static md5Sign(data: string): string {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex');
  }

  /**
   * SHA256 签名
   */
  static sha256Sign(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * 生成随机字符串
   */
  static generateNonce(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成随机数字串
   */
  static generateNonceNum(length: number = 32): string {
    const chars = '0123456789';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % 10];
    }
    return result;
  }
}

/**
 * 验证回调签名（根据渠道）
 */
export async function verifyNotifySign(
  channel: PayChannel,
  request: Request,
  config: {
    alipay_public_key?: string;
    alipay_alipay_public_key?: string; // 支付宝公钥用于验签
    wechat_api_key?: string;
    wechat_public_cert?: string;
  }
): Promise<boolean> {
  if (channel === 'alipay') {
    // 支付宝回调验签 - 使用支付宝公钥
    const body = await request.text();
    const params = new URLSearchParams(body);
    const sign = params.get('sign');
    if (!sign || !config.alipay_alipay_public_key) return false;

    const signParams: Record<string, unknown> = {};
    params.forEach((value, key) => {
      if (key !== 'sign') {
        signParams[key] = value;
      }
    });

    return SignService.alipayVerify(signParams, sign, config.alipay_alipay_public_key);
  } else if (channel === 'wechat') {
    // 微信回调验签 (APIv2)
    const body = await request.text();
    const params = new URLSearchParams(body);
    const sign = params.get('sign');
    if (!sign || !config.wechat_api_key) return false;

    const signParams: Record<string, unknown> = {};
    params.forEach((value, key) => {
      signParams[key] = value;
    });

    return SignService.wechatVerifyV2(signParams, config.wechat_api_key);
  }

  return false;
}

export default SignService;
