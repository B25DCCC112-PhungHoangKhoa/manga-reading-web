import { NextRequest, NextResponse } from 'next/server';
import { getMangaById } from '@/lib/anilist';
import { getMangaChapters, resolveMangaDexId } from '@/lib/mangadex';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let mangadexId: string | null = null;

    // Check if ID is UUID (direct MangaDex ID) or integer (AniList ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      mangadexId = id;
    } else {
      const anilistId = parseInt(id, 10);
      if (isNaN(anilistId)) {
        return NextResponse.json({ success: false, error: 'Invalid manga ID' }, { status: 400 });
      }

      // Check if mangadexId passed as query parameter
      const explicitMangaDexId = searchParams.get('mangadexId');
      if (explicitMangaDexId) {
        mangadexId = explicitMangaDexId;
      } else {
        const manga = await getMangaById(anilistId);
        if (!manga) {
          return NextResponse.json({ success: false, error: 'Manga not found' }, { status: 404 });
        }
        const titles = [
          manga.title.english,
          manga.title.romaji,
          manga.title.native,
        ].filter(Boolean) as string[];

        mangadexId = await resolveMangaDexId(anilistId, titles);
      }
    }

    if (!mangadexId) {
      return NextResponse.json({
        success: true,
        data: [],
        mangadexId: null,
        message: 'No MangaDex mapping found for this manga',
      });
    }

    const chapters = await getMangaChapters(mangadexId, limit, offset);

    return NextResponse.json({
      success: true,
      data: chapters,
      mangadexId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

