import { getOrSetCache } from '../cache';
import { MangaDexChapter, ChapterPagesResponse } from '../types';
import { isTitleMatch, generateSearchQueries } from './matcher';

const BASE_URL = 'https://weebcentral.com';
const FIREFOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

const BASE_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': FIREFOX_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  DNT: '1',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

const HTMX_HEADERS = (referer: string): Record<string, string> => ({
  ...BASE_BROWSER_HEADERS,
  'HX-Request': 'true',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  Accept: 'text/html, */*; q=0.01',
  Referer: referer,
});

function cleanTitle(raw: string): string {
  return raw
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();
}

const FALLBACK_PROXY = 'https://manga-proxy.phungvanquangdmx.workers.dev';
const DEFAULT_PROXY = (
  process.env.WEEBCENTRAL_PROXY_URL ||
  process.env.CLOUDFLARE_PROXY_URL ||
  process.env.PROXY_URL ||
  process.env.NEXT_PUBLIC_PROXY_URL ||
  FALLBACK_PROXY
).trim();

function buildProxiedUrl(targetUrl: string): string {
  const cleanProxy = DEFAULT_PROXY.replace(/\/+$/, '');
  return `${cleanProxy}/?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Resilient fetcher for WeebCentral endpoints.
 * Routes through Cloudflare worker proxy to bypass Vercel datacenter blocks.
 * OMITTING 'Accept-Encoding' is critical: allows Node.js/undici to auto-decompress
 * the stream instead of receiving raw compressed Brotli/gzip binary bytes.
 */
async function fetchWeebcentral(url: string, referer: string): Promise<Response> {
  // 1. Direct fetch (best if running on residential connection or local dev)
  try {
    const res = await fetch(url, {
      headers: HTMX_HEADERS(referer),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      return res;
    }
  } catch {}

  // 2. Cloudflare worker proxy fallback
  try {
    const proxiedUrl = buildProxiedUrl(url);
    const res = await fetch(proxiedUrl, {
      headers: HTMX_HEADERS(referer),
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      return res;
    }
  } catch (err) {
    console.warn(`Proxied WeebCentral fetch failed for ${url}:`, err);
  }

  // Fast fail response instead of hanging indefinitely
  return new Response('WeebCentral server unreachable', {
    status: 523,
    statusText: 'Origin Unreachable',
  });
}

/**
 * Search WeebCentral for a manga by title
 */
export async function searchWeebcentral(titles: string[]): Promise<string | null> {
  const cacheKey = `weebcentral:search:v5:${titles.join(':')}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    const queries = generateSearchQueries(titles, 'en');

    for (const q of queries.slice(0, 8)) {
      if (!q || q.length < 2) continue;

      try {
        const url = `${BASE_URL}/search/data?text=${encodeURIComponent(
          q
        )}&limit=10&offset=0&sort=Best+Match&order=Descending&official=Any&anime=Any&adult=Any&display_mode=Full+Display`;

        const res = await fetchWeebcentral(url, `${BASE_URL}/search`);

        if (!res.ok) {
          continue;
        }

        const html = await res.text();

        // Pattern: Match /series/ID/slug links
        const regex = /href=["'](?:https:\/\/weebcentral\.com)?\/series\/([A-Z0-9]+)(\/[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(html)) !== null) {
          const id = match[1];
          const slug = (match[2] || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
          const innerText = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          if (isTitleMatch(innerText, titles) || isTitleMatch(slug, titles)) {
            return id;
          }
        }
      } catch (err) {
        console.error(`WeebCentral search error for "${q}":`, err);
      }
    }
    return null;
  });
}

/**
 * Fetch all chapters for a manga from WeebCentral
 */
export async function getWeebcentralChapters(
  mangaId: string
): Promise<MangaDexChapter[]> {
  const cacheKey = `weebcentral:chapters:v2:${mangaId}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    try {
      const url = `${BASE_URL}/series/${mangaId}/full-chapter-list`;
      const res = await fetchWeebcentral(url, `${BASE_URL}/series/${mangaId}`);

      if (!res.ok) {
        console.error(`WeebCentral chapters error for "${mangaId}": HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      const chapters: MangaDexChapter[] = [];

      // Pattern: <a href=".../chapters/([A-Z0-9]+)" ...> ... <span>Chapter 1122</span> ...
      const regex = /href=["'](?:https:\/\/weebcentral\.com)?\/chapters\/([A-Z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(html)) !== null) {
        const chapterId = match[1];
        const content = match[2];

        // Clean text content by removing time tags and other HTML tags to prevent matching CSS classes
        const cleanText = content
          .replace(/<time[\s\S]*?<\/time>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Extract chapter number: look for Chapter / Ch. first, then Episode, then any standalone number
        const numMatch =
          /\b(?:Chapter|Ch\.?)\s*([0-9.]+)/i.exec(cleanText) ||
          /\b(?:Episode|Ep\.?)\s*([0-9.]+)/i.exec(cleanText) ||
          /\b([0-9]+(?:\.[0-9]+)?)\b/.exec(cleanText);
        const chapterNum = numMatch ? numMatch[1] : null;

        // Extract chapter title if present
        let title: string | null = null;
        if (cleanText.includes(':')) {
          title = cleanText.split(':')[1].trim();
        } else if (cleanText.includes(' - ')) {
          title = cleanText.split(' - ')[1].trim();
        }

        // Extract date if present
        const timeMatch = /datetime=["']([^"']+)["']/i.exec(content);
        const publishAt = timeMatch ? timeMatch[1] : new Date().toISOString();

        chapters.push({
          id: `weebcentral-${chapterId}`,
          chapter: chapterNum,
          volume: null,
          title,
          translatedLanguage: 'en',
          externalUrl: null,
          pages: 1,
          publishAt,
          scanlationGroup: 'WeebCentral',
          sourceProvider: 'WeebCentral',
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
      console.error('WeebCentral chapters error:', err);
      return [];
    }
  });
}

/**
 * Fetch image pages for a WeebCentral chapter
 */
export async function getWeebcentralChapterPages(
  chapterId: string
): Promise<ChapterPagesResponse> {
  const cleanId = chapterId.replace(/^weebcentral-/, '');
  const cacheKey = `weebcentral:pages:${cleanId}`;

  return getOrSetCache(cacheKey, 3600, async () => {
    try {
      let html = '';
      const url = `${BASE_URL}/chapters/${cleanId}/images?is_prev=False&current_page=1&reading_style=long_strip`;
      const res = await fetchWeebcentral(url, `${BASE_URL}/chapters/${cleanId}`);

      if (res.ok) {
        html = await res.text();
      } else {
        // Fallback: try direct chapter reader page
        const fallbackRes = await fetchWeebcentral(`${BASE_URL}/chapters/${cleanId}`, `${BASE_URL}/`);
        if (fallbackRes.ok) {
          html = await fallbackRes.text();
        } else {
          return {
            chapterId,
            chapterNumber: null,
            title: null,
            volume: null,
            externalUrl: null,
            isUnavailable: true,
            errorMessage: `WeebCentral server returned error ${res.status}`,
            pages: [],
            total: 0,
          };
        }
      }

      const imageUrls: string[] = [];
      const imgTagRegex = /<img\b[^>]*>/gi;
      let imgMatch: RegExpExecArray | null;

      while ((imgMatch = imgTagRegex.exec(html)) !== null) {
        const tag = imgMatch[0];
        const dataSrcMatch = /data-(?:src|original)=["']([^"']+)["']/i.exec(tag);
        const srcMatch = /src=["']([^"']+)["']/i.exec(tag);
        const src = (dataSrcMatch?.[1] || srcMatch?.[1])?.trim();

        if (
          src &&
          (src.startsWith('http://') || src.startsWith('https://')) &&
          !src.includes('logo') &&
          !src.includes('avatar') &&
          !src.includes('icon') &&
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
          errorMessage: 'No page images found on WeebCentral for this chapter.',
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
        errorMessage: `WeebCentral connection error: ${message}`,
        pages: [],
        total: 0,
      };
    }
  });
}

