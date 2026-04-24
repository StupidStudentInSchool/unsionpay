// =====================================================
// 统一支付系统 - 统一支付 API 路由
// POST /api/pay - 统一支付下单
// POST /api/pay/query - 支付查询
// POST /api/pay/close - 关闭订单
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { PayService } from '@/server/services/pay';
import { PayException, UnifiedPayRequest } from '@/server/types';
import { generateRequestId } from '@/server/utils';

// 统一响应
function apiResponse<T>(data: T, code: number = 0, message: string = 'success') {
  return NextResponse.json({ code, message, data });
}

// 错误响应
function errorResponse(message: string, code: number = 400, status: number = 200) {
  return NextResponse.json({ code, message }, { status });
}

/**
 * POST /api/pay
 * 统一支付下单
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // 验证必填参数
    if (!body.app_id) {
      return errorResponse('缺少 app_id 参数', 400);
    }
    if (!body.out_trade_no) {
      return errorResponse('缺少 out_trade_no 参数', 400);
    }
    if (!body.trade_type) {
      return errorResponse('缺少 trade_type 参数', 400);
    }
    if (!body.total_amount) {
      return errorResponse('缺少 total_amount 参数', 400);
    }
    if (!body.subject) {
      return errorResponse('缺少 subject 参数', 400);
    }

    // 构建支付请求
    const payRequest: UnifiedPayRequest = {
      app_id: body.app_id,
      channel: body.channel,
      trade_type: body.trade_type,
      out_trade_no: body.out_trade_no,
      total_amount: Number(body.total_amount),
      currency: body.currency || 'CNY',
      subject: body.subject,
      body: body.body,
      notify_url: body.notify_url,
      return_url: body.return_url,
      attach: body.attach,
      client_ip: body.client_ip || request.headers.get('x-forwarded-for') || '127.0.0.1',
      profit_sharing: body.profit_sharing,
      extra: body.extra,
    };

    // 调用支付服务
    const result = await PayService.unifiedPay(payRequest);

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Pay error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('支付失败，请稍后重试', 500);
  }
}

/**
 * GET /api/pay
 * 支付查询
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const searchParams = request.nextUrl.searchParams;
    const appId = searchParams.get('app_id');
    const outTradeNo = searchParams.get('out_trade_no');

    if (!appId) {
      return errorResponse('缺少 app_id 参数', 400);
    }
    if (!outTradeNo) {
      return errorResponse('缺少 out_trade_no 参数', 400);
    }

    const result = await PayService.query(appId, outTradeNo);

    return apiResponse(result);
  } catch (error) {
    console.error(`[${requestId}] Query error:`, error);

    if (error instanceof PayException) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('查询失败，请稍后重试', 500);
  }
}
