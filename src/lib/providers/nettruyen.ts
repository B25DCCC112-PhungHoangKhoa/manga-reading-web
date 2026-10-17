import { getOrSetCache } from '../cache';
import { MangaDexChapter, ChapterPagesResponse } from '../types';

const BASE_URL = 'https://nettruyen.gg';
const MIRROR_URLS = ['https://nettruyen.gg', 'https://nettruyenar.com'];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface NetTruyenMatch {
  comicSlug: string;
  comicId?: string;
  title: string;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/[【】\[\]\(\)\"\'«»]/g, ' ')
    .replace(/[:\-–—].*$/, '')
    .trim();
}

const DEFAULT_PROXY = 'https://manga-proxy.phungvanquangdmx.workers.dev';

function buildProxiedUrl(targetUrl: string): string {
  const proxy = (
    process.env.CLOUDFLARE_PROXY_URL ||
    process.env.CLOUDFLARE_PROXY_UR ||
    process.env.PROXY_URL ||
    DEFAULT_PROXY
  ).trim();
  const cleanProxy = proxy.replace(/\/+$/, '');
  return `${cleanProxy}/?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Searches NetTruyen for a manga matching any of the given titles.
 */
export async function searchNettruyen(
  titles: string[]
): Promise<NetTruyenMatch | null> {
  const cacheKey = `nettruyen:search:v4:${titles.join(':')}`;
  return getOrSetCache(cacheKey, 86400, async () => {
    for (const rawTitle of titles) {
      if (!rawTitle) continue;
      const q = cleanTitle(rawTitle);
      if (!q || q.length < 2) continue;

      for (const mirror of MIRROR_URLS) {
        try {
          const searchUrl = buildProxiedUrl(`${mirror}/tim-truyen?keyword=${encodeURIComponent(q)}`);
          const res = await fetch(searchUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              Referer: `${mirror}/`,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            },
          });

          if (!res.ok) continue;

          const html = await res.text();

          // Pattern for NetTruyen manga cards: /truyen-tranh/{slug} or /truyen-tranh/{slug}-{id}
          const regex =
            /<a[^>]+href=["'](?:https?:\/\/[^"']+)?\/truyen-tranh\/([a-z0-9-]+)(?:-(\d+))?["'][^>]*>([\s\S]*?)<\/a>/gi;
          let match: RegExpExecArray | null;

          const lowerQ = q.toLowerCase();
          let firstCandidate: NetTruyenMatch | null = null;

          while ((match = regex.exec(html)) !== null) {
            const rawSlug = match[1];
            const explicitId = match[2];
            const innerText = match[3].replace(/<[^>]*>/g, '').trim();

            // Avoid chapter sublinks, category pages, or navigation tags
            if (
              !innerText ||
              rawSlug.includes('chapter') ||
              rawSlug.includes('chuong') ||
              rawSlug === 'tim-truyen' ||
              rawSlug === 'con-gai' ||
              rawSlug === 'con-trai' ||
              innerText.toLowerCase().includes('chapter') ||
              innerText.toLowerCase().includes('chương')
            ) {
              continue;
            }

            const candidate: NetTruyenMatch = {
              comicSlug: rawSlug,
              comicId: explicitId,
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
          console.error(`NetTruyen search error for "${rawTitle}" on ${mirror}:`, err);
        }
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
  explicitComicId?: string
): Promise<MangaDexChapter[]> {
  const cacheKey = `nettruyen:chapters:v2:${comicSlug}:${explicitComicId || 'auto'}`;
  return getOrSetCache(cacheKey, 900, async () => {
    let resolvedId = explicitComicId;

    // 1. If comicId is not yet known, fetch manga page to extract comicId from JavaScript gOpts
    if (!resolvedId) {
      try {
        const pageRes = await fetch(buildProxiedUrl(`${BASE_URL}/truyen-tranh/${comicSlug}`), {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: `${BASE_URL}/`,
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const idMatch = pageHtml.match(/comicId\s*=\s*['"]?(\d+)['"]?/i);
          if (idMatch?.[1]) {
            resolvedId = idMatch[1];
          }
        }
      } catch (err) {
        console.error(`Error resolving comicId for ${comicSlug}:`, err);
      }
    }

    // 2. Primary: NetTruyen's official JSON ChapterList Ajax service
    if (resolvedId) {
      for (const mirror of MIRROR_URLS) {
        try {
          const ajaxUrl = buildProxiedUrl(
            `${mirror}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(
              comicSlug
            )}&comicId=${encodeURIComponent(resolvedId)}`
          );

          const ajaxRes = await fetch(ajaxUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              Referer: `${mirror}/truyen-tranh/${comicSlug}`,
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
                    id: `nettruyen-${comicSlug}__${item.chapter_slug}`,
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
        } catch (err) {
          console.error(`Error querying NetTruyen Ajax service on ${mirror}:`, err);
        }
      }
    }

    // 3. Fallback: Parse HTML chapter list
    try {
      const pageUrl = buildProxiedUrl(`${BASE_URL}/truyen-tranh/${comicSlug}`);
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
        /<div class=["']col-xs-5 chapter["']>[\s\S]*?<a href=["'](?:https?:\/\/[^"']+)?\/truyen-tranh\/[^"']+\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      const chapters: MangaDexChapter[] = [];

      while ((m = regex.exec(block)) !== null) {
        const cChapterSlug = m[1];
        const cName = m[2].replace(/<[^>]*>/g, '').trim();

        const numMatch = cName.match(/(\d+(\.\d+)?)/);
        const chapterNum = numMatch ? numMatch[1] : null;

        chapters.push({
          id: `nettruyen-${comicSlug}__${cChapterSlug}`,
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
      console.error(`Error fetching HTML NetTruyen chapters for ${comicSlug}:`, err);
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
  const [comicSlug, chapterSlug] = cleanId.split('__');

  if (!comicSlug || !chapterSlug) {
    throw new Error(`Invalid NetTruyen chapter ID format: ${chapterId}`);
  }

  const cacheKey = `nettruyen:pages:v2:${comicSlug}:${chapterSlug}`;
  return getOrSetCache(cacheKey, 3600, async () => {
    const rawChapterUrl = `${BASE_URL}/truyen-tranh/${comicSlug}/${chapterSlug}`;
    const chapterUrl = buildProxiedUrl(rawChapterUrl);

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

    const imgRegex = /<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    const rawImageUrls: string[] = [];

    while ((match = imgRegex.exec(html)) !== null) {
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

      if (
        (src.includes('.jpg') ||
          src.includes('.png') ||
          src.includes('.jpeg') ||
          src.includes('.webp')) &&
        !rawImageUrls.includes(src)
      ) {
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
