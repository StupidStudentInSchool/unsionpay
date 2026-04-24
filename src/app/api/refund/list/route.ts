import { NextRequest, NextResponse } from 'next/server';
import { getRefundList, queryRefund } from '@/server/services/refund';
import { formatRefundListResponse } from '@/server/services/refund';

/**
 * GET /api/refund/list - 获取退款列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const appId = searchParams.get('app_id');

    const result = await getRefundList({
      page,
      pageSize,
      status: status || undefined,
      appId: appId || undefined,
    });

    return NextResponse.json(formatRefundListResponse(result));
  } catch (error) {
    console.error('Refund list error:', error);
    return NextResponse.json(
      { code: 500, message: '查询失败', data: null },
      { status: 500 }
    );
  }
}
