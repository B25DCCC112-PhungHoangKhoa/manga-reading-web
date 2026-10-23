import { getOrSetCache } from '../cache';
import { MangaDexChapter, ChapterPagesResponse } from '../types';
import { isTitleMatch, generateSearchQueries } from './matcher';

const BASE_URL = 'https://mangapill.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FALLBACK_PROXY = 'https://manga-proxy.phungvanquangdmx.workers.dev';
const DEFAULT_PROXY = (
  process.env.MANGAPILL_PROXY_URL ||
  process.env.CLOUDFLARE_PROXY_URL ||
  process.env.PROXY_URL ||
  process.env.NEXT_PUBLIC_PROXY_URL ||
  FALLBACK_PROXY
).trim();

function buildProxiedUrl(targetUrl: string): string {
  const cleanProxy = DEFAULT_PROXY.replace(/\/+$/, '');
  return `${cleanProxy}/?url=${encodeURIComponent(targetUrl)}`;
}

async function fetchMangaPill(url: string, referer = BASE_URL): Promise<Response> {
  const headers = {
    'User-Agent': USER_AGENT,
    Referer: referer,
    Accept: 'text/html,application/xhtml+xml',
  };

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
    if (res.ok) return res;
  } catch {}

  try {
    const proxiedUrl = buildProxiedUrl(url);
    const res = await fetch(proxiedUrl, { headers, signal: AbortSignal.timeout(7000) });
    if (res.ok) return res;
  } catch (err) {
    console.warn(`Proxied MangaPill fetch failed for ${url}:`, err);
  }

  return new Response('MangaPill server unreachable', { status: 523 });
}

/**
 * Search MangaPill for a manga by title
 */
export async function searchMangaPill(titles: string[]): Promise<string | null> {
  const cacheKey = `mangapill:search:v4:${titles.join(':')}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    const queries = generateSearchQueries(titles, 'en');

    for (const q of queries.slice(0, 8)) {
      if (!q || q.length < 2) continue;

      try {
        const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}`;
        const res = await fetchMangaPill(url);

        if (!res.ok) continue;

        const html = await res.text();

        // Pattern: <a href="/manga/2/one-piece" ...> ... <div ... font-semibold ...>One Piece</div>
        const regex = /href=["']\/manga\/(\d+\/([^"']+))["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(html)) !== null) {
          const mangaPath = match[1];
          const slug = (match[2] || '').replace(/[^a-z0-9]/gi, ' ');
          const innerText = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          if (isTitleMatch(innerText, titles) || isTitleMatch(slug, titles)) {
            return mangaPath;
          }
        }
      } catch (err) {
        console.error(`MangaPill search error for query "${q}":`, err);
      }
    }
    return null;
  });
}

/**
 * Fetch all chapters for a manga from MangaPill
 */
export async function getMangaPillChapters(
  mangaPath: string
): Promise<MangaDexChapter[]> {
  const cacheKey = `mangapill:chapters:v2:${mangaPath}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    try {
      const url = `${BASE_URL}/manga/${mangaPath}`;
      const res = await fetchMangaPill(url);

      if (!res.ok) return [];

      const html = await res.text();
      const chapters: MangaDexChapter[] = [];

      // Pattern: <a href="/chapters/2-11100000/one-piece-chapter-1110" ...>Chapter 1110</a>
      const regex = /href=["']\/chapters\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(html)) !== null) {
        const chapterPath = match[1];
        const content = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // Extract chapter number from text or path
        const numMatch =
          /\b(?:Chapter|Ch\.?)\s*([0-9.]+)/i.exec(content) ||
          /\b(?:Episode|Ep\.?)\s*([0-9.]+)/i.exec(content) ||
          /\b([0-9]+(?:\.[0-9]+)?)\b/.exec(content);
        const chapterNum = numMatch ? numMatch[1] : null;

        chapters.push({
          id: `mangapill-${encodeURIComponent(chapterPath)}`,
          chapter: chapterNum,
          volume: null,
          title: content.includes(':') ? content.split(':')[1].trim() : null,
          translatedLanguage: 'en',
          externalUrl: null,
          pages: 1,
          publishAt: new Date().toISOString(),
          scanlationGroup: 'MangaPill',
          sourceProvider: 'MangaPill',
        });
      }

      // Sort numerically descending
      chapters.sort((a, b) => {
        const numA = parseFloat(a.chapter || '-1');
        const numB = parseFloat(b.chapter || '-1');
        if (isNaN(numA) && isNaN(numB)) return 0;
        if (isNaN(numA)) return 1;
        if (isNaN(numB)) return -1;
        return numB - numA;
      });

      return chapters;
    } catch (err) {
      console.error('MangaPill chapters error:', err);
      return [];
    }
  });
}

/**
 * Fetch image pages for a MangaPill chapter
 */
export async function getMangaPillChapterPages(
  chapterId: string
): Promise<ChapterPagesResponse> {
  const chapterPath = decodeURIComponent(chapterId.replace(/^mangapill-/, ''));
  const cacheKey = `mangapill:pages:${chapterPath}`;

  return getOrSetCache(cacheKey, 3600, async () => {
    try {
      const url = `${BASE_URL}/chapters/${chapterPath}`;
      const res = await fetchMangaPill(url, `${BASE_URL}/`);

      if (!res.ok) {
        return {
          chapterId,
          chapterNumber: null,
          title: null,
          volume: null,
          externalUrl: null,
          isUnavailable: true,
          errorMessage: `MangaPill server returned error ${res.status}`,
          pages: [],
          total: 0,
        };
      }

      const html = await res.text();
      const imageUrls: string[] = [];

      // Extract all <img ... data-src="https://..." or src="https://...">
      const imgTagRegex = /<img\b[^>]*>/gi;
      let match: RegExpExecArray | null;

      while ((match = imgTagRegex.exec(html)) !== null) {
        const tag = match[0];
        const dataSrcMatch = /data-(?:src|original)=["']([^"']+)["']/i.exec(tag);
        const srcMatch = /src=["']([^"']+)["']/i.exec(tag);
        const src = (dataSrcMatch?.[1] || srcMatch?.[1])?.trim();

        if (
          src &&
          (src.startsWith('http://') || src.startsWith('https://')) &&
          !src.includes('logo') &&
          !src.includes('icon') &&
          !src.includes('avatar') &&
          !src.includes('banner')
        ) {
          imageUrls.push(src);
        }
      }

      if (imageUrls.length === 0) {
        return {
          chapterId,
          chapterNumber: null,
          title: null,
          volume: null,
          externalUrl: null,
          isUnavailable: true,
          errorMessage: 'No page images found on MangaPill for this chapter.',
          pages: [],
          total: 0,
        };
      }

      const pages = imageUrls.map((src, index) => {
        const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        return {
          pageNumber: index + 1,
          url: proxiedUrl,
          originalUrl: src,
        };
      });

      return {
        chapterId,
        chapterNumber: null,
        title: null,
        volume: null,
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
        errorMessage: `MangaPill connection error: ${message}`,
        pages: [],
        total: 0,
      };
    }
  });
}

