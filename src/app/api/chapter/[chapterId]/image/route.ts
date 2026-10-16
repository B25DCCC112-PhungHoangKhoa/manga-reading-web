import { NextRequest, NextResponse } from 'next/server';
import { getChapterPages } from '@/lib/mangadex';

export const runtime = 'nodejs';

/**
 * Endpoint for Postman / API clients to directly receive a chapter's page image binary.
 *
 * Example:
 * GET /api/chapter/0aaf8b27-0013-4ae0-8935-91a089466874/image?page=1
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const pageNumber = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

    if (!chapterId) {
      return NextResponse.json({ error: 'Chapter ID is required' }, { status: 400 });
    }

    // 1. Get chapter pages info
    const chapterData = await getChapterPages(chapterId);

    if (chapterData.externalUrl) {
      return NextResponse.json(
        {
          error: 'This chapter is hosted on an external official platform',
          externalUrl: chapterData.externalUrl,
        },
        { status: 400 }
      );
    }

    if (!chapterData.pages || chapterData.pages.length === 0) {
      return NextResponse.json(
        { error: 'No pages found for this chapter' },
        { status: 404 }
      );
    }

    const pageIndex = Math.min(pageNumber - 1, chapterData.pages.length - 1);
    const targetPage = chapterData.pages[pageIndex];

    // 2. Fetch the upstream image binary with required MangaDex headers
    const upstreamRes = await fetch(targetPage.originalUrl, {
      headers: {
        'User-Agent': 'MangaWeb/1.0 (https://github.com/mangaweb)',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://mangadex.org/',
      },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image from @Home server (${upstreamRes.status})` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstreamRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Chapter-Id': chapterId,
        'X-Page-Number': String(pageIndex + 1),
        'X-Total-Pages': String(chapterData.total),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

