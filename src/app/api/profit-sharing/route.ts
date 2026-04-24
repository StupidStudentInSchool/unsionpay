// =====================================================
// 统一支付系统 - 分账 API 路由
// POST /api/profit-sharing - 统一分账
// GET /api/profit-sharing - 分账查询
// POST /api/profit-sharing/finish - 完结分账
// POST /api/profit-sharing/return - 分账回退
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { ProfitSharingService } from '@/server/services/profit-sharing';
import { PayException, UnifiedProfitSharingRequest } from '@/server/types';
import { generateRequestId } from '@/server/utils';

function apiResponse<T>(data: T, code: number = 0, message: string = 'success') {
  return NextResponse.json({ code, message, data });
}

function errorResponse(message: string, code: number = 400) {
  return NextResponse.json({ code, message }, { status: 200 });
}

/**
 * POST /api/profit-sharing
 * 统一分账
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // 验证必填参数
    if (!body.app_id) {
      return errorResponse('缺少 app_id 参数');
    }
    if (!body.out_trade_no) {
      return errorResponse('缺少 out_trade_no 参数');
    }
    if (!body.out_sharing_no) {
      return errorResponse('缺少 out_sharing_no 参数');
    }
    if (!body.amount) {
      return errorResponse('缺少 amount 参数');
    }
    if (!body.receivers || !Array.isArray(body.receivers) || body.receivers.length === 0) {
      return errorResponse('缺少 receivers 参数或格式错误');
    }

    // 构建分账请求
    const sharingRequest: UnifiedProfitSharingRequest = {
      app_id: body.app_id,
      channel: body.channel,
      out_trade_no: body.out_trade_no,
      out_sharing_no: body.out_sharing_no,
      amount: Number(body.amount),
      receivers: body.receivers,
      description: body.description,
    };

    // 调用分账服务
    const result = await ProfitSharingService.unifiedProfitSharing(sharingRequest);

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Profit sharing error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message);
    }

    return errorResponse('分账失败，请稍后重试', 500);
  }
}

/**
 * GET /api/profit-sharing
 * 分账查询
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const searchParams = request.nextUrl.searchParams;
    const sharingNo = searchParams.get('sharing_no');

    if (!sharingNo) {
      return errorResponse('缺少 sharing_no 参数');
    }

    const result = await ProfitSharingService.query(sharingNo);

    if (!result) {
      return errorResponse('分账记录不存在', 404);
    }

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Profit sharing query error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message);
    }

    return errorResponse('查询失败，请稍后重试', 500);
  }
}
