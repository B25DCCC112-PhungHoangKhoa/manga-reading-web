'use client';

import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import MangaCard from './MangaCard';
import { AniListManga, PageInfo } from '@/lib/types';

interface MangaGridProps {
  id?: string;
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  items: AniListManga[];
  apiEndpoint?: string; // e.g. '/api/anilist/trending' or '/api/anilist/latest'
  initialPageInfo?: PageInfo;
  perPage?: number;
}

function MangaCardSkeleton() {
  return (
    <div className="flex flex-col bg-zinc-900/40 rounded-xl overflow-hidden border border-zinc-800/80 animate-pulse">
      <div className="relative aspect-[3/4] w-full bg-zinc-800/70" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-zinc-800/80 rounded w-5/6" />
        <div className="h-3 bg-zinc-800/50 rounded w-1/2" />
        <div className="flex justify-between pt-1">
          <div className="h-2.5 bg-zinc-800/40 rounded w-1/3" />
          <div className="h-2.5 bg-zinc-800/40 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default function MangaGrid({
  id,
  title,
  icon,
  subtitle,
  items: initialItems,
  apiEndpoint,
  initialPageInfo,
  perPage = 18,
}: MangaGridProps) {
  const [items, setItems] = useState<AniListManga[]>(initialItems);
  const [currentPage, setCurrentPage] = useState<number>(initialPageInfo?.currentPage || 1);
  const [totalPages, setTotalPages] = useState<number>(initialPageInfo?.lastPage || 50);
  const [hasNextPage, setHasNextPage] = useState<boolean>(initialPageInfo?.hasNextPage ?? true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // In-memory page cache to make revisiting pages instantaneous
  const pageCache = useRef<Record<number, AniListManga[]>>({
    [initialPageInfo?.currentPage || 1]: initialItems,
  });

  // Keep items updated if initialItems changes externally
  useEffect(() => {
    setItems(initialItems);
    pageCache.current[initialPageInfo?.currentPage || 1] = initialItems;
    if (initialPageInfo?.lastPage) {
      setTotalPages(initialPageInfo.lastPage);
    }
  }, [initialItems, initialPageInfo]);

  const handlePageChange = async (newPage: number) => {
    if (newPage === currentPage || newPage < 1 || newPage > totalPages || isLoading) return;

    // Check memory cache first
    if (pageCache.current[newPage] && pageCache.current[newPage].length > 0) {
      setItems(pageCache.current[newPage]);
      setCurrentPage(newPage);
      scrollToSection();
      return;
    }

    if (!apiEndpoint) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}?page=${newPage}&perPage=${perPage}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setItems(json.data);
          pageCache.current[newPage] = json.data;
          setCurrentPage(newPage);
          if (json.pageInfo) {
            setTotalPages(json.pageInfo.lastPage || totalPages);
            setHasNextPage(json.pageInfo.hasNextPage ?? true);
          }
          scrollToSection();
        }
      }
    } catch (err) {
      console.error(`Failed to fetch page ${newPage} for ${title}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = () => {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // clear fixed navbar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
      return pages;
    }

    if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    pages.push('...');
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  if (!items || items.length === 0) return null;

  return (
    <section id={id} className="py-8 scroll-mt-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-indigo-400">{icon}</span>}
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {title}
            </h2>
            {isLoading && (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin ml-1" />
            )}
          </div>
          {subtitle && (
            <p className="text-xs md:text-sm text-zinc-400 mt-1">{subtitle}</p>
          )}
        </div>

        {apiEndpoint && totalPages > 1 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">
              Page <span className="text-zinc-200 font-semibold">{currentPage}</span> of{' '}
              <span className="text-zinc-200 font-semibold">{totalPages}</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
        {isLoading
          ? Array.from({ length: perPage }).map((_, idx) => (
              <MangaCardSkeleton key={`skeleton-${idx}`} />
            ))
          : items.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
      </div>

      {/* Pagination Controls */}
      {apiEndpoint && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400 order-2 sm:order-1 font-medium">
            Showing Page <span className="text-zinc-200 font-bold">{currentPage}</span> of{' '}
            <span className="text-zinc-200 font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="px-1.5 py-1 text-xs text-zinc-500 font-medium select-none"
                    >
                      ...
                    </span>
                  );
                }
                const pageNum = Number(p);
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    disabled={isLoading || isActive}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[32px] h-8 flex items-center justify-center px-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/30 cursor-default'
                        : 'bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!hasNextPage || currentPage >= totalPages || isLoading}
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
