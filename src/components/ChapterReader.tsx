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
} from 'lucide-react';
import { ChapterPagesResponse } from '@/lib/types';

interface ChapterReaderProps {
  initialData: ChapterPagesResponse;
  mangaId?: string;
}

export default function ChapterReader({ initialData, mangaId }: ChapterReaderProps) {
  const router = useRouter();
  const [pages] = useState(initialData.pages || []);
  const [readingMode, setReadingMode] = useState<'vertical' | 'single'>('vertical');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBars, setShowBars] = useState(true);
  const [widthMode, setWidthMode] = useState<'fit' | 'medium' | 'full'>('medium');

  // Track page image load status
  const [loadedPages, setLoadedPages] = useState<Record<number, boolean>>({});

  // Container refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. SMART IMAGE PRELOADING (loading the next 3 pages ahead into memory)
  useEffect(() => {
    if (pages.length === 0) return;

    // Target the next 3 pages
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
      // Don't trigger if user is typing in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
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
  }, [goToNextPage, goToPrevPage]);

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
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors shrink-0"
              title="Return to Manga details"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Official Reader'}
                {initialData.title ? `: ${initialData.title}` : ''}
              </h1>
              <span className="text-[11px] text-amber-400 font-medium">
                Official Publisher Release (Shueisha / MangaPlus)
              </span>
            </div>
          </div>

          <Link
            href={mangaId ? `/manga/${mangaId}` : '/'}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Back to Chapters
          </Link>
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
              This chapter is hosted and licensed officially by <strong>MangaPlus by SHUEISHA</strong>. Because official publishers block third-party browser embedding to protect digital copyright, it opens directly in their official web viewer.
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

            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              Return to Chapter List
            </Link>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-left text-[11px] text-zinc-400 space-y-1">
            <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Tip for full in-app reading:
            </span>
            <p className="leading-relaxed">
              On the manga page, look for the <strong>Edition / Source</strong> dropdown and switch to the <em>Official Colored Edition</em> to read 760+ chapters directly inside this website without external links!
            </p>
          </div>
        </div>
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
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Back button & Chapter Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={mangaId ? `/manga/${mangaId}` : '/'}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
              title="Return to Manga details"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {initialData.chapterNumber ? `Chapter ${initialData.chapterNumber}` : 'Chapter'}
                {initialData.title ? `: ${initialData.title}` : ''}
              </h1>
              <p className="text-xs text-zinc-400">
                Page {currentPageIndex + 1} of {pages.length}
              </p>
            </div>
          </div>

          {/* Reader Controls */}
          <div className="flex items-center gap-2">
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
        className={`w-full ${getWidthClass()} transition-all duration-300 pt-16 pb-24 min-h-screen flex flex-col items-center`}
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
                  // Fetch priority high for first 2 pages, standard/low for subsequent
                  fetchPriority={index === 0 ? 'high' : undefined}
                  onLoad={() => {
                    setLoadedPages((prev) => ({ ...prev, [index]: true }));
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
      </main>

      {/* FLOATING BOTTOM ACTION BAR */}
      <footer
        className={`fixed bottom-4 z-50 transition-all duration-300 ${
          showBars
            ? 'translate-y-0 opacity-100'
            : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-2xl text-xs text-zinc-300">
          {/* Progress Indicator */}
          <span className="font-semibold text-white px-2">
            {currentPageIndex + 1} / {pages.length}
          </span>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Quick Page Prev/Next in Single Mode */}
          {readingMode === 'single' && (
            <>
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
              <div className="h-4 w-px bg-zinc-700 mx-1" />
            </>
          )}

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
    </div>
  );
}

