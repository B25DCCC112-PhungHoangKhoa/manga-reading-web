import { NextRequest, NextResponse } from 'next/server';
import { getTrendingMangaWithPagination } from '@/lib/anilist';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(parseInt(searchParams.get('perPage') || '18', 10), 50);

    const { media, pageInfo } = await getTrendingMangaWithPagination(page, perPage);
    return NextResponse.json({ success: true, data: media, pageInfo });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
