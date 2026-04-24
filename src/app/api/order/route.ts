import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/server/db';
import { getOrderList, getOrderSummary } from '@/server/services/pay';
import { formatOrderListResponse, formatOrderSummaryResponse } from '@/server/services/pay';

/**
 * GET /api/order - 获取订单列表或汇总
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const outTradeNo = searchParams.get('out_trade_no');

    // 汇总请求
    if (searchParams.get('summary') === 'true') {
      const summary = await getOrderSummary();
      return NextResponse.json(formatOrderSummaryResponse(summary));
    }

    // 列表请求
    const result = await getOrderList({
      page,
      pageSize,
      status: status || undefined,
      channel: channel || undefined,
      outTradeNo: outTradeNo || undefined,
    });

    return NextResponse.json(formatOrderListResponse(result));
  } catch (error) {
    console.error('Order list error:', error);
    return NextResponse.json(
      { code: 500, message: '查询失败', data: null },
      { status: 500 }
    );
  }
}
