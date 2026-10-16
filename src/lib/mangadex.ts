import { getOrSetCache } from './cache';
import { ChapterPagesResponse, MangaDexChapter } from './types';

const MANGADEX_API = 'https://api.mangadex.org';
const USER_AGENT = 'MangaWeb/1.0 (https://github.com/mangaweb)';

interface MangaDexApiResponse<T> {
  result: string;
  response: string;
  data: T;
  total?: number;
}

interface MangaDexMangaItem {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    links?: {
      al?: string;
      mal?: string;
      [key: string]: string | undefined;
    };
  };
}

interface MangaDexChapterItem {
  id: string;
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    externalUrl: string | null;
    publishAt: string;
    pages: number;
  };
  relationships?: Array<{
    id: string;
    type: string;
    attributes?: {
      name?: string;
    };
  }>;
}

/**
 * Searches MangaDex to find the matching MangaDex ID for an AniList title/ID
 */
export async function resolveMangaDexId(
  anilistId: number,
  titles: string[]
): Promise<string | null> {
  const cacheKey = `mangadex:resolve:${anilistId}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    // Generate clean search candidates (removing Japanese brackets 【】, quotes, etc.)
    const candidates: string[] = [];
    for (const title of titles) {
      if (!title || !title.trim()) continue;
      candidates.push(title.trim());
      // Clean brackets, colons, subtitles
      const stripped = title
        .replace(/[【】\[\]\(\)\"\'«»]/g, ' ')
        .replace(/[:\-–—].*$/, '') // strip subtitle after colon or dash
        .trim();
      if (stripped && stripped !== title.trim()) {
        candidates.push(stripped);
      }
    }

    const uniqueCandidates = Array.from(new Set(candidates));

    for (const searchTitle of uniqueCandidates) {
      try {
        const url = `${MANGADEX_API}/manga?title=${encodeURIComponent(
          searchTitle
        )}&limit=25&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;

        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
        });

        if (!res.ok) continue;

        const json = (await res.json()) as MangaDexApiResponse<MangaDexMangaItem[]>;
        const items = json.data || [];
        if (items.length === 0) continue;

        // 1. Direct match by AniList ID in links
        const alMatch = items.find(
          (m) => m.attributes?.links?.al === String(anilistId)
        );
        if (alMatch) {
          return alMatch.id;
        }

        // 2. Exact match on title (case-insensitive)
        const lowerSearch = searchTitle.toLowerCase();
        const exactMatch = items.find((m) => {
          const titles = Object.values(m.attributes.title || {}).map((t) => t.toLowerCase());
          return titles.some((t) => t === lowerSearch);
        });
        if (exactMatch) {
          return exactMatch.id;
        }

        // 3. Match in altTitles
        const altMatch = items.find((m) => {
          const altTitles = (m.attributes.altTitles || []).flatMap((a) =>
            Object.values(a).map((v) => v.toLowerCase())
          );
          return altTitles.some((t) => t === lowerSearch);
        });
        if (altMatch) {
          return altMatch.id;
        }

        // 4. Substring similarity match
        const partialMatch = items.find((m) => {
          const titles = Object.values(m.attributes.title || {}).map((t) => t.toLowerCase());
          return titles.some((t) => t.includes(lowerSearch) || lowerSearch.includes(t));
        });
        if (partialMatch) {
          return partialMatch.id;
        }

        // 5. Fallback to top relevance item if search query was specific (>= 4 chars)
        if (searchTitle.length >= 4) {
          return items[0].id;
        }
      } catch (err) {
        console.error(`Error resolving MangaDex ID for "${searchTitle}":`, err);
      }
    }

    return null;
  });
}

/**
 * Fetch chapter feed for a manga.
 * Supports language fallback: tries English first; if 0 chapters exist in English,
 * fetches all available languages so chapters are always accessible.
 */
export async function getMangaChapters(
  mangaDexId: string,
  limit = 100,
  offset = 0,
  preferredLanguage?: string
): Promise<MangaDexChapter[]> {
  const cacheKey = `mangadex:chapters:${mangaDexId}:${limit}:${offset}:${preferredLanguage || 'auto'}`;
  return getOrSetCache(cacheKey, 900, async () => {
    const ratings =
      '&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic';

    // 1. First attempt: fetch in preferred language (default 'en')
    const langParam = preferredLanguage
      ? `&translatedLanguage[]=${encodeURIComponent(preferredLanguage)}`
      : `&translatedLanguage[]=en`;

    const url = `${MANGADEX_API}/manga/${mangaDexId}/feed?order[chapter]=desc&limit=${limit}&offset=${offset}&includes[]=scanlation_group${langParam}${ratings}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      throw new Error(`MangaDex feed error (${res.status}): ${await res.text()}`);
    }

    const json = (await res.json()) as MangaDexApiResponse<MangaDexChapterItem[]>;
    let rawChapters = json.data || [];

    // 2. Language Fallback: If 0 English chapters found, fetch all available languages
    if (rawChapters.length === 0 && (!preferredLanguage || preferredLanguage === 'en')) {
      const fallbackUrl = `${MANGADEX_API}/manga/${mangaDexId}/feed?order[chapter]=desc&limit=${limit}&offset=${offset}&includes[]=scanlation_group${ratings}`;
      try {
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (fallbackRes.ok) {
          const fallbackJson = (await fallbackRes.json()) as MangaDexApiResponse<MangaDexChapterItem[]>;
          rawChapters = fallbackJson.data || [];
        }
      } catch (err) {
        console.error('Fallback chapters fetch failed:', err);
      }
    }

    // Filter and map chapters
    const chapters: MangaDexChapter[] = rawChapters.map((item) => {
      const groupRel = item.relationships?.find((r) => r.type === 'scanlation_group');
      return {
        id: item.id,
        chapter: item.attributes.chapter,
        volume: item.attributes.volume,
        title: item.attributes.title,
        translatedLanguage: item.attributes.translatedLanguage,
        externalUrl: item.attributes.externalUrl,
        pages: item.attributes.pages,
        publishAt: item.attributes.publishAt,
        scanlationGroup: groupRel?.attributes?.name,
      };
    });

    // Sort cleanly by numerical chapter number descending
    chapters.sort((a, b) => {
      const numA = parseFloat(a.chapter || '-1');
      const numB = parseFloat(b.chapter || '-1');
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numB - numA;
    });

    return chapters;
  });
}

/**
 * Fetch chapter pages from MangaDex @Home server
 */
export async function getChapterPages(chapterId: string): Promise<ChapterPagesResponse> {
  const cacheKey = `mangadex:pages:${chapterId}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    // 1. Fetch chapter metadata
    const metaRes = await fetch(`${MANGADEX_API}/chapter/${chapterId}?includes[]=manga`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!metaRes.ok) {
      throw new Error(`Failed to fetch chapter metadata: ${metaRes.status}`);
    }

    const metaJson = await metaRes.json();
    const chapterData: MangaDexChapterItem = metaJson.data;
    const externalUrl = chapterData.attributes.externalUrl;
    const mangaRel = chapterData.relationships?.find((r) => r.type === 'manga');
    const mangaId = mangaRel?.id;

    // 2. If it is an external chapter (e.g. MangaPlus), return early with external URL
    if (externalUrl) {
      return {
        chapterId,
        chapterNumber: chapterData.attributes.chapter,
        title: chapterData.attributes.title,
        volume: chapterData.attributes.volume,
        externalUrl,
        pages: [],
        total: 0,
        mangaId,
      };
    }

    // 3. Fetch at-home server endpoint
    const atHomeRes = await fetch(`${MANGADEX_API}/at-home/server/${chapterId}`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!atHomeRes.ok) {
      throw new Error(`MangaDex @home error (${atHomeRes.status}): ${await atHomeRes.text()}`);
    }

    const atHomeJson = await atHomeRes.json();
    const baseUrl = atHomeJson.baseUrl;
    const hash = atHomeJson.chapter.hash;
    const files: string[] = atHomeJson.chapter.data || [];

    // Map to pages with proxied URLs to prevent CORS / 403 Forbidden
    const pages = files.map((filename, index) => {
      const originalUrl = `${baseUrl}/data/${hash}/${filename}`;
      const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
      return {
        pageNumber: index + 1,
        url: proxiedUrl,
        originalUrl,
      };
    });

    return {
      chapterId,
      chapterNumber: chapterData.attributes.chapter,
      title: chapterData.attributes.title,
      volume: chapterData.attributes.volume,
      externalUrl: null,
      pages,
      total: pages.length,
      mangaId,
    };
  });
}
