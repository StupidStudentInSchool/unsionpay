// =====================================================
// 统一支付系统 - 微信支付回调通知
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { NotifyService } from '@/server/services/notify';
import { MerchantService } from '@/server/services/merchant';
import { PayService } from '@/server/services/pay';
import { PayException } from '@/server/types';
import { generateRequestId } from '@/server/utils';

/**
 * POST /api/notify/wechat
 * 微信支付异步回调通知
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // 解析 XML 回调
    const body = await request.text();
    
    // 简单的 XML 解析获取 appid
    const appidMatch = body.match(/<appid><!\[CDATA\[([^\]]+)\]\]><\/appid>/);
    const appid = appidMatch ? appidMatch[1] : null;

    if (!appid) {
      console.error(`[${requestId}] Missing appid in wechat notify`);
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Missing appid]]></return_msg></xml>',
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // 获取商户配置
    const merchant = await MerchantService.getByAppId(appid);
    if (!merchant) {
      console.error(`[${requestId}] Merchant not found: ${appid}`);
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Merchant not found]]></return_msg></xml>',
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // 处理回调
    const result = await NotifyService.handlePayNotify('wechat', request, {
      wechat_api_key: merchant.wechat_api_key,
    });

    console.log(`[${requestId}] Wechat notify processed:`, result);

    return new NextResponse(
      '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Wechat notify error:`, error);

    return new NextResponse(
      '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[System error]]></return_msg></xml>',
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}
