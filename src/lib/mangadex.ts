import { getOrSetCache } from './cache';
import { ChapterPagesResponse, MangaDexChapter, AniListManga } from './types';
import {
  getAlternativeChapterPages,
  getMergedWithAlternativeChapters,
} from './fallbackManga';

export { getAlternativeChapterPages, getMergedWithAlternativeChapters };

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
 * Searches MangaDex to find all legitimate editions (Standard, Colored, etc.) for a title
 */
export async function getMangaEditions(
  anilistId: number,
  titles: string[]
): Promise<Array<{ id: string; title: string; isColored?: boolean }>> {
  const cacheKey = `mangadex:editions:${anilistId}:v3`;
  return getOrSetCache(cacheKey, 86400, async () => {
    const mainTitle = titles[0] || '';
    if (!mainTitle.trim()) return [];

    const cleanTitle = mainTitle
      .replace(/[【】\[\]\(\)\"\'«»]/g, ' ')
      .replace(/[:\-–—].*$/, '')
      .trim();

    try {
      // Query both the base title AND explicitly search for colored edition
      const [mainRes, coloredRes] = await Promise.all([
        fetch(
          `${MANGADEX_API}/manga?title=${encodeURIComponent(
            cleanTitle
          )}&limit=25&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`,
          { headers: { 'User-Agent': USER_AGENT } }
        ),
        fetch(
          `${MANGADEX_API}/manga?title=${encodeURIComponent(
            cleanTitle + ' Colored'
          )}&limit=5&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`,
          { headers: { 'User-Agent': USER_AGENT } }
        ),
      ]);

      const mainJson = mainRes.ok ? await mainRes.json() : { data: [] };
      const coloredJson = coloredRes.ok ? await coloredRes.json() : { data: [] };

      const allItems = [...(mainJson.data || []), ...(coloredJson.data || [])];
      const seen = new Set<string>();
      const items = allItems.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      const editions: Array<{ id: string; title: string; isColored?: boolean }> = [];
      const lowerClean = cleanTitle.toLowerCase();

      for (const item of items) {
        const titleVal =
          Object.values(item.attributes.title || {})[0] ||
          Object.values(item.attributes.altTitles?.[0] || {})[0] ||
          '';
        const itemTitle = String(titleVal);

        const lowerItem = itemTitle.toLowerCase();

        // Skip doujinshis / parody / omake
        if (
          lowerItem.includes('doujinshi') ||
          lowerItem.includes('hentai') ||
          lowerItem.includes('omake') ||
          lowerItem.includes('academy') ||
          lowerItem.includes('cursed')
        ) {
          continue;
        }

        const isAlMatch = item.attributes?.links?.al === String(anilistId);
        const isColored = lowerItem.includes('color');
        const isTitleMatch = lowerItem.includes(lowerClean);

        if (isAlMatch || isColored || isTitleMatch) {
          editions.push({
            id: item.id,
            title: itemTitle,
            isColored,
          });
        }
      }

      // Hardcoded fallback for One Piece if missing
      if (
        (cleanTitle.toLowerCase() === 'one piece' || anilistId === 30013) &&
        !editions.some((e) => e.id === 'a2c1d849-af05-4bbc-b2a7-866ebb10331f')
      ) {
        editions.push({
          id: 'a2c1d849-af05-4bbc-b2a7-866ebb10331f',
          title: 'One Piece (Official Colored)',
          isColored: true,
        });
      }

      return editions.slice(0, 6);
    } catch (err) {
      console.error('Error fetching manga editions:', err);
      return [];
    }
  });
}

/**
 * Checks if a manga has at least 1 chapter available on MangaDex
 */
export async function isMangaAvailable(
  anilistId: number,
  titles: string[]
): Promise<boolean> {
  const cacheKey = `mangadex:available:${anilistId}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    try {
      const mangadexId = await resolveMangaDexId(anilistId, titles);
      if (!mangadexId) return false;

      const feedUrl = `${MANGADEX_API}/manga/${mangadexId}/feed?limit=1&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return false;
      const json = await res.json();
      const total = json.total || json.data?.length || 0;
      return total > 0;
    } catch {
      return false;
    }
  });
}

/**
 * Filters an AniList manga list, completely removing any titles that have 0 chapters on MangaDex
 */
export async function filterAvailableManga(
  list: AniListManga[]
): Promise<AniListManga[]> {
  if (!list || list.length === 0) return [];

  const checks = await Promise.all(
    list.map(async (m) => {
      const titles = [m.title.english, m.title.romaji, m.title.native].filter(Boolean) as string[];
      const available = await isMangaAvailable(m.id, titles);
      return available ? m : null;
    })
  );

  return checks.filter(Boolean) as AniListManga[];
}

/**
 * Fetch chapter feed for a manga.
 * Supports language fallback: tries English first; if 0 chapters exist in English,
 * fetches all available languages so chapters are always accessible.
 */
export async function getMangaChapters(
  mangaDexId: string,
  limit = 500,
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

    // Paginate through remaining chapters if total > 500
    const total = json.total || rawChapters.length;
    if (total > rawChapters.length && rawChapters.length >= 500 && offset === 0) {
      const remainingBatches = Math.min(Math.ceil((total - rawChapters.length) / 500), 5); // Up to 3000 chapters
      for (let i = 1; i <= remainingBatches; i++) {
        try {
          const nextOffset = i * 500;
          const nextUrl = `${MANGADEX_API}/manga/${mangaDexId}/feed?order[chapter]=desc&limit=500&offset=${nextOffset}&includes[]=scanlation_group${langParam}${ratings}`;
          const nextRes = await fetch(nextUrl, { headers: { 'User-Agent': USER_AGENT } });
          if (nextRes.ok) {
            const nextJson = (await nextRes.json()) as MangaDexApiResponse<MangaDexChapterItem[]>;
            if (nextJson.data && nextJson.data.length > 0) {
              rawChapters.push(...nextJson.data);
            } else {
              break;
            }
          }
        } catch {
          break;
        }
      }
    }

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
        sourceProvider: 'MangaDex',
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
 * Fetch chapter pages from MangaDex @Home server or alternative fallback server
 */
export async function getChapterPages(chapterId: string): Promise<ChapterPagesResponse> {
  // 0. If the chapter is from the alternative provider, load directly from alternative server
  if (chapterId.startsWith('comick-') || chapterId.startsWith('fallback-')) {
    return getAlternativeChapterPages(chapterId);
  }

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
    try {
      const atHomeRes = await fetch(`${MANGADEX_API}/at-home/server/${chapterId}`, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!atHomeRes.ok) {
        return {
          chapterId,
          chapterNumber: chapterData.attributes.chapter,
          title: chapterData.attributes.title,
          volume: chapterData.attributes.volume,
          externalUrl: null,
          isUnavailable: true,
          errorMessage:
            atHomeRes.status === 404
              ? 'The image files for this upload have been removed from MangaDex servers (likely due to a publisher copyright takedown).'
              : `MangaDex @Home server returned error ${atHomeRes.status}`,
          pages: [],
          total: 0,
          mangaId,
        };
      }

      const atHomeJson = await atHomeRes.json();
      const baseUrl = atHomeJson.baseUrl;
      const hash = atHomeJson.chapter?.hash;
      const files: string[] = atHomeJson.chapter?.data || [];

      if (!baseUrl || !hash || files.length === 0) {
        return {
          chapterId,
          chapterNumber: chapterData.attributes.chapter,
          title: chapterData.attributes.title,
          volume: chapterData.attributes.volume,
          externalUrl: null,
          isUnavailable: true,
          errorMessage: 'No page images available in this chapter release.',
          pages: [],
          total: 0,
          mangaId,
        };
      }

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        chapterId,
        chapterNumber: chapterData.attributes.chapter,
        title: chapterData.attributes.title,
        volume: chapterData.attributes.volume,
        externalUrl: null,
        isUnavailable: true,
        errorMessage: `Failed to connect to MangaDex @Home: ${message}`,
        pages: [],
        total: 0,
        mangaId,
      };
    }
  });
}
