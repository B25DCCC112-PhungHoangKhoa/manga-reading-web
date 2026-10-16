import { NextRequest, NextResponse } from 'next/server';
import { getMangaById } from '@/lib/anilist';
import {
  getMangaChapters,
  resolveMangaDexId,
  getMangaEditions,
  getCompleteChaptersAcrossProviders,
} from '@/lib/mangadex';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const language = searchParams.get('lang') || undefined;

    let mangadexId: string | null = null;
    let editions: Array<{ id: string; title: string; isColored?: boolean }> = [];
    let titles: string[] = [];

    // Check if ID is UUID (direct MangaDex ID) or integer (AniList ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      mangadexId = id;
    } else {
      const anilistId = parseInt(id, 10);
      if (isNaN(anilistId)) {
        return NextResponse.json({ success: false, error: 'Invalid manga ID' }, { status: 400 });
      }

      const manga = await getMangaById(anilistId);
      if (!manga) {
        return NextResponse.json({ success: false, error: 'Manga not found' }, { status: 404 });
      }

      titles = [
        manga.title.english,
        manga.title.romaji,
        manga.title.native,
      ].filter(Boolean) as string[];

      // Check if explicit edition/mangadexId requested
      const explicitMangaDexId = searchParams.get('mangadexId');
      if (explicitMangaDexId) {
        mangadexId = explicitMangaDexId;
      } else {
        mangadexId = await resolveMangaDexId(anilistId, titles);
      }

      // Discover companion editions (e.g. Colored edition with full in-app chapters)
      editions = await getMangaEditions(anilistId, titles);
    }

    const provider = (searchParams.get('provider') as 'all' | 'mangadex' | 'weebcentral' | 'mangapill') || 'mangadex';

    const chapters = await getCompleteChaptersAcrossProviders(mangadexId, titles, provider);

    return NextResponse.json({
      success: true,
      data: chapters,
      mangadexId,
      editions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
