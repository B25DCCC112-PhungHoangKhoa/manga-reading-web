import { NextRequest, NextResponse } from 'next/server';
import { getChapterPages } from '@/lib/mangadex';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await context.params;

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'Chapter ID required' }, { status: 400 });
    }

    const data = await getChapterPages(chapterId);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

