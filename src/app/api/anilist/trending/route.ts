import { NextRequest, NextResponse } from 'next/server';
import { getTrendingManga } from '@/lib/anilist';

import { filterAvailableManga } from '@/lib/mangadex';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('perPage') || '12', 10), 50);

    const rawData = await getTrendingManga(page, perPage);
    const data = await filterAvailableManga(rawData);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

