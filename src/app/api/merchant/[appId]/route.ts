// =====================================================
// 统一支付系统 - 商户详情 API
// GET /api/merchant/[appId] - 获取商户详情
// PUT /api/merchant/[appId] - 更新商户配置
// DELETE /api/merchant/[appId] - 删除商户
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { MerchantService } from '@/server/services/merchant';
import { PayException } from '@/server/types';
import { generateRequestId } from '@/server/utils';

function apiResponse<T>(data: T, code: number = 0, message: string = 'success') {
  return NextResponse.json({ code, message, data });
}

function errorResponse(message: string, code: number = 400) {
  return NextResponse.json({ code, message }, { status: 200 });
}

/**
 * GET /api/merchant/[appId]
 * 获取商户详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const requestId = generateRequestId();

  try {
    const { appId } = await params;
    const merchant = await MerchantService.getByAppId(appId);

    if (!merchant) {
      return errorResponse('商户不存在', 404);
    }

    // 隐藏敏感信息
    const safeMerchant = {
      ...merchant,
      alipay_private_key: merchant.alipay_private_key ? '******' : undefined,
      wechat_api_key: merchant.wechat_api_key ? '******' : undefined,
      wechat_private_key: merchant.wechat_private_key ? '******' : undefined,
    };

    return apiResponse(safeMerchant);
  } catch (error) {
    console.error(`[${requestId}] Get merchant error:`, error);
    return errorResponse('获取商户详情失败', 500);
  }
}

/**
 * PUT /api/merchant/[appId]
 * 更新商户配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const requestId = generateRequestId();

  try {
    const { appId } = await params;
    const merchant = await MerchantService.getByAppId(appId);

    if (!merchant) {
      return errorResponse('商户不存在', 404);
    }

    const body = await request.json();

    // 更新商户配置
    const success = await MerchantService.update(merchant.id, {
      app_name: body.app_name,
      channel: body.channel,
      alipay_app_id: body.alipay_app_id,
      alipay_private_key: body.alipay_private_key,
      alipay_public_key: body.alipay_public_key,
      alipay_notify_url: body.alipay_notify_url,
      wechat_app_id: body.wechat_app_id,
      wechat_mch_id: body.wechat_mch_id,
      wechat_api_key: body.wechat_api_key,
      wechat_private_key: body.wechat_private_key,
      wechat_public_cert: body.wechat_public_cert,
      wechat_notify_url: body.wechat_notify_url,
      profit_sharing_enabled: body.profit_sharing_enabled,
      default_channel: body.default_channel,
      status: body.status,
      rate_limit: body.rate_limit,
      remark: body.remark,
    });

    if (!success) {
      return errorResponse('更新失败');
    }

    return apiResponse({ success: true });
  } catch (error) {
    console.error(`[${requestId}] Update merchant error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message);
    }

    return errorResponse('更新商户失败', 500);
  }
}
