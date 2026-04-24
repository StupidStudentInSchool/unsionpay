// =====================================================
// 统一支付系统 - 退款 API 路由
// POST /api/refund - 统一退款
// GET /api/refund - 退款查询
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { RefundService } from '@/server/services/refund';
import { PayException, UnifiedRefundRequest } from '@/server/types';
import { generateRequestId } from '@/server/utils';

function apiResponse<T>(data: T, code: number = 0, message: string = 'success') {
  return NextResponse.json({ code, message, data });
}

function errorResponse(message: string, code: number = 400) {
  return NextResponse.json({ code, message }, { status: 200 });
}

/**
 * POST /api/refund
 * 统一退款
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
    if (!body.out_refund_no) {
      return errorResponse('缺少 out_refund_no 参数');
    }
    if (!body.refund_amount) {
      return errorResponse('缺少 refund_amount 参数');
    }

    // 构建退款请求
    const refundRequest: UnifiedRefundRequest = {
      app_id: body.app_id,
      channel: body.channel,
      out_trade_no: body.out_trade_no,
      out_refund_no: body.out_refund_no,
      refund_amount: Number(body.refund_amount),
      reason: body.reason,
      notify_url: body.notify_url,
    };

    // 调用退款服务
    const result = await RefundService.unifiedRefund(refundRequest);

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Refund error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message);
    }

    return errorResponse('退款失败，请稍后重试', 500);
  }
}

/**
 * GET /api/refund
 * 退款查询
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const searchParams = request.nextUrl.searchParams;
    const appId = searchParams.get('app_id');
    const outRefundNo = searchParams.get('out_refund_no');

    if (!appId) {
      return errorResponse('缺少 app_id 参数');
    }
    if (!outRefundNo) {
      return errorResponse('缺少 out_refund_no 参数');
    }

    const result = await RefundService.query(appId, outRefundNo);

    if (!result) {
      return errorResponse('退款记录不存在', 404);
    }

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Refund query error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message);
    }

    return errorResponse('查询失败，请稍后重试', 500);
  }
}
