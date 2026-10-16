import { NextRequest, NextResponse } from 'next/server';
import { searchManga } from '@/lib/anilist';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('perPage') || '12', 10), 30);

    if (!query.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const data = await searchManga(query, page, perPage);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

