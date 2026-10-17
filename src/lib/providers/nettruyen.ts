import { getOrSetCache } from '../cache';
import { MangaDexChapter, ChapterPagesResponse } from '../types';

const BASE_URL = 'https://nettruyenar.com';
const FALLBACK_SEARCH_URL = 'https://nettruyenww.com';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface NetTruyenMatch {
  comicSlug: string;
  comicId: string;
  title: string;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/[【】\[\]\(\)\"\'«»]/g, ' ')
    .replace(/[:\-–—].*$/, '')
    .trim();
}

/**
 * Searches NetTruyen for a manga matching any of the given titles.
 */
export async function searchNettruyen(
  titles: string[]
): Promise<NetTruyenMatch | null> {
  const cacheKey = `nettruyen:search:v1:${titles.join(':')}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    for (const rawTitle of titles) {
      if (!rawTitle) continue;
      const q = cleanTitle(rawTitle);
      if (!q || q.length < 2) continue;

      try {
        const searchUrl = `${FALLBACK_SEARCH_URL}/tim-truyen?keyword=${encodeURIComponent(q)}`;
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: `${FALLBACK_SEARCH_URL}/`,
            Accept: 'text/html,application/xhtml+xml',
          },
        });

        if (!res.ok) continue;

        const html = await res.text();

        // Pattern for NetTruyen manga cards: /truyen-tranh/{slug}-{id}
        const regex =
          /<a[^>]+href=["'](?:https?:\/\/[^"']+)?\/truyen-tranh\/([a-z0-9-]+)-(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;

        const lowerQ = q.toLowerCase();
        let firstCandidate: NetTruyenMatch | null = null;

        while ((match = regex.exec(html)) !== null) {
          const slug = match[1];
          const id = match[2];
          const innerText = match[3].replace(/<[^>]*>/g, '').trim();

          // Avoid chapter sublinks or navigation links
          if (!innerText || slug.includes('chapter') || innerText.toLowerCase().includes('chapter')) {
            continue;
          }

          const candidate: NetTruyenMatch = {
            comicSlug: slug,
            comicId: id,
            title: innerText,
          };

          if (!firstCandidate) {
            firstCandidate = candidate;
          }

          const lowerText = innerText.toLowerCase();
          if (lowerText.includes(lowerQ) || lowerQ.includes(lowerText)) {
            return candidate;
          }
        }

        if (firstCandidate) {
          return firstCandidate;
        }
      } catch (err) {
        console.error(`NetTruyen search error for "${rawTitle}":`, err);
      }
    }

    return null;
  });
}

/**
 * Fetches the full chapter list for a manga from NetTruyen.
 * Uses NetTruyen's fast Ajax endpoint, with fallback to HTML parsing.
 */
export async function getNettruyenChapters(
  comicSlug: string,
  comicId: string
): Promise<MangaDexChapter[]> {
  const cacheKey = `nettruyen:chapters:v1:${comicSlug}:${comicId}`;
  return getOrSetCache(cacheKey, 900, async () => {
    try {
      // 1. Primary: NetTruyen's official JSON ChapterList Ajax service
      const ajaxUrl = `${BASE_URL}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(
        comicSlug
      )}&comicId=${encodeURIComponent(comicId)}`;

      const ajaxRes = await fetch(ajaxUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: `${BASE_URL}/truyen-tranh/${comicSlug}-${comicId}`,
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json, text/javascript, */*; q=0.01',
        },
      });

      if (ajaxRes.ok) {
        const json = await ajaxRes.json().catch(() => null);
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const chapters: MangaDexChapter[] = json.data.map(
            (item: {
              chapter_id: number | string;
              chapter_slug: string;
              chapter_name: string;
              chapter_num?: number;
              updated_at?: string;
              image_num?: number;
            }) => {
              const numStr =
                item.chapter_num !== undefined && item.chapter_num !== null
                  ? String(item.chapter_num)
                  : item.chapter_name.match(/(\d+(\.\d+)?)/)?.[1] || null;

              return {
                id: `nettruyen-${comicSlug}__${item.chapter_slug}__${item.chapter_id}`,
                chapter: numStr,
                volume: null,
                title: item.chapter_name,
                translatedLanguage: 'vi',
                externalUrl: null,
                pages: item.image_num || 1,
                publishAt: item.updated_at
                  ? new Date(item.updated_at).toISOString()
                  : new Date().toISOString(),
                scanlationGroup: 'NetTruyen',
                sourceProvider: 'NetTruyen (Tiếng Việt)',
              };
            }
          );

          chapters.sort((a, b) => {
            const numA = parseFloat(a.chapter || '-1');
            const numB = parseFloat(b.chapter || '-1');
            if (isNaN(numA) && isNaN(numB)) return 0;
            if (isNaN(numA)) return 1;
            if (isNaN(numB)) return -1;
            return numB - numA;
          });

          return chapters;
        }
      }

      // 2. Fallback: Parse HTML chapter list
      const pageUrl = `${BASE_URL}/truyen-tranh/${comicSlug}-${comicId}`;
      const pageRes = await fetch(pageUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: `${BASE_URL}/`,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!pageRes.ok) return [];

      const html = await pageRes.text();
      const start = html.indexOf('id="chapter_list"');
      const end = html.indexOf('</ul', start !== -1 ? start : 0);
      const block = start !== -1 && end !== -1 ? html.slice(start, end) : html;

      const regex =
        /<div class=["']col-xs-5 chapter["']>[\s\S]*?<a href=["'](?:https?:\/\/[^"']+)?\/truyen-tranh\/([^"']+)\/([^"']+)\/(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      const chapters: MangaDexChapter[] = [];

      while ((m = regex.exec(block)) !== null) {
        const cComicSlug = m[1];
        const cChapterSlug = m[2];
        const cChapterId = m[3];
        const cName = m[4].replace(/<[^>]*>/g, '').trim();

        const numMatch = cName.match(/(\d+(\.\d+)?)/);
        const chapterNum = numMatch ? numMatch[1] : null;

        chapters.push({
          id: `nettruyen-${cComicSlug}__${cChapterSlug}__${cChapterId}`,
          chapter: chapterNum,
          volume: null,
          title: cName,
          translatedLanguage: 'vi',
          externalUrl: null,
          pages: 1,
          publishAt: new Date().toISOString(),
          scanlationGroup: 'NetTruyen',
          sourceProvider: 'NetTruyen (Tiếng Việt)',
        });
      }

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
      console.error(`Error fetching NetTruyen chapters for ${comicSlug}:`, err);
      return [];
    }
  });
}

/**
 * Fetches page images for a NetTruyen chapter.
 */
export async function getNettruyenChapterPages(
  chapterId: string
): Promise<ChapterPagesResponse> {
  const cleanId = chapterId.replace(/^nettruyen-/, '');
  const [comicSlug, chapterSlug, chapterIdNum] = cleanId.split('__');

  if (!comicSlug || !chapterSlug || !chapterIdNum) {
    throw new Error(`Invalid NetTruyen chapter ID format: ${chapterId}`);
  }

  const cacheKey = `nettruyen:pages:${comicSlug}:${chapterSlug}:${chapterIdNum}`;
  return getOrSetCache(cacheKey, 3600, async () => {
    const chapterUrl = `${BASE_URL}/truyen-tranh/${comicSlug}/${chapterSlug}/${chapterIdNum}`;

    const res = await fetch(chapterUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${BASE_URL}/truyen-tranh/${comicSlug}`,
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      throw new Error(`NetTruyen returned HTTP ${res.status} for chapter ${chapterId}`);
    }

    const html = await res.text();

    // Look for reading images container
    const startIdx = html.indexOf('class="reading-detail box_doc"');
    const searchSlice = startIdx !== -1 ? html.slice(startIdx, startIdx + 30000) : html;

    const imgRegex = /<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    const rawImageUrls: string[] = [];

    while ((match = imgRegex.exec(searchSlice)) !== null) {
      let src = match[1].trim();

      // Fix protocol-relative URLs
      if (src.startsWith('//')) {
        src = `https:${src}`;
      }

      // Filter out logos, icons, ads, and tracker pixels
      if (
        !src.startsWith('http') ||
        src.includes('logo') ||
        src.includes('icon') ||
        src.includes('banner') ||
        src.includes('facebook') ||
        src.includes('pixel')
      ) {
        continue;
      }

      if (!rawImageUrls.includes(src)) {
        rawImageUrls.push(src);
      }
    }

    if (rawImageUrls.length === 0) {
      return {
        chapterId,
        chapterNumber: chapterSlug.replace(/^chapter-|^chuong-/, ''),
        title: null,
        volume: null,
        externalUrl: chapterUrl,
        isUnavailable: true,
        errorMessage: 'Không tìm thấy hình ảnh cho chương này trên NetTruyen.',
        pages: [],
        total: 0,
      };
    }

    const pages = rawImageUrls.map((originalUrl, idx) => ({
      pageNumber: idx + 1,
      url: `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`,
      originalUrl,
    }));

    return {
      chapterId,
      chapterNumber: chapterSlug.replace(/^chapter-|^chuong-/, ''),
      title: null,
      volume: null,
      externalUrl: null,
      pages,
      total: pages.length,
    };
  });
}
