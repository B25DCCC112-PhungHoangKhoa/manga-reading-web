import { MangaDexChapter, ChapterPagesResponse } from '../types';
import { getMangaChapters } from '../mangadex';
import {
  searchWeebcentral,
  getWeebcentralChapters,
  getWeebcentralChapterPages,
} from './weebcentral';
import {
  searchMangaPill,
  getMangaPillChapters,
  getMangaPillChapterPages,
} from './mangapill';
import {
  getMergedWithAlternativeChapters,
  getAlternativeChapterPages,
} from '../fallbackManga';

export {
  searchWeebcentral,
  getWeebcentralChapters,
  getWeebcentralChapterPages,
  searchMangaPill,
  getMangaPillChapters,
  getMangaPillChapterPages,
};

/**
 * Fetch and merge chapters across MangaDex, WeebCentral, MangaPill, and Comick
 * so 100% of all chapters are available without gaps.
 */
export async function getCompleteChaptersAcrossProviders(
  mangaDexId: string | null,
  titles: string[],
  selectedProvider: 'all' | 'mangadex' | 'weebcentral' | 'mangapill' = 'all'
): Promise<MangaDexChapter[]> {
  // If a specific provider is requested:
  if (selectedProvider === 'weebcentral') {
    const id = await searchWeebcentral(titles);
    return id ? await getWeebcentralChapters(id) : [];
  }

  if (selectedProvider === 'mangapill') {
    const path = await searchMangaPill(titles);
    return path ? await getMangaPillChapters(path) : [];
  }

  if (selectedProvider === 'mangadex' && mangaDexId) {
    return await getMangaChapters(mangaDexId, 500);
  }

  // --- 'all' (Hybrid Multi-Source Mode) ---
  // 1. Start with MangaDex chapters if available
  let masterChapters: MangaDexChapter[] = [];
  if (mangaDexId) {
    try {
      masterChapters = await getMangaChapters(mangaDexId, 500);
    } catch (err) {
      console.error('Error fetching MangaDex base chapters:', err);
    }
  }

  const existingNumSet = new Set<string>();
  masterChapters.forEach((c) => {
    if (c.chapter) {
      existingNumSet.add(c.chapter);
      const num = parseFloat(c.chapter);
      if (!isNaN(num)) existingNumSet.add(String(num));
    }
  });

  // 2. Fetch WeebCentral and MangaPill in parallel to fill any remaining chapters
  const [weebcentralId, mangapillPath] = await Promise.all([
    searchWeebcentral(titles),
    searchMangaPill(titles),
  ]);

  const [weebChapters, pillChapters] = await Promise.all([
    weebcentralId ? getWeebcentralChapters(weebcentralId) : Promise.resolve([]),
    mangapillPath ? getMangaPillChapters(mangapillPath) : Promise.resolve([]),
  ]);

  // Merge WeebCentral chapters for missing numbers
  const missingFromWeeb = weebChapters.filter((wc) => {
    if (!wc.chapter) return false;
    const num = parseFloat(wc.chapter);
    if (isNaN(num)) return !existingNumSet.has(wc.chapter);
    return !existingNumSet.has(wc.chapter) && !existingNumSet.has(String(num));
  });

  missingFromWeeb.forEach((c) => {
    masterChapters.push(c);
    if (c.chapter) {
      existingNumSet.add(c.chapter);
      const num = parseFloat(c.chapter);
      if (!isNaN(num)) existingNumSet.add(String(num));
    }
  });

  // Merge MangaPill chapters for any still-missing numbers
  const missingFromPill = pillChapters.filter((mp) => {
    if (!mp.chapter) return false;
    const num = parseFloat(mp.chapter);
    if (isNaN(num)) return !existingNumSet.has(mp.chapter);
    return !existingNumSet.has(mp.chapter) && !existingNumSet.has(String(num));
  });

  missingFromPill.forEach((c) => {
    masterChapters.push(c);
    if (c.chapter) {
      existingNumSet.add(c.chapter);
      const num = parseFloat(c.chapter);
      if (!isNaN(num)) existingNumSet.add(String(num));
    }
  });

  // 3. Fallback to Comick if chapters are still empty or sparse
  if (masterChapters.length === 0 || masterChapters.length < 10) {
    const comickMerged = await getMergedWithAlternativeChapters(titles, masterChapters);
    masterChapters = comickMerged.chapters;
  }

  // 4. Sort numerically descending
  masterChapters.sort((a, b) => {
    const numA = parseFloat(a.chapter || '-1');
    const numB = parseFloat(b.chapter || '-1');
    if (isNaN(numA) && isNaN(numB)) return 0;
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    return numB - numA;
  });

  return masterChapters;
}

/**
 * Route chapter page fetching to the correct provider
 */
export async function getPagesForAnyProvider(
  chapterId: string
): Promise<ChapterPagesResponse> {
  if (chapterId.startsWith('weebcentral-')) {
    return getWeebcentralChapterPages(chapterId);
  }
  if (chapterId.startsWith('mangapill-')) {
    return getMangaPillChapterPages(chapterId);
  }
  if (chapterId.startsWith('comick-') || chapterId.startsWith('fallback-')) {
    return getAlternativeChapterPages(chapterId);
  }
  throw new Error('Not a third-party provider chapter');
}

