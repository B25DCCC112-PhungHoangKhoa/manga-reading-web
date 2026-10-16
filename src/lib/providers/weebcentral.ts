import { getOrSetCache } from '../cache';
import { MangaDexChapter, ChapterPagesResponse } from '../types';

const BASE_URL = 'https://weebcentral.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function cleanTitle(raw: string): string {
  return raw
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Search WeebCentral for a manga by title
 */
export async function searchWeebcentral(titles: string[]): Promise<string | null> {
  const cacheKey = `weebcentral:search:${titles.join(':')}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    for (const title of titles) {
      if (!title) continue;
      const q = cleanTitle(title);
      if (!q) continue;

      try {
        const url = `${BASE_URL}/search/data?text=${encodeURIComponent(
          q
        )}&limit=10&offset=0&sort=Best+Match&order=Descending&official=Any&anime=Any&adult=Any&display_mode=Full+Display`;

        const res = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: 'https://google.com',
            Accept: '*/*',
          },
        });

        if (!res.ok) continue;

        const html = await res.text();

        // Extract series ID and title from HTML: href="https://weebcentral.com/series/01JEXZK546WKQ91SNBTXYPT3VN"
        // or /series/01JEXZK546WKQ91SNBTXYPT3VN
        const regex = /href=["'](?:https:\/\/weebcentral\.com)?\/series\/([A-Z0-9]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(html)) !== null) {
          const id = match[1];
          const innerText = match[2].replace(/<[^>]*>/g, '').trim().toLowerCase();

          if (innerText.includes(q) || q.includes(innerText)) {
            return id;
          }
        }

        // If no exact title match found, pick the first series link if present
        const fallbackMatch = /href=["'](?:https:\/\/weebcentral\.com)?\/series\/([A-Z0-9]+)/i.exec(html);
        if (fallbackMatch?.[1]) {
          return fallbackMatch[1];
        }
      } catch (err) {
        console.error(`WeebCentral search error for "${title}":`, err);
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
  const cacheKey = `weebcentral:chapters:${mangaId}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    try {
      const url = `${BASE_URL}/series/${mangaId}/full-chapter-list`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: `${BASE_URL}/series/${mangaId}`,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const chapters: MangaDexChapter[] = [];

      // Pattern: <a href=".../chapters/([A-Z0-9]+)" ...> ... <span>Chapter 1122</span> ...
      const regex = /href=["'](?:https:\/\/weebcentral\.com)?\/chapters\/([A-Z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(html)) !== null) {
        const chapterId = match[1];
        const content = match[2];

        // Extract chapter number
        const numMatch = /(?:Chapter|Ch\.)?\s*([0-9.]+)/i.exec(content);
        const chapterNum = numMatch ? numMatch[1] : null;

        // Extract date if present
        const timeMatch = /datetime=["']([^"']+)["']/i.exec(content);
        const publishAt = timeMatch ? timeMatch[1] : new Date().toISOString();

        chapters.push({
          id: `weebcentral-${chapterId}`,
          chapter: chapterNum,
          volume: null,
          title: null,
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
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: `${BASE_URL}/chapters/${cleanId}`,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (res.ok) {
        html = await res.text();
      } else {
        // Fallback: try direct chapter reader page
        const fallbackRes = await fetch(`${BASE_URL}/chapters/${cleanId}`, {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: `${BASE_URL}/`,
            Accept: 'text/html,application/xhtml+xml',
          },
        });
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

