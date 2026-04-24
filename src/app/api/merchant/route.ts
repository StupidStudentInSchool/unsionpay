// =====================================================
// 统一支付系统 - 商户管理 API
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
 * GET /api/merchant
 * 获取商户列表
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') as 'active' | 'inactive' | 'suspended' | undefined;

    const result = await MerchantService.list(page, pageSize, status);

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Merchant list error:`, error);
    return errorResponse('获取商户列表失败', 500);
  }
}

/**
 * POST /api/merchant
 * 创建商户
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // 验证必填参数
    if (!body.app_id) {
      return errorResponse('缺少 app_id 参数');
    }
    if (!body.app_name) {
      return errorResponse('缺少 app_name 参数');
    }

    // 创建商户
    const id = await MerchantService.create({
      app_id: body.app_id,
      app_name: body.app_name,
      channel: body.channel || 'both',
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
      profit_sharing_enabled: body.profit_sharing_enabled || false,
      default_channel: body.default_channel || 'alipay',
      status: body.status || 'active',
      rate_limit: body.rate_limit || 100,
      remark: body.remark,
    });

    return apiResponse({ id });
  } catch (error) {
    console.error(`[${requestId}] Create merchant error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message);
    }

    // 处理重复键错误
    if (error instanceof Error && error.message.includes('Duplicate')) {
      return errorResponse('app_id 已存在');
    }

    return errorResponse('创建商户失败', 500);
  }
}
