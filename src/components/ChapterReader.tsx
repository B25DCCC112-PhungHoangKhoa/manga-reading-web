'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Scroll,
  FileText,
  ArrowUp,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  ListFilter,
  CheckCircle2,
  ChevronDown,
  Check,
  Loader2,
  Globe,
} from 'lucide-react';
import { ChapterPagesResponse } from '@/lib/types';
import {
  fetchNetTruyenChapterPagesClient,
  fetchNetTruyenChaptersForComicClient,
  fetchNetTruyenClientSide,
} from '@/lib/providers/nettruyenClient';
import {
  fetchWeebcentralChapterPagesClient,
  fetchWeebcentralClientSide,
} from '@/lib/providers/weebcentralClient';

const PROVIDERS_LIST = [
  { id: 'mangadex', name: 'MangaDex', badge: 'EN', icon: '🌐' },
  { id: 'weebcentral', name: 'WeebCentral', badge: 'EN', icon: '⚡' },
  { id: 'mangapill', name: 'MangaPill', badge: 'EN', icon: '💊' },
  { id: 'nettruyen', name: 'NetTruyen', badge: 'VI', icon: '🇻🇳' },
] as const;

interface SimpleChapter {
  id: string;
  chapter: string | null;
  title: string | null;
  translatedLanguage?: string;
  externalUrl?: string | null;
}

interface NavData {
  chapters: SimpleChapter[];
  prevChapter: SimpleChapter | null;
  nextChapter: SimpleChapter | null;
  currentIndex: number;
}

function computeNavigation(
  chapters: SimpleChapter[],
  targetChapterId: string
): NavData {
  let currentIndex = chapters.findIndex((c) => c.id === targetChapterId);

  // Fallback: match by chapter number if id didn't match exactly
  if (currentIndex === -1) {
    const currentNumMatch =
      targetChapterId.match(/(?:chuong|chapter)-(\d+(?:\.\d+)?)/i) ||
      targetChapterId.match(/(\d+(?:\.\d+)?)$/);
    if (currentNumMatch?.[1]) {
      const targetNum = currentNumMatch[1];
      currentIndex = chapters.findIndex(
        (c) => c.chapter === targetNum || parseFloat(c.chapter || '-1') === parseFloat(targetNum)
      );
    }
  }

  let prevChapter: SimpleChapter | null = null;
  let nextChapter: SimpleChapter | null = null;

  if (chapters.length > 0 && currentIndex !== -1) {
    const firstNum = parseFloat(chapters[0]?.chapter || '0');
    const lastNum = parseFloat(chapters[chapters.length - 1]?.chapter || '0');
    const isDescending = firstNum >= lastNum;

    nextChapter = isDescending
      ? (currentIndex > 0 ? chapters[currentIndex - 1] : null)
      : (currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null);

    prevChapter = isDescending
      ? (currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null)
      : (currentIndex > 0 ? chapters[currentIndex - 1] : null);
  }

  return {
    chapters,
    prevChapter,
    nextChapter,
    currentIndex,
  };
}

interface ChapterReaderProps {
  initialData: ChapterPagesResponse;
  mangaId?: string;
  provider?: string;
}

export default function ChapterReader({
  initialData,
  mangaId,
  provider,
}: ChapterReaderProps) {
  const router = useRouter();
  const isNetTruyen = initialData.chapterId.startsWith('nettruyen-');
  const isWeebCentral = initialData.chapterId.startsWith('weebcentral-');
  const hasClientFallback = isNetTruyen || isWeebCentral;
  const [pages, setPages] = useState(initialData.pages || []);
  const [isUnavailable, setIsUnavailable] = useState(
    Boolean(initialData.isUnavailable && !hasClientFallback)
  );
  const [isLoadingPages, setIsLoadingPages] = useState(
    (initialData.isUnavailable || (!initialData.pages || initialData.pages.length === 0)) &&
      hasClientFallback
  );
  const [readingMode, setReadingMode] = useState<'vertical' | 'single'>('vertical');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBars, setShowBars] = useState(true);
  const [widthMode, setWidthMode] = useState<'fit' | 'medium' | 'full'>('medium');

  // Track page image load status
  const [loadedPages, setLoadedPages] = useState<Record<number, boolean>>({});

  // Chapter Navigation State
  const [navData, setNavData] = useState<NavData | null>(null);
  const [isLoadingNav, setIsLoadingNav] = useState(true);

  // Container refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Provider Switcher State
  const currentProvider: 'mangadex' | 'weebcentral' | 'mangapill' | 'nettruyen' =
    initialData.chapterId.startsWith('nettruyen-')
      ? 'nettruyen'
      : initialData.chapterId.startsWith('weebcentral-')
      ? 'weebcentral'
      : initialData.chapterId.startsWith('mangapill-')
      ? 'mangapill'
      : (provider as 'mangadex' | 'weebcentral' | 'mangapill' | 'nettruyen') || 'mangadex';

  const currentProviderMeta =
    PROVIDERS_LIST.find((p) => p.id === currentProvider) || PROVIDERS_LIST[0];

  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [isSwitchingProvider, setIsSwitchingProvider] = useState(false);
  const [switchingTargetId, setSwitchingTargetId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const providerDropdownRef = useRef<HTMLDivElement>(null);

  // Close provider dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        providerDropdownRef.current &&
        !providerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProviderMenu(false);
      }
    }
    if (showProviderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProviderMenu]);

  // Auto clear feedback message
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  // Reset page state on chapter change
  useEffect(() => {
    const isNetTruyenChapter = initialData.chapterId.startsWith('nettruyen-');
    const isWeebCentralChapter = initialData.chapterId.startsWith('weebcentral-');
    const hasInitialPages = Boolean(initialData.pages && initialData.pages.length > 0);

    setPages(initialData.pages || []);
    setCurrentPageIndex(0);
    setLoadedPages({});
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (!hasInitialPages && isNetTruyenChapter) {
      setIsLoadingPages(true);
      fetchNetTruyenChapterPagesClient(initialData.chapterId)
        .then((clientPages) => {
          if (clientPages && clientPages.length > 0) {
            setPages(clientPages);
            setIsUnavailable(false);
          } else {
            setIsUnavailable(true);
          }
        })
        .catch((err) => {
          console.error('Client fallback failed for NetTruyen chapter:', err);
          setIsUnavailable(true);
        })
        .finally(() => {
          setIsLoadingPages(false);
        });
    } else if (!hasInitialPages && isWeebCentralChapter) {
      setIsLoadingPages(true);
      fetchWeebcentralChapterPagesClient(initialData.chapterId)
        .then((clientPages) => {
          if (clientPages && clientPages.length > 0) {
            setPages(clientPages);
            setIsUnavailable(false);
          } else {
            setIsUnavailable(true);
          }
        })
        .catch((err) => {
          console.error('Client fallback failed for WeebCentral chapter:', err);
          setIsUnavailable(true);
        })
        .finally(() => {
          setIsLoadingPages(false);
        });
    } else {
      setIsUnavailable(Boolean(initialData.isUnavailable && !hasInitialPages));
      setIsLoadingPages(false);
    }
  }, [initialData.chapterId, initialData.pages, initialData.isUnavailable]);

  // Load chapter navigation list & siblings
  useEffect(() => {
    let isCancelled = false;

    async function loadNavigation() {
      setIsLoadingNav(true);
      const isNetTruyenChapter = initialData.chapterId.startsWith('nettruyen-');
      const cleanId = isNetTruyenChapter ? initialData.chapterId.replace(/^nettruyen-/, '') : '';
      const [comicSlug] = cleanId.split('__');

      // 1. Fast check from client sessionStorage
      if (typeof window !== 'undefined') {
        try {
          if (comicSlug) {
            const cached = sessionStorage.getItem(`nettruyen_chapters_${comicSlug}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const computed = computeNavigation(parsed, initialData.chapterId);
                if (!isCancelled) {
                  setNavData(computed);
                  setIsLoadingNav(false);
                  return;
                }
              }
            }
          }
          if (mangaId) {
            const cachedWc = sessionStorage.getItem(`weebcentral_chapters_${mangaId}`);
            if (cachedWc) {
              const parsed = JSON.parse(cachedWc);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const computed = computeNavigation(parsed, initialData.chapterId);
                if (!isCancelled) {
                  setNavData(computed);
                  setIsLoadingNav(false);
                  return;
                }
              }
            }
          }
        } catch {}
      }

      // 2. Fetch server-side navigation route
      try {
        const query = new URLSearchParams();
        if (mangaId) query.set('mangaId', mangaId);
        if (provider) query.set('provider', provider);

        const res = await fetch(
          `/api/chapter/${initialData.chapterId}/navigation?${query.toString()}`
        );
        if (res.ok) {
          const json = await res.json();
          if (
            json.success &&
            Array.isArray(json.chapters) &&
            json.chapters.length > 0 &&
            !isCancelled
          ) {
            setNavData({
              chapters: json.chapters,
              prevChapter: json.prevChapter,
              nextChapter: json.nextChapter,
              currentIndex: json.currentIndex,
            });
            setIsLoadingNav(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load chapter navigation from server:', err);
      }

      // 3. Client-side NetTruyen fallback on Vercel (bypasses AWS Lambda IP block)
      if (isNetTruyenChapter && comicSlug && !isCancelled) {
        try {
          const clientChapters = await fetchNetTruyenChaptersForComicClient(comicSlug);
          if (clientChapters && clientChapters.length > 0 && !isCancelled) {
            const computed = computeNavigation(clientChapters, initialData.chapterId);
            setNavData(computed);
          }
        } catch (clientErr) {
          console.error('Client navigation fallback failed:', clientErr);
        }
      }

      // 4. Client-side WeebCentral fallback on Vercel (bypasses AWS Lambda IP block)
      const isWeebCentralChapter = initialData.chapterId.startsWith('weebcentral-');
      if (isWeebCentralChapter && mangaId && !isCancelled) {
        try {
          let allTitles: string[] = [];
          const mangaRes = await fetch(`/api/manga/${mangaId}`);
          if (mangaRes.ok) {
            const mangaJson = await mangaRes.json();
            const mangaObj = mangaJson.data?.manga;
            allTitles =
              mangaJson.data?.allTitles ||
              [
                mangaObj?.title?.english,
                mangaObj?.title?.romaji,
                mangaObj?.title?.native,
                ...(mangaObj?.synonyms || []),
              ].filter(Boolean);
          }
          if (allTitles.length > 0) {
            const clientChapters = await fetchWeebcentralClientSide(allTitles);
            if (clientChapters && clientChapters.length > 0 && !isCancelled) {
              const computed = computeNavigation(clientChapters, initialData.chapterId);
              setNavData(computed);
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.setItem(`weebcentral_chapters_${mangaId}`, JSON.stringify(clientChapters));
                } catch {}
              }
            }
          }
        } catch (clientErr) {
          console.error('Client WeebCentral navigation fallback failed:', clientErr);
        }
      }

      if (!isCancelled) setIsLoadingNav(false);
    }

    loadNavigation();
    return () => {
      isCancelled = true;
    };
  }, [initialData.chapterId, mangaId, provider]);

  // Navigate to target chapter
  const navigateToChapter = useCallback(
    (targetChapterId: string) => {
      const query = new URLSearchParams();
      if (mangaId) query.set('mangaId', mangaId);
      if (provider) query.set('provider', provider);
      const url = `/read/${targetChapterId}${query.toString() ? `?${query.toString()}` : ''}`;
      router.push(url);
    },
    [mangaId, provider, router]
  );

  // Switch provider and jump to equivalent chapter
  const handleSwitchProvider = async (targetProviderId: string) => {
    if (targetProviderId === currentProvider) {
      setShowProviderMenu(false);
      return;
    }

    setIsSwitchingProvider(true);
    setSwitchingTargetId(targetProviderId);
    setShowProviderMenu(false);

    const currentChapterNum =
      initialData.chapterNumber ||
      initialData.chapterId.match(/(?:chuong|chapter)-(\d+(?:\.\d+)?)/i)?.[1] ||
      initialData.chapterId.match(/(\d+(?:\.\d+)?)$/)?.[1] ||
      '1';

    const targetProviderObj = PROVIDERS_LIST.find((p) => p.id === targetProviderId);
    setFeedbackMessage(
      `Finding Chapter ${currentChapterNum} on ${targetProviderObj?.name || targetProviderId}...`
    );

    const effectiveMangaId = mangaId || initialData.mangaId;

    try {
      let targetChapters: SimpleChapter[] = [];

      // 1. If switching to NetTruyen or WeebCentral, check client sessionStorage cache
      if (typeof window !== 'undefined') {
        if (targetProviderId === 'nettruyen') {
          const isNetTruyenChapter = initialData.chapterId.startsWith('nettruyen-');
          const cleanId = isNetTruyenChapter ? initialData.chapterId.replace(/^nettruyen-/, '') : '';
          const [comicSlug] = cleanId.split('__');
          if (comicSlug) {
            try {
              const cached = sessionStorage.getItem(`nettruyen_chapters_${comicSlug}`);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  targetChapters = parsed;
                }
              }
            } catch {}
          }
        } else if (targetProviderId === 'weebcentral' && effectiveMangaId) {
          try {
            const cached = sessionStorage.getItem(`weebcentral_chapters_${effectiveMangaId}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                targetChapters = parsed;
              }
            }
          } catch {}
        }
      }

      // 2. Fetch target provider chapters from server route
      if (targetChapters.length === 0 && effectiveMangaId) {
        const res = await fetch(
          `/api/manga/${effectiveMangaId}/chapters?provider=${targetProviderId}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            targetChapters = json.data;
          }
        }
      }

      // 3. Client-side fallback for NetTruyen on Vercel
      if (
        targetProviderId === 'nettruyen' &&
        (!targetChapters.length || !targetChapters.some((c) => c.id.startsWith('nettruyen-')))
      ) {
        if (effectiveMangaId) {
          try {
            const mangaRes = await fetch(`/api/manga/${effectiveMangaId}`);
            if (mangaRes.ok) {
              const mangaJson = await mangaRes.json();
              const mangaObj = mangaJson.data?.manga;
              const allTitles =
                mangaJson.data?.allTitles ||
                [
                  mangaObj?.title?.english,
                  mangaObj?.title?.romaji,
                  mangaObj?.title?.native,
                  ...(mangaObj?.synonyms || []),
                ].filter(Boolean);

              if (allTitles.length > 0) {
                const clientChapters = await fetchNetTruyenClientSide(allTitles);
                if (clientChapters && clientChapters.length > 0) {
                  targetChapters = clientChapters;
                  const firstId = clientChapters[0]?.id;
                  const slugMatch = firstId?.match(/^nettruyen-([^_]+)__/);
                  if (slugMatch?.[1] && typeof window !== 'undefined') {
                    sessionStorage.setItem(
                      `nettruyen_chapters_${slugMatch[1]}`,
                      JSON.stringify(clientChapters)
                    );
                  }
                }
              }
            }
          } catch (e) {
            console.error('Client-side NetTruyen resolution failed:', e);
          }
        }
      }

      // 3b. Client-side fallback for WeebCentral on Vercel
      if (
        targetProviderId === 'weebcentral' &&
        (!targetChapters.length || !targetChapters.some((c) => c.id.startsWith('weebcentral-')))
      ) {
        if (effectiveMangaId) {
          try {
            const mangaRes = await fetch(`/api/manga/${effectiveMangaId}`);
            if (mangaRes.ok) {
              const mangaJson = await mangaRes.json();
              const mangaObj = mangaJson.data?.manga;
              const allTitles =
                mangaJson.data?.allTitles ||
                [
                  mangaObj?.title?.english,
                  mangaObj?.title?.romaji,
                  mangaObj?.title?.native,
                  ...(mangaObj?.synonyms || []),
                ].filter(Boolean);

              if (allTitles.length > 0) {
                const clientChapters = await fetchWeebcentralClientSide(allTitles);
                if (clientChapters && clientChapters.length > 0) {
                  targetChapters = clientChapters;
                  if (typeof window !== 'undefined') {
                    try {
                      sessionStorage.setItem(
                        `weebcentral_chapters_${effectiveMangaId}`,
                        JSON.stringify(clientChapters)
                      );
                    } catch {}
                  }
                }
              }
            }
          } catch (e) {
            console.error('Client-side WeebCentral resolution failed:', e);
          }
        }
      }

      if (targetChapters.length === 0) {
        if (targetProviderId === 'weebcentral') {
          setFeedbackMessage(
            'WeebCentral server is currently unreachable (Error 523: Origin Down). Please use MangaDex or MangaPill.'
          );
        } else {
          setFeedbackMessage(
            `This manga is not available on ${targetProviderObj?.name || targetProviderId}`
          );
        }
        return;
      }

      // 4. Find matching chapter by number
      const currentNumFloat = parseFloat(currentChapterNum);
      let matchedChapter: SimpleChapter | undefined;

      if (!isNaN(currentNumFloat)) {
        matchedChapter = targetChapters.find((c) => {
          if (!c.chapter) return false;
          const cNum = parseFloat(c.chapter);
          return !isNaN(cNum) && Math.abs(cNum - currentNumFloat) < 0.001;
        });
      }

      if (!matchedChapter) {
        matchedChapter = targetChapters.find((c) => c.chapter === currentChapterNum);
      }

      if (!matchedChapter && !isNaN(currentNumFloat)) {
        matchedChapter = targetChapters.find((c) => {
          const m =
            c.id.match(/(?:chuong|chapter)-(\d+(?:\.\d+)?)/i) ||
            c.id.match(/(\d+(?:\.\d+)?)$/);
          return m?.[1] && parseFloat(m[1]) === currentNumFloat;
        });
      }

      // Nearest chapter fallback
      if (!matchedChapter && !isNaN(currentNumFloat) && targetChapters.length > 0) {
        let closest = targetChapters[0];
        let minDiff = Infinity;
        for (const ch of targetChapters) {
          const n = parseFloat(ch.chapter || '');
          if (!isNaN(n)) {
            const diff = Math.abs(n - currentNumFloat);
            if (diff < minDiff) {
              minDiff = diff;
              closest = ch;
            }
          }
        }
        if (closest) {
          matchedChapter = closest;
          setFeedbackMessage(
            `Chapter ${currentChapterNum} not found. Jumping to Ch. ${closest.chapter || ''}...`
          );
        }
      }

      const finalChapter = matchedChapter || targetChapters[0];
      if (finalChapter) {
        const query = new URLSearchParams();
        if (effectiveMangaId) query.set('mangaId', String(effectiveMangaId));
        query.set('provider', targetProviderId);
        router.push(`/read/${finalChapter.id}?${query.toString()}`);
      } else {
        router.push(
          effectiveMangaId
            ? `/manga/${effectiveMangaId}?provider=${targetProviderId}`
            : '/'
        );
      }
    } catch (err) {
      console.error('Error switching provider:', err);
      setFeedbackMessage('Failed to switch provider. Redirecting...');
      setTimeout(() => {
        router.push(
          effectiveMangaId
            ? `/manga/${effectiveMangaId}?provider=${targetProviderId}`
            : '/'
        );
      }, 1200);
    } finally {
      setIsSwitchingProvider(false);
      setSwitchingTargetId(null);
    }
  };

  // Provider Switcher Button and Dropdown
  const renderProviderSwitcher = (align: 'right' | 'left' = 'right') => (
    <div className="relative" ref={providerDropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowProviderMenu((prev) => !prev);
        }}
        disabled={isSwitchingProvider}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 transition-colors shadow-sm disabled:opacity-50"
        title="Switch reading provider / source"
        aria-label="Switch reading provider"
      >
        {isSwitchingProvider ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : (
          <span className="text-sm leading-none">{currentProviderMeta.icon}</span>
        )}
        <span className="hidden sm:inline font-medium">{currentProviderMeta.name}</span>
        <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-bold border border-zinc-700/50">
          {currentProviderMeta.badge}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            showProviderMenu ? 'rotate-180' : ''
          }`}
        />
      </button>

      {showProviderMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-56 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-1.5 z-50`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 mb-1 flex items-center justify-between">
            <span>Change Provider</span>
            <Globe className="w-3 h-3 text-zinc-500" />
          </div>
          <div className="space-y-0.5">
            {PROVIDERS_LIST.map((p) => {
              const isCurrent = p.id === currentProvider;
              const isTargetLoading = isSwitchingProvider && switchingTargetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitchProvider(p.id)}
                  disabled={isSwitchingProvider}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/20'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.icon}</span>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-bold border border-zinc-700/50">
                      {p.badge}
                    </span>
                  </div>
                  {isTargetLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  ) : isCurrent ? (
                    <Check className="w-4 h-4 text-indigo-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // 1. SMART IMAGE PRELOADING (loading the next 3 pages ahead into memory)
  useEffect(() => {
    if (pages.length === 0) return;

    const preloadIndices = [
      currentPageIndex + 1,
      currentPageIndex + 2,
      currentPageIndex + 3,
    ].filter((i) => i < pages.length);

    preloadIndices.forEach((idx) => {
      const page = pages[idx];
      if (page?.url) {
        const img = new window.Image();
        img.src = page.url;
      }
    });
  }, [currentPageIndex, pages]);

  // 2. INTERSECTION OBSERVER FOR VERTICAL (WEBTOON) SCROLLING
  useEffect(() => {
    if (readingMode !== 'vertical' || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIndex = Number(entry.target.getAttribute('data-page-index'));
            if (!isNaN(pageIndex)) {
              setCurrentPageIndex(pageIndex);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [readingMode, pages.length]);

  // 3. KEYBOARD NAVIGATION
  const goToNextPage = useCallback(() => {
    if (readingMode === 'single') {
      setCurrentPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const nextIdx = Math.min(currentPageIndex + 1, pages.length - 1);
      pageRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [readingMode, pages.length, currentPageIndex]);

  const goToPrevPage = useCallback(() => {
    if (readingMode === 'single') {
      setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const prevIdx = Math.max(currentPageIndex - 1, 0);
      pageRefs.current[prevIdx]?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [readingMode, currentPageIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          goToNextPage();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          goToPrevPage();
          break;
        case '[':
        case 'p':
        case 'P':
          if (navData?.prevChapter) {
            e.preventDefault();
            navigateToChapter(navData.prevChapter.id);
          }
          break;
        case ']':
        case 'n':
        case 'N':
          if (navData?.nextChapter) {
            e.preventDefault();
            navigateToChapter(navData.nextChapter.id);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setReadingMode((prev) => (prev === 'vertical' ? 'single' : 'vertical'));
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          setShowBars((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, navData, navigateToChapter]);

  // 4. FULLSCREEN TOGGLE
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Handle external source (e.g. MangaPlus) - Official Publisher Stream
  if (initialData.externalUrl) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        {/* Top Header Bar */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors shrink-0"
              title="Return to Manga details"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Quick Next/Prev */}
            <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              <button
                onClick={() => navData?.prevChapter && navigateToChapter(navData.prevChapter.id)}
                disabled={!navData?.prevChapter}
                className="p-1 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
                title={navData?.prevChapter ? `Previous Chapter (${navData.prevChapter.chapter})` : 'No previous chapter'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {navData?.chapters && navData.chapters.length > 0 && (
                <select
                  value={initialData.chapterId}
                  onChange={(e) => navigateToChapter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-200 px-1 py-0.5 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
                >
                  {navData.chapters.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-zinc-900 text-zinc-100">
                      {ch.chapter ? `Chapter ${ch.chapter}` : 'Chapter'}
                      {ch.title ? `: ${ch.title}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => navData?.nextChapter && navigateToChapter(navData.nextChapter.id)}
                disabled={!navData?.nextChapter}
                className="p-1 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
                title={navData?.nextChapter ? `Next Chapter (${navData.nextChapter.chapter})` : 'No next chapter'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderProviderSwitcher('right')}
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Back to Chapters
            </Link>
          </div>
        </header>

        {/* Official Publisher Content Notice & Direct Reader Launch */}
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl text-center space-y-5 mt-14 backdrop-blur-md">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <BookOpen className="w-7 h-7" />
          </div>

          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider mb-2">
              Official Licensed Release
            </span>
            <h2 className="text-xl font-bold text-white">
              {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Official Chapter'}
              {initialData.title ? `: ${initialData.title}` : ''}
            </h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              This chapter is hosted and licensed officially by <strong>MangaPlus by SHUEISHA</strong>. Because official publishers block third-party browser embedding, it opens directly in their official web viewer.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <a
              href={initialData.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-102 active:scale-98"
            >
              <span>Read on MangaPlus (Free)</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Next Chapter Button if available */}
            {navData?.nextChapter && (
              <button
                onClick={() => navigateToChapter(navData.nextChapter!.id)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                Go to Next Chapter ({navData.nextChapter.chapter ? `Ch. ${navData.nextChapter.chapter}` : 'Next'}) →
              </button>
            )}

            {/* Alternative In-App Providers */}
            <div className="pt-3 border-t border-zinc-800/80 text-left space-y-2">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center">
                Or switch provider to read in-app:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS_LIST.filter((p) => p.id !== currentProvider).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProvider(p.id)}
                    disabled={isSwitchingProvider}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                    <span className="text-[9px] text-zinc-400 font-bold">[{p.badge}]</span>
                  </button>
                ))}
              </div>
            </div>

            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              Return to Chapter List
            </Link>
          </div>
        </div>

        {feedbackMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-indigo-500/40 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Loading screen when fetching client fallback (e.g. NetTruyen)
  if (isLoadingPages) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-sm font-bold text-white">
              {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Loading Chapter'}
            </span>
          </div>
          <Link
            href={mangaId ? `/manga/${mangaId}` : '/'}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Back to Chapters
          </Link>
        </header>

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400 font-medium animate-pulse">
            Đang tải chương {initialData.chapterNumber || ''}...
          </p>
        </div>
      </div>
    );
  }

  // Handle unavailable chapter (e.g. MangaDex 404 / deleted files)
  if (isUnavailable || (!isLoadingPages && pages.length === 0)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        {/* Top Header Bar */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-sm font-bold text-white">
              {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Chapter'}
            </span>
          </div>

          {/* Quick Chapter Selector */}
          {navData?.chapters && navData.chapters.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              <button
                onClick={() => navData?.prevChapter && navigateToChapter(navData.prevChapter.id)}
                disabled={!navData?.prevChapter}
                className="p-1 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={initialData.chapterId}
                onChange={(e) => navigateToChapter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-zinc-200 px-1 py-0.5 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                {navData.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id} className="bg-zinc-900 text-zinc-100">
                    {ch.chapter ? `Chapter ${ch.chapter}` : 'Chapter'}
                  </option>
                ))}
              </select>
              <button
                onClick={() => navData?.nextChapter && navigateToChapter(navData.nextChapter.id)}
                disabled={!navData?.nextChapter}
                className="p-1 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {renderProviderSwitcher('right')}
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Back to Chapters
            </Link>
          </div>
        </header>

        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl text-center space-y-5 mt-14 backdrop-blur-md">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold uppercase tracking-wider mb-2">
              Chapter Unavailable
            </span>
            <h2 className="text-xl font-bold text-white">
              {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Chapter'} Unavailable
            </h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              {initialData.errorMessage ||
                'The scanlation files for this chapter could not be retrieved from the provider.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {navData?.nextChapter && (
              <button
                onClick={() => navigateToChapter(navData.nextChapter!.id)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
              >
                Try Next Chapter ({navData.nextChapter.chapter ? `Ch. ${navData.nextChapter.chapter}` : 'Next'}) →
              </button>
            )}

            {/* Alternative Provider Quick Switches */}
            <div className="pt-3 border-t border-zinc-800/80 text-left space-y-2">
              <p className="text-xs text-zinc-400 text-center">
                Try switching to another provider for this chapter:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS_LIST.filter((p) => p.id !== currentProvider).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProvider(p.id)}
                    disabled={isSwitchingProvider}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                    <span className="text-[9px] text-zinc-400 font-bold">[{p.badge}]</span>
                  </button>
                ))}
              </div>
            </div>

            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-all border border-zinc-700"
            >
              Return to Chapter List
            </Link>
          </div>
        </div>

        {feedbackMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-indigo-500/40 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Width container sizing
  const getWidthClass = () => {
    switch (widthMode) {
      case 'fit':
        return 'max-w-2xl';
      case 'medium':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-6xl';
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-950 text-zinc-100 relative select-none flex flex-col items-center"
    >
      {/* FLOATING TOP HEADER BAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showBars
            ? 'translate-y-0 opacity-100 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 shadow-xl'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
          {/* Back button & Chapter Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors shrink-0"
              title="Return to Manga details"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Chapter Navigation Controls: Prev, Dropdown, Next */}
            <div className="flex items-center gap-1 bg-zinc-900/90 rounded-xl p-1 border border-zinc-800 shadow-sm">
              {/* Previous Chapter */}
              <button
                onClick={() => navData?.prevChapter && navigateToChapter(navData.prevChapter.id)}
                disabled={!navData?.prevChapter}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={
                  navData?.prevChapter
                    ? `Previous Chapter (${navData.prevChapter.chapter ? `Ch. ${navData.prevChapter.chapter}` : 'Prev'}) [P or []`
                    : 'No previous chapter'
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Chapter Dropdown Select */}
              <div className="relative flex items-center">
                <select
                  value={initialData.chapterId}
                  onChange={(e) => navigateToChapter(e.target.value)}
                  disabled={isLoadingNav || !navData?.chapters?.length}
                  className="bg-transparent text-xs font-bold text-zinc-200 hover:text-white px-2 py-1 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[190px] md:max-w-[240px] truncate"
                >
                  {navData?.chapters && navData.chapters.length > 0 ? (
                    navData.chapters.map((ch) => (
                      <option key={ch.id} value={ch.id} className="bg-zinc-900 text-zinc-100">
                        {ch.chapter ? `Chapter ${ch.chapter}` : 'Chapter'}
                        {ch.title ? `: ${ch.title}` : ''}
                      </option>
                    ))
                  ) : (
                    <option value={initialData.chapterId} className="bg-zinc-900 text-zinc-100">
                      {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Current Chapter'}
                    </option>
                  )}
                </select>
              </div>

              {/* Next Chapter */}
              <button
                onClick={() => navData?.nextChapter && navigateToChapter(navData.nextChapter.id)}
                disabled={!navData?.nextChapter}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={
                  navData?.nextChapter
                    ? `Next Chapter (${navData.nextChapter.chapter ? `Ch. ${navData.nextChapter.chapter}` : 'Next'}) [N or ]]`
                    : 'No next chapter'
                }
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Page Count info */}
            <span className="hidden lg:inline text-xs text-zinc-400 truncate">
              Page {currentPageIndex + 1}/{pages.length}
            </span>
          </div>

          {/* Reader Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Provider Switcher Dropdown */}
            {renderProviderSwitcher('right')}

            {/* Reading Mode Switcher */}
            <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
              <button
                onClick={() => setReadingMode('vertical')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  readingMode === 'vertical'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Continuous Vertical (Webtoon) Mode [M]"
              >
                <Scroll className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Webtoon</span>
              </button>
              <button
                onClick={() => setReadingMode('single')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  readingMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Single Page Reader Mode [M]"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Single</span>
              </button>
            </div>

            {/* Width Adjustment */}
            <button
              onClick={() => {
                const modes: ('fit' | 'medium' | 'full')[] = ['fit', 'medium', 'full'];
                const nextIdx = (modes.indexOf(widthMode) + 1) % modes.length;
                setWidthMode(modes[nextIdx]);
              }}
              className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
              title="Toggle width fit"
            >
              Width: {widthMode}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
              title="Toggle Fullscreen [F]"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* READER CONTENT AREA */}
      <main
        className={`w-full ${getWidthClass()} transition-all duration-300 pt-16 pb-24 min-h-screen flex flex-col items-center px-2 sm:px-0`}
        onClick={() => setShowBars((prev) => !prev)}
      >
        {pages.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <p className="text-base font-semibold">No pages loaded for this chapter.</p>
          </div>
        ) : readingMode === 'vertical' ? (
          /* CONTINUOUS VERTICAL SCROLL MODE (WEBTOON STYLE) */
          <div className="w-full flex flex-col items-center gap-1">
            {pages.map((page, index) => (
              <div
                key={page.pageNumber}
                ref={(el) => {
                  pageRefs.current[index] = el;
                }}
                data-page-index={index}
                className="w-full relative bg-zinc-900/50 flex flex-col items-center min-h-[400px]"
              >
                {/* Skeleton shimmer while loading */}
                {!loadedPages[index] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse text-zinc-600 text-xs font-medium">
                    Loading page {page.pageNumber}...
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.url}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-auto block select-none pointer-events-auto shadow-md"
                  loading={index <= 2 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  onLoad={() => {
                    setLoadedPages((prev) => ({ ...prev, [index]: true }));
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const proxyBase = process.env.NEXT_PUBLIC_PROXY_URL || '';
                    if (proxyBase && page.originalUrl && !target.dataset.triedWorker) {
                      target.dataset.triedWorker = 'true';
                      target.src = `${proxyBase}/?url=${encodeURIComponent(page.originalUrl)}`;
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* SINGLE PAGE READER MODE */
          <div
            className="w-full flex-1 flex flex-col items-center justify-center relative min-h-[80vh]"
            onClick={(e) => {
              // Clicking left half goes prev, clicking right half goes next
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              if (clickX < rect.width * 0.35) {
                e.stopPropagation();
                goToPrevPage();
              } else if (clickX > rect.width * 0.65) {
                e.stopPropagation();
                goToNextPage();
              }
            }}
          >
            {pages[currentPageIndex] && (
              <div className="relative w-full flex items-center justify-center min-h-[600px] bg-zinc-950">
                {!loadedPages[currentPageIndex] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse text-zinc-600 text-xs">
                    Loading page {currentPageIndex + 1}...
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pages[currentPageIndex].url}
                  alt={`Page ${currentPageIndex + 1}`}
                  className="max-h-[92vh] w-auto max-w-full object-contain mx-auto shadow-2xl rounded-sm"
                  onLoad={() => {
                    setLoadedPages((prev) => ({ ...prev, [currentPageIndex]: true }));
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const original = pages[currentPageIndex]?.originalUrl;
                    const proxyBase = process.env.NEXT_PUBLIC_PROXY_URL || '';
                    if (proxyBase && original && !target.dataset.triedWorker) {
                      target.dataset.triedWorker = 'true';
                      target.src = `${proxyBase}/?url=${encodeURIComponent(original)}`;
                    }
                  }}
                />
              </div>
            )}

            {/* Click navigation overlays */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevPage();
              }}
              disabled={currentPageIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 disabled:opacity-20 border border-zinc-700/60 backdrop-blur-md transition-all shadow-lg"
              title="Previous Page [Left Arrow]"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextPage();
              }}
              disabled={currentPageIndex === pages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 disabled:opacity-20 border border-zinc-700/60 backdrop-blur-md transition-all shadow-lg"
              title="Next Page [Right Arrow]"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* END OF CHAPTER NAVIGATION CARD */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full mt-10 p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-2xl text-center space-y-6"
        >
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              Finished Reading
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Chapter Completed'}
              {initialData.title ? ` - ${initialData.title}` : ''}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Continue reading the next chapter or pick from the chapter list below
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            {/* Previous Chapter */}
            <button
              onClick={() => navData?.prevChapter && navigateToChapter(navData.prevChapter.id)}
              disabled={!navData?.prevChapter}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold border border-zinc-700 transition-all active:scale-98"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>
                {navData?.prevChapter?.chapter ? `Chapter ${navData.prevChapter.chapter}` : 'Previous Chapter'}
              </span>
            </button>

            {/* Next Chapter (Highlight) */}
            <button
              onClick={() => navData?.nextChapter && navigateToChapter(navData.nextChapter.id)}
              disabled={!navData?.nextChapter}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:opacity-30 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-102 active:scale-98"
            >
              <span>
                {navData?.nextChapter?.chapter ? `Chapter ${navData.nextChapter.chapter}` : 'Next Chapter'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Dropdown & Manga Overview Return */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {navData?.chapters && navData.chapters.length > 0 && (
              <div className="relative">
                <select
                  value={initialData.chapterId}
                  onChange={(e) => navigateToChapter(e.target.value)}
                  className="bg-zinc-800 text-xs font-medium text-zinc-200 px-4 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-xs"
                >
                  {navData.chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.chapter ? `Chapter ${ch.chapter}` : 'Chapter'}
                      {ch.title ? `: ${ch.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mangaId && (
              <Link
                href={`/manga/${mangaId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Manga Overview</span>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* FLOATING BOTTOM ACTION BAR */}
      <footer
        className={`fixed bottom-4 z-50 transition-all duration-300 ${
          showBars
            ? 'translate-y-0 opacity-100'
            : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-2xl text-xs text-zinc-300">
          {/* Quick Chapter Navigation in Bottom Bar */}
          {navData?.prevChapter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateToChapter(navData.prevChapter!.id);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              title={`Previous Chapter (${navData.prevChapter.chapter || ''}) [P]`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Ch</span>
            </button>
          )}

          {/* Progress Indicator */}
          <span className="font-semibold text-white px-2">
            {currentPageIndex + 1} / {pages.length}
          </span>

          {/* Quick Page Prev/Next in Single Mode */}
          {readingMode === 'single' && (
            <>
              <div className="h-4 w-px bg-zinc-700 mx-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevPage();
                }}
                disabled={currentPageIndex === 0}
                className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextPage();
                }}
                disabled={currentPageIndex === pages.length - 1}
                className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {navData?.nextChapter && (
            <>
              <div className="h-4 w-px bg-zinc-700 mx-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToChapter(navData.nextChapter!.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-sm"
                title={`Next Chapter (${navData.nextChapter.chapter || ''}) [N]`}
              >
                <span className="hidden sm:inline">Next Ch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Back to top */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-1 p-1.5 px-2.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Scroll to top"
          >
            <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Top</span>
          </button>
        </div>
      </footer>

      {/* Toast Feedback for Provider Switch */}
      {feedbackMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-indigo-500/40 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}
    </div>
  );
}
