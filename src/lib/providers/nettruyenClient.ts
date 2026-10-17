import { MangaDexChapter } from '../types';
import { isTitleMatch, generateSearchQueries } from './matcher';

const PROXY_URL = 'https://manga-proxy.phungvanquangdmx.workers.dev';
const BASE_URL = 'https://nettruyen.gg';

function buildUrl(target: string): string {
  return `${PROXY_URL}/?url=${encodeURIComponent(target)}`;
}

/**
 * Client-side NetTruyen chapter scraper that runs directly in the user's browser.
 * Bypasses datacenter blocks because it originates from the user's residential IP.
 */
export async function fetchNetTruyenClientSide(
  titles: string[]
): Promise<MangaDexChapter[]> {
  try {
    const candidateQueries = generateSearchQueries(titles, 'vi');

    let matchedSlug: string | null = null;
    let matchedComicId: string | null = null;

    // 1. Search NetTruyen
    for (const q of candidateQueries.slice(0, 8)) {
      if (!q || q.length < 2) continue;

      try {
        const searchUrl = buildUrl(`${BASE_URL}/tim-truyen?keyword=${encodeURIComponent(q)}`);
        const res = await fetch(searchUrl, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;

        const html = await res.text();
        const regex =
          /<a[^>]+href=["'](?:https?:\/\/[^"']+)?\/truyen-tranh\/([a-z0-9-]+)(?:-(\d+))?["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(html)) !== null) {
          const rawSlug = match[1];
          const explicitId = match[2];
          const innerText = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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

          const slugTitle = rawSlug.replace(/[^a-z0-9]/gi, ' ');
          if (isTitleMatch(innerText, titles) || isTitleMatch(slugTitle, titles)) {
            matchedSlug = rawSlug;
            if (explicitId) matchedComicId = explicitId;
            break;
          }
        }

        if (matchedSlug) break;
      } catch (err) {
        console.warn('Client search error for query:', q, err);
      }
    }

    if (!matchedSlug) return [];

    // 2. Resolve comicId if needed
    if (!matchedComicId) {
      try {
        const pageRes = await fetch(buildUrl(`${BASE_URL}/truyen-tranh/${matchedSlug}`), {
          signal: AbortSignal.timeout(4000),
        });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const idMatch = pageHtml.match(/comicId\s*=\s*['"]?(\d+)['"]?/i);
          if (idMatch?.[1]) {
            matchedComicId = idMatch[1];
          }
        }
      } catch (err) {
        console.warn('Client comicId resolution error:', err);
      }
    }

    // 3. Fetch chapters via NetTruyen Ajax service
    if (matchedComicId) {
      try {
        const ajaxUrl = buildUrl(
          `${BASE_URL}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(
            matchedSlug
          )}&comicId=${encodeURIComponent(matchedComicId)}`
        );
        const ajaxRes = await fetch(ajaxUrl, {
          signal: AbortSignal.timeout(4000),
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
                  id: `nettruyen-${matchedSlug}__${item.chapter_slug}`,
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
        console.warn('Client Ajax chapter list fetch error:', err);
      }
    }

    return [];
  } catch (err) {
    console.error('fetchNetTruyenClientSide top-level error:', err);
    return [];
  }
}

/**
 * Client-side chapter list scraper for a specific NetTruyen comic slug (e.g. "one-piece-100").
 * Used to power Next/Previous chapter buttons and chapter select dropdown in the reader on Vercel.
 */
export async function fetchNetTruyenChaptersForComicClient(
  comicSlug: string
): Promise<MangaDexChapter[]> {
  if (!comicSlug) return [];

  // 1. Check client session storage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(`nettruyen_chapters_${comicSlug}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }

  try {
    let comicId: string | null = null;
    let pageHtml = '';

    // 2. Fetch manga details page to extract comicId
    try {
      const pageRes = await fetch(buildUrl(`${BASE_URL}/truyen-tranh/${comicSlug}`), {
        signal: AbortSignal.timeout(5000),
      });
      if (pageRes.ok) {
        pageHtml = await pageRes.text();
        const idMatch = pageHtml.match(/comicId\s*=\s*['"]?(\d+)['"]?/i);
        if (idMatch?.[1]) {
          comicId = idMatch[1];
        }
      }
    } catch (err) {
      console.warn('Client comicId resolution error for', comicSlug, err);
    }

    // 3. Query official NetTruyen Ajax service
    if (comicId) {
      try {
        const ajaxUrl = buildUrl(
          `${BASE_URL}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(
            comicSlug
          )}&comicId=${encodeURIComponent(comicId)}`
        );
        const ajaxRes = await fetch(ajaxUrl, {
          signal: AbortSignal.timeout(5000),
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

            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(`nettruyen_chapters_${comicSlug}`, JSON.stringify(chapters));
              } catch {}
            }

            return chapters;
          }
        }
      } catch (ajaxErr) {
        console.warn('Client Ajax chapter list fetch error:', ajaxErr);
      }
    }

    // 4. Fallback: Parse HTML chapter list
    if (pageHtml) {
      const start = pageHtml.indexOf('id="chapter_list"');
      const end = pageHtml.indexOf('</ul', start !== -1 ? start : 0);
      const block = start !== -1 && end !== -1 ? pageHtml.slice(start, end) : pageHtml;

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

      if (chapters.length > 0) {
        chapters.sort((a, b) => {
          const numA = parseFloat(a.chapter || '-1');
          const numB = parseFloat(b.chapter || '-1');
          if (isNaN(numA) && isNaN(numB)) return 0;
          if (isNaN(numA)) return 1;
          if (isNaN(numB)) return -1;
          return numB - numA;
        });

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`nettruyen_chapters_${comicSlug}`, JSON.stringify(chapters));
          } catch {}
        }

        return chapters;
      }
    }

    return [];
  } catch (err) {
    console.error('fetchNetTruyenChaptersForComicClient error:', err);
    return [];
  }
}

/**
 * Client-side chapter page image scraper for NetTruyen reader fallback.
 */
export async function fetchNetTruyenChapterPagesClient(
  chapterId: string
): Promise<{ pageNumber: number; url: string; originalUrl: string }[]> {
  try {
    const cleanId = chapterId.replace(/^nettruyen-/, '');
    const [comicSlug, chapterSlug] = cleanId.split('__');
    if (!comicSlug || !chapterSlug) return [];

    const candidateUrls = [
      buildUrl(`${BASE_URL}/truyen-tranh/${comicSlug}/${chapterSlug}`),
    ];

    if (chapterSlug.startsWith('chapter-')) {
      candidateUrls.push(
        buildUrl(`${BASE_URL}/truyen-tranh/${comicSlug}/chuong-${chapterSlug.slice(8)}`)
      );
    } else if (chapterSlug.startsWith('chuong-')) {
      candidateUrls.push(
        buildUrl(`${BASE_URL}/truyen-tranh/${comicSlug}/chapter-${chapterSlug.slice(7)}`)
      );
    }

    // Also try alternate mirror
    candidateUrls.push(
      buildUrl(`https://nettruyenar.com/truyen-tranh/${comicSlug}/${chapterSlug}`)
    );

    function extractImages(html: string): string[] {
      const imgTagRegex = /<img\b([^>]*)>/gi;
      let tagMatch: RegExpExecArray | null;
      const urls: string[] = [];

      while ((tagMatch = imgTagRegex.exec(html)) !== null) {
        const attributes = tagMatch[1];
        const dataOriginal = attributes.match(/data-original=["']([^"']+)["']/i)?.[1];
        const dataSrc = attributes.match(/data-src=["']([^"']+)["']/i)?.[1];
        const dataCdn = attributes.match(/data-cdn=["']([^"']+)["']/i)?.[1];
        const dataSv1 = attributes.match(/data-sv1=["']([^"']+)["']/i)?.[1];
        const dataSv2 = attributes.match(/data-sv2=["']([^"']+)["']/i)?.[1];
        const srcAttr = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];

        const candidate = dataOriginal || dataSrc || dataCdn || dataSv1 || dataSv2 || srcAttr;
        if (!candidate) continue;

        let src = candidate.trim();
        if (src.startsWith('//')) src = `https:${src}`;
        if (
          !src.startsWith('http') ||
          src.includes('logo') ||
          src.includes('icon') ||
          src.includes('banner') ||
          src.includes('facebook') ||
          src.includes('pixel') ||
          src.includes('lazy') ||
          src.includes('loading') ||
          src.includes('blank.gif')
        ) {
          continue;
        }

        if (
          (src.includes('.jpg') ||
            src.includes('.png') ||
            src.includes('.jpeg') ||
            src.includes('.webp') ||
            src.includes('.avif') ||
            src.includes('googleusercontent') ||
            src.includes('cloud-zzz') ||
            src.includes('kcgsbok') ||
            src.includes('imagebam')) &&
          !urls.includes(src)
        ) {
          urls.push(src);
        }
      }
      return urls;
    }

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) continue;

        const html = await res.text();
        const images = extractImages(html);
        if (images.length > 0) {
          return images.map((originalUrl, idx) => ({
            pageNumber: idx + 1,
            url: `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`,
            originalUrl,
          }));
        }
      } catch (err) {
        console.warn('Failed fetching candidate NetTruyen chapter URL:', url, err);
      }
    }

    return [];
  } catch (err) {
    console.error('fetchNetTruyenChapterPagesClient error:', err);
    return [];
  }
}
