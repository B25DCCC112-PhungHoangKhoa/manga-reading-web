import { MangaDexChapter } from '../types';
import { isTitleMatch, generateSearchQueries } from './matcher';

const PROXY_URL = (
  process.env.CLOUDFLARE_PROXY_URL ||
  process.env.NEXT_PUBLIC_PROXY_URL ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_PROXY_URL ||
  process.env.PROXY_URL ||
  ''
).trim();
const BASE_URL = 'https://weebcentral.com';
const FIREFOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

const CLIENT_HEADERS = (referer = 'https://weebcentral.com'): Record<string, string> => ({
  'User-Agent': FIREFOX_UA,
  'HX-Request': 'true',
  Referer: referer,
  Accept: 'text/html, */*; q=0.01',
});

function buildUrl(target: string): string {
  if (!PROXY_URL) return target;
  const cleanProxy = PROXY_URL.replace(/\/+$/, '');
  return `${cleanProxy}/?url=${encodeURIComponent(target)}`;
}

/**
 * Client-side search on WeebCentral to resolve series ID.
 * Runs directly in user's browser via CORS proxy to bypass Vercel datacenter IP blocks.
 */
export async function searchWeebcentralClient(titles: string[]): Promise<string | null> {
  const candidateQueries = generateSearchQueries(titles, 'en');

  for (const q of candidateQueries.slice(0, 8)) {
    if (!q || q.length < 2) continue;

    try {
      const searchUrl = buildUrl(
        `${BASE_URL}/search/data?text=${encodeURIComponent(
          q
        )}&limit=10&offset=0&sort=Best+Match&order=Descending&official=Any&anime=Any&adult=Any&display_mode=Full+Display`
      );

      const res = await fetch(searchUrl, {
        headers: CLIENT_HEADERS('https://weebcentral.com/search'),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        continue;
      }

      const html = await res.text();

      // Pattern: Match /series/ID/slug links
      const regex =
        /href=["'](?:https:\/\/weebcentral\.com)?\/series\/([A-Z0-9]+)(\/[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(html)) !== null) {
        const id = match[1];
        const slug = (match[2] || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
        const innerText = match[3]
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (isTitleMatch(innerText, titles) || isTitleMatch(slug, titles)) {
          return id;
        }
      }
    } catch (err) {
      console.warn('Client WeebCentral search failed for query:', q, err);
    }
  }

  return null;
}

/**
 * Fetch full chapter list for a WeebCentral series ID from browser.
 */
export async function fetchWeebcentralChaptersForSeriesClient(
  seriesId: string
): Promise<MangaDexChapter[]> {
  try {
    const chaptersUrl = buildUrl(`${BASE_URL}/series/${seriesId}/full-chapter-list`);
    const res = await fetch(chaptersUrl, {
      headers: CLIENT_HEADERS(`${BASE_URL}/series/${seriesId}`),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const chapters: MangaDexChapter[] = [];

    // Pattern: <a href=".../chapters/([A-Z0-9]+)" ...> ... <span>Chapter 1122</span> ...
    const regex =
      /href=["'](?:https:\/\/weebcentral\.com)?\/chapters\/([A-Z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const chapterId = match[1];
      const content = match[2];

      const cleanText = content
        .replace(/<time[\s\S]*?<\/time>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const numMatch =
        /\b(?:Chapter|Ch\.?)\s*([0-9.]+)/i.exec(cleanText) ||
        /\b(?:Episode|Ep\.?)\s*([0-9.]+)/i.exec(cleanText) ||
        /\b([0-9]+(?:\.[0-9]+)?)\b/.exec(cleanText);
      const chapterNum = numMatch ? numMatch[1] : null;

      let title: string | null = null;
      if (cleanText.includes(':')) {
        title = cleanText.split(':')[1].trim();
      } else if (cleanText.includes(' - ')) {
        title = cleanText.split(' - ')[1].trim();
      }

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
    console.error('fetchWeebcentralChaptersForSeriesClient error:', err);
    return [];
  }
}

/**
 * End-to-end client-side chapter scraper for WeebCentral.
 */
export async function fetchWeebcentralClientSide(
  titles: string[]
): Promise<MangaDexChapter[]> {
  try {
    const seriesId = await searchWeebcentralClient(titles);
    if (!seriesId) return [];
    return await fetchWeebcentralChaptersForSeriesClient(seriesId);
  } catch (err) {
    console.error('fetchWeebcentralClientSide error:', err);
    return [];
  }
}

/**
 * Extract chapter image pages client-side from browser for WeebCentral.
 */
export async function fetchWeebcentralChapterPagesClient(
  chapterId: string
): Promise<{ pageNumber: number; url: string; originalUrl: string }[]> {
  try {
    const cleanId = chapterId.replace(/^weebcentral-/, '');
    const candidateUrls = [
      buildUrl(
        `${BASE_URL}/chapters/${cleanId}/images?is_prev=False&current_page=1&reading_style=long_strip`
      ),
      buildUrl(`${BASE_URL}/chapters/${cleanId}`),
    ];

    let html = '';
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: CLIENT_HEADERS(`${BASE_URL}/chapters/${cleanId}`),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const text = await res.text();
          if (text.includes('<img')) {
            html = text;
            break;
          }
        }
      } catch {}
    }

    if (!html) return [];

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
        !src.includes('banner') &&
        !src.includes('broken_image')
      ) {
        imageUrls.push(src);
      }
    }

    if (imageUrls.length === 0) return [];

    return imageUrls.map((src, index) => ({
      pageNumber: index + 1,
      url: `/api/image-proxy?url=${encodeURIComponent(src)}`,
      originalUrl: src,
    }));
  } catch (err) {
    console.error('fetchWeebcentralChapterPagesClient error:', err);
    return [];
  }
}

