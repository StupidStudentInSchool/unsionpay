// =====================================================
// 统一支付系统 - 支付宝回调通知
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { NotifyService } from '@/server/services/notify';
import { MerchantService } from '@/server/services/merchant';
import { PayException } from '@/server/types';
import { generateRequestId } from '@/server/utils';

/**
 * POST /api/notify/alipay
 * 支付宝异步回调通知
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // 解析回调参数
    const body = await request.text();
    const params = new URLSearchParams(body);
    const appId = params.get('app_id');

    if (!appId) {
      console.error(`[${requestId}] Missing app_id in alipay notify`);
      return new NextResponse('fail', { status: 200 });
    }

    // 获取商户配置
    const merchant = await MerchantService.getByAppId(appId);
    if (!merchant) {
      console.error(`[${requestId}] Merchant not found: ${appId}`);
      return new NextResponse('fail', { status: 200 });
    }

    // 处理回调
    const result = await NotifyService.handlePayNotify('alipay', request, {
      alipay_public_key: merchant.alipay_public_key,
    });

    console.log(`[${requestId}] Alipay notify processed:`, result);

    return new NextResponse('success', { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] Alipay notify error:`, error);

    if (error instanceof PayException) {
      return new NextResponse('fail', { status: 200 });
    }

    return new NextResponse('fail', { status: 200 });
  }
}
