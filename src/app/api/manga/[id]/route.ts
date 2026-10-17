import { NextRequest, NextResponse } from 'next/server';
import { getMangaById } from '@/lib/anilist';
import { resolveMangaDexId, getMangaDexAltTitles } from '@/lib/mangadex';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const anilistId = parseInt(id, 10);

    if (isNaN(anilistId)) {
      return NextResponse.json({ success: false, error: 'Invalid manga ID' }, { status: 400 });
    }

    const manga = await getMangaById(anilistId);
    if (!manga) {
      return NextResponse.json({ success: false, error: 'Manga not found' }, { status: 404 });
    }

    // Resolve MangaDex ID using AniList titles
    const titles = [
      manga.title.english,
      manga.title.romaji,
      manga.title.native,
      ...(manga.synonyms || []),
    ].filter(Boolean) as string[];

    const mangadexId = await resolveMangaDexId(manga.id, titles);
    let allTitles = titles;
    if (mangadexId) {
      const mdTitles = await getMangaDexAltTitles(mangadexId);
      allTitles = Array.from(new Set([...titles, ...mdTitles]));
    }

    return NextResponse.json({
      success: true,
      data: {
        manga,
        mangadexId,
        allTitles,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

