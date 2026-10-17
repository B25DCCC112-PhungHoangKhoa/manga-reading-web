import { NextRequest, NextResponse } from 'next/server';
import { getMangaById } from '@/lib/anilist';
import { resolveMangaDexId, getMangaChapters } from '@/lib/mangadex';
import {
  getCompleteChaptersAcrossProviders,
  getNettruyenChapters,
} from '@/lib/providers';
import { MangaDexChapter } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get('mangaId');
    const explicitProvider = searchParams.get('provider') as
      | 'all'
      | 'mangadex'
      | 'weebcentral'
      | 'mangapill'
      | 'nettruyen'
      | null;

    let chapters: MangaDexChapter[] = [];

    // 1. If mangaId is provided
    if (mangaId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mangaId);

      if (isUuid) {
        chapters = await getMangaChapters(mangaId, 500);
      } else {
        const anilistId = parseInt(mangaId, 10);
        if (!isNaN(anilistId)) {
          const manga = await getMangaById(anilistId);
          if (manga) {
            const titles = [
              manga.title.english,
              manga.title.romaji,
              manga.title.native,
              ...(manga.synonyms || []),
            ].filter(Boolean) as string[];

            const mangadexId = await resolveMangaDexId(anilistId, titles);
            const provider =
              explicitProvider ||
              (chapterId.startsWith('nettruyen-')
                ? 'nettruyen'
                : chapterId.startsWith('weebcentral-')
                ? 'weebcentral'
                : chapterId.startsWith('mangapill-')
                ? 'mangapill'
                : 'all');

            chapters = await getCompleteChaptersAcrossProviders(
              mangadexId,
              titles,
              provider
            );
          }
        }
      }
    }

    // 2. Fallback: If no chapters found and chapterId has a known prefix (e.g. NetTruyen)
    if (chapters.length === 0 && chapterId.startsWith('nettruyen-')) {
      const cleanId = chapterId.replace(/^nettruyen-/, '');
      const [comicSlug] = cleanId.split('__');
      if (comicSlug) {
        chapters = await getNettruyenChapters(comicSlug);
      }
    }

    // 3. Find current, next, and previous chapter
    let currentIndex = chapters.findIndex((c) => c.id === chapterId);

    // Fallback: match by chapter number if id didn't match exactly
    if (currentIndex === -1) {
      const currentNumMatch =
        chapterId.match(/(?:chuong|chapter)-(\d+(?:\.\d+)?)/i) ||
        chapterId.match(/(\d+(?:\.\d+)?)$/);
      if (currentNumMatch?.[1]) {
        const targetNum = currentNumMatch[1];
        currentIndex = chapters.findIndex(
          (c) => c.chapter === targetNum || parseFloat(c.chapter || '-1') === parseFloat(targetNum)
        );
      }
    }

    let prevChapter: MangaDexChapter | null = null;
    let nextChapter: MangaDexChapter | null = null;

    if (chapters.length > 0 && currentIndex !== -1) {
      const firstNum = parseFloat(chapters[0]?.chapter || '0');
      const lastNum = parseFloat(chapters[chapters.length - 1]?.chapter || '0');
      const isDescending = firstNum >= lastNum;

      nextChapter = isDescending
        ? (currentIndex > 0 ? chapters[currentIndex - 1] : null)
        : (currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null);

      prevChapter = isDescending
        ? (currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null)
        : (currentIndex > 0 ? chapters[currentIndex - 1] : null);
    }

    const simpleChapters = chapters.map((c) => ({
      id: c.id,
      chapter: c.chapter,
      title: c.title,
      translatedLanguage: c.translatedLanguage,
      externalUrl: c.externalUrl,
    }));

    return NextResponse.json({
      success: true,
      currentChapterId: chapterId,
      currentIndex,
      totalChapters: chapters.length,
      prevChapter: prevChapter
        ? {
            id: prevChapter.id,
            chapter: prevChapter.chapter,
            title: prevChapter.title,
            externalUrl: prevChapter.externalUrl,
          }
        : null,
      nextChapter: nextChapter
        ? {
            id: nextChapter.id,
            chapter: nextChapter.chapter,
            title: nextChapter.title,
            externalUrl: nextChapter.externalUrl,
          }
        : null,
      chapters: simpleChapters,
    });
  } catch (err: unknown) {
    console.error('Error getting chapter navigation:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

