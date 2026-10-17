/**
 * Advanced title matching and candidate query generation for manga providers.
 * Eliminates false positives (wrong manga matches) and normalizes titles across platforms.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'to', 'and', 'for', 'with', 'on', 'at', 'by', 'from',
  'no', 'wa', 'ga', 'wo', 'ni', 'de',
  'chap', 'chapter', 'chuong', 'tap', 'season', 'vol', 'volume',
  'manga', 'manhwa', 'manhua', 'comic', 'comics', 'webtoon'
]);

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Characters and diacritic combinations found specifically in Vietnamese
 * (distinct from Spanish, Portuguese, French, German, Italian).
 */
const STRICT_VIETNAMESE_REGEX = /[đĐăĂơƠưƯảạẳặẵẩẫậẻẽẹểễệỉĩịỏọổỗộủũụửữựỳỷỹỵầấềếồốờớ]/i;

export function isVietnamese(str: string): boolean {
  if (!str) return false;
  return STRICT_VIETNAMESE_REGEX.test(str);
}

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02BC\u02BB\u00B4\`]/g, "'") // normalize all single quotes/apostrophes
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, ' ')       // normalize double quotes
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')                 // keep letters (including non-latin/Vietnamese/Korean), numbers, space, apostrophe
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTokens(str: string): string[] {
  const norm = normalizeText(str);
  if (!norm) return [];
  return norm
    .split(/[\s'-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function checkMatchTokens(candTokens: string[], targetTokens: string[], normCand: string, normTarget: string): boolean {
  // 1. Exact normalized match
  if (normCand === normTarget) return true;

  // 2. Exact match ignoring apostrophes and spaces
  const stripCand = normCand.replace(/[\s']/g, '');
  const stripTarget = normTarget.replace(/[\s']/g, '');
  if (stripCand === stripTarget && stripCand.length >= 3) return true;

  // 3. Single token target (e.g. "Bleach", "Berserk", "Naruto")
  if (targetTokens.length === 1) {
    if (candTokens[0] === targetTokens[0] && candTokens.length <= 4) return true;
    if (candTokens.includes(targetTokens[0]) && candTokens.length <= 3) return true;
    return false;
  }

  // 4. Token containment check
  const candSet = new Set(candTokens);
  let shared = 0;
  for (const t of targetTokens) {
    if (candSet.has(t)) shared++;
  }

  // If candidate contains all target tokens (e.g. target is "One Piece", candidate is "One Piece - Digital Colored")
  if (shared === targetTokens.length && targetTokens.length >= 2) return true;
  // If target contains all candidate tokens
  if (shared === candTokens.length && candTokens.length >= 2) return true;

  // 5. Overlap ratio check: requires high similarity to reject partial coincidences
  const minLen = Math.min(targetTokens.length, candTokens.length);
  const maxLen = Math.max(targetTokens.length, candTokens.length);
  if (minLen >= 2 && (shared / minLen) >= 0.75 && (shared / maxLen) >= 0.5) {
    return true;
  }

  return false;
}

/**
 * Checks whether a candidate title from a provider (e.g. MangaPill, WeebCentral, NetTruyen)
 * accurately matches any of the target manga titles.
 * Rejects false positives (e.g. "Detective Academy Q" when searching "The Extra's Academy Survival Guide").
 */
export function isTitleMatch(candidate: string, targetTitles: string[]): boolean {
  if (!candidate || !targetTitles || targetTitles.length === 0) return false;

  const normCand = normalizeText(candidate);
  const candTokens = getTokens(candidate);
  if (!normCand || candTokens.length === 0) return false;

  const foldedCand = removeVietnameseTones(normCand);
  const foldedCandTokens = getTokens(foldedCand);

  for (const target of targetTitles) {
    if (!target) continue;
    const normTarget = normalizeText(target);
    const targetTokens = getTokens(target);
    if (!normTarget || targetTokens.length === 0) continue;

    // Normal comparison
    if (checkMatchTokens(candTokens, targetTokens, normCand, normTarget)) {
      return true;
    }

    // Tone/accent-folded comparison (for Vietnamese / Latin diacritics)
    const foldedTarget = removeVietnameseTones(normTarget);
    if (foldedTarget !== normTarget || foldedCand !== normCand) {
      const foldedTargetTokens = getTokens(foldedTarget);
      if (checkMatchTokens(foldedCandTokens, foldedTargetTokens, foldedCand, foldedTarget)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generates an optimized list of candidate search queries for manga providers.
 * Supports language hinting ('vi' for NetTruyen, 'en' for MangaPill / WeebCentral).
 */
export function generateSearchQueries(titles: string[], targetLanguage?: 'vi' | 'en'): string[] {
  const querySet = new Set<string>();

  const addQuery = (q: string) => {
    const trimmed = q.trim();
    if (trimmed && trimmed.length >= 2 && !querySet.has(trimmed)) {
      querySet.add(trimmed);
    }
  };

  // Group titles by language priority
  const viTitles: string[] = [];
  const enTitles: string[] = [];
  const otherLatinTitles: string[] = [];
  const nonLatinTitles: string[] = [];

  for (const raw of titles) {
    if (!raw || !raw.trim()) continue;
    const clean = raw.trim();
    if (isVietnamese(clean)) {
      viTitles.push(clean);
    } else if (/^[\x00-\x7F\s\p{P}]+$/u.test(clean)) {
      enTitles.push(clean);
    } else if (/^[\p{Script=Latin}\s\p{P}]+$/u.test(clean)) {
      otherLatinTitles.push(clean);
    } else {
      nonLatinTitles.push(clean);
    }
  }

  let orderedTitles: string[];
  if (targetLanguage === 'vi') {
    orderedTitles = [...viTitles, ...enTitles, ...otherLatinTitles, ...nonLatinTitles];
  } else {
    orderedTitles = [...enTitles, ...otherLatinTitles, ...viTitles, ...nonLatinTitles];
  }

  for (const clean of orderedTitles) {
    const norm = normalizeText(clean);
    if (norm) addQuery(norm);

    // If Vietnamese, also add unaccented variant
    if (isVietnamese(clean)) {
      const unaccented = removeVietnameseTones(norm);
      if (unaccented && unaccented !== norm) {
        addQuery(unaccented);
      }
    }

    // Title without subtitle (e.g. before colon, hyphen, dash)
    const strippedSub = clean.replace(/[:\-–—].*$/, '').trim();
    const normSub = normalizeText(strippedSub);
    if (normSub && normSub !== norm && normSub.length >= 2) {
      addQuery(normSub);
      if (isVietnamese(strippedSub)) {
        const unaccSub = removeVietnameseTones(normSub);
        if (unaccSub && unaccSub !== normSub) addQuery(unaccSub);
      }
    }

    // Title without leading articles ("The", "A", "An")
    const withoutArticle = clean.replace(/^(the|a|an)\s+/i, '').trim();
    const normArticle = normalizeText(withoutArticle);
    if (normArticle && normArticle !== norm) {
      addQuery(normArticle);
    }

    // Title with apostrophes removed (e.g. "Extra's" -> "Extras")
    const noApostrophe = norm.replace(/'/g, '');
    if (noApostrophe && noApostrophe !== norm) {
      addQuery(noApostrophe);
    }

    // Title with apostrophe replaced by space (e.g. "Extra's" -> "Extra s")
    const apostropheSpace = norm.replace(/'s\b/g, '').trim();
    if (apostropheSpace && apostropheSpace !== norm) {
      addQuery(apostropheSpace);
    }
  }

  return Array.from(querySet);
}

