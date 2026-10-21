import { getOrSetCache } from './cache';
import { MangaDexChapter, ChapterPagesResponse } from './types';

const USER_AGENT = 'MangaWeb/1.0 (https://github.com/mangaweb)';

interface ComickSearchItem {
  hid: string;
  title: string;
  slug: string;
  desc?: string;
  country?: string;
}

interface ComickChapterItem {
  hid: string;
  chap: string | null;
  vol: string | null;
  title: string | null;
  lang: string;
  group_name?: string | null;
  updated_at?: string;
}

interface ComickChapterResponse {
  chapter?: {
    hid: string;
    chap: string | null;
    vol: string | null;
    title: string | null;
    images?: Array<{
      b2key?: string;
      url?: string;
      w?: number;
      h?: number;
    }>;
  };
}

/**
 * Clean a manga title for search
 */
function cleanTitleForSearch(raw: string): string {
  return raw
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Search Comick alternative API for a manga hid
 */
async function searchComickHid(titles: string[]): Promise<string | null> {
  const cacheKey = `comick:search:${titles.join(':')}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    for (const title of titles) {
      if (!title) continue;
      const clean = cleanTitleForSearch(title);
      if (!clean) continue;

      try {
        const url = `https://api.comick.dev/v1.0/search?q=${encodeURIComponent(clean)}&limit=5`;
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
        });

        if (!res.ok) continue;

        const results = (await res.json()) as ComickSearchItem[];
        if (Array.isArray(results) && results.length > 0) {
          // Find closest matching title or return first result
          const match =
            results.find(
              (r) =>
                r.title.toLowerCase().includes(clean) ||
                clean.includes(r.title.toLowerCase())
            ) || results[0];

          if (match?.hid) {
            return match.hid;
          }
        }
      } catch (err) {
        console.error(`Comick search error for "${title}":`, err);
      }
    }
    return null;
  });
}

/**
 * Fetch all chapters from Comick API
 */
async function fetchComickChapters(hid: string): Promise<MangaDexChapter[]> {
  const cacheKey = `comick:chapters:${hid}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    try {
      const url = `https://api.comick.dev/comic/${hid}/chapters?lang=en&limit=1500`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!res.ok) return [];

      const json = await res.json();
      const rawList: ComickChapterItem[] = json.chapters || [];

      return rawList.map((ch) => ({
        id: `comick-${ch.hid}`,
        chapter: ch.chap ? String(parseFloat(ch.chap)) : null,
        volume: ch.vol || null,
        title: ch.title || null,
        translatedLanguage: ch.lang || 'en',
        externalUrl: null,
        pages: 1, // Will be resolved dynamically upon reading
        publishAt: ch.updated_at || new Date().toISOString(),
        scanlationGroup: ch.group_name || 'Alternative Server (Comick)',
        sourceProvider: 'Alternative Provider (Comick)',
      }));
    } catch (err) {
      console.error('Failed to fetch Comick chapters:', err);
      return [];
    }
  });
}

/**
 * Fetch remaining / missing chapters from alternative API
 * and merge them with existing chapters.
 */
export async function getMergedWithAlternativeChapters(
  titles: string[],
  existingChapters: MangaDexChapter[] = []
): Promise<{ chapters: MangaDexChapter[]; addedCount: number }> {
  try {
    const existingNumSet = new Set<string>();
    existingChapters.forEach((c) => {
      if (c.chapter) {
        existingNumSet.add(c.chapter);
        // Also add parsed float representation for consistent matching (e.g. "1.0" == "1")
        const num = parseFloat(c.chapter);
        if (!isNaN(num)) existingNumSet.add(String(num));
      }
    });

    // 1. Search for alternative source
    const comickHid = await searchComickHid(titles);
    if (!comickHid) {
      return { chapters: existingChapters, addedCount: 0 };
    }

    // 2. Fetch full chapter catalogue from alternative provider
    const altChapters = await fetchComickChapters(comickHid);
    if (altChapters.length === 0) {
      return { chapters: existingChapters, addedCount: 0 };
    }

    // 3. Find chapters missing from MangaDex
    const missingChapters = altChapters.filter((alt) => {
      if (!alt.chapter) return false;
      const num = parseFloat(alt.chapter);
      if (isNaN(num)) return !existingNumSet.has(alt.chapter);
      return !existingNumSet.has(alt.chapter) && !existingNumSet.has(String(num));
    });

    if (missingChapters.length === 0) {
      return { chapters: existingChapters, addedCount: 0 };
    }

    // 4. Merge existing chapters with missing alternative chapters
    const combined = [...existingChapters, ...missingChapters];

    // 5. Numerical sort descending
    combined.sort((a, b) => {
      const numA = parseFloat(a.chapter || '-1');
      const numB = parseFloat(b.chapter || '-1');
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numB - numA;
    });

    return { chapters: combined, addedCount: missingChapters.length };
  } catch (err) {
    console.error('Error merging with alternative chapters:', err);
    return { chapters: existingChapters, addedCount: 0 };
  }
}

/**
 * Fetch chapter pages from alternative provider (Comick)
 */
export async function getAlternativeChapterPages(
  chapterId: string
): Promise<ChapterPagesResponse> {
  const cacheKey = `alternative:pages:${chapterId}`;
  return getOrSetCache(cacheKey, 3600, async () => {
    const cleanHid = chapterId.replace(/^comick-/, '');

    try {
      const url = `https://api.comick.dev/chapter/${cleanHid}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!res.ok) {
        return {
          chapterId,
          chapterNumber: null,
          title: null,
          volume: null,
          externalUrl: null,
          isUnavailable: true,
          errorMessage: `Alternative server returned error ${res.status}`,
          pages: [],
          total: 0,
        };
      }

      const json = (await res.json()) as ComickChapterResponse;
      const ch = json.chapter;
      const images = ch?.images || [];

      if (!ch || images.length === 0) {
        return {
          chapterId,
          chapterNumber: ch?.chap || null,
          title: ch?.title || null,
          volume: ch?.vol || null,
          externalUrl: null,
          isUnavailable: true,
          errorMessage: 'No page images found on alternative server for this chapter.',
          pages: [],
          total: 0,
        };
      }

      // Map images to proxied URLs
      const pages = images.map((img, index) => {
        const rawUrl = img.url?.startsWith('http')
          ? img.url
          : `https://meo.comick.pictures/${img.b2key}`;
        const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(rawUrl)}`;
        return {
          pageNumber: index + 1,
          url: proxiedUrl,
          originalUrl: rawUrl,
        };
      });

      return {
        chapterId,
        chapterNumber: ch.chap ? String(parseFloat(ch.chap)) : null,
        title: ch.title || null,
        volume: ch.vol || null,
        externalUrl: null,
        pages,
        total: pages.length,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        chapterId,
        chapterNumber: null,
        title: null,
        volume: null,
        externalUrl: null,
        isUnavailable: true,
        errorMessage: `Failed to connect to alternative server: ${message}`,
        pages: [],
        total: 0,
      };
    }
  });
}

