'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  BookX,
  Sparkles,
} from 'lucide-react';
import AnimeFilterSidebar from '@/components/AnimeFilterSidebar';
import ActiveFilterChips from '@/components/ActiveFilterChips';
import AnimeCard from '@/components/AnimeCard';
import AnimePreviewModal from '@/components/AnimePreviewModal';
import FilterSkeleton from '@/components/FilterSkeleton';
import { AniListMedia, AnimeFilterOptions, PageInfo } from '@/lib/types';

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL searchParams
  const getFiltersFromUrl = useCallback((): AnimeFilterOptions => {
    return {
      search: searchParams.get('q') || searchParams.get('search') || undefined,
      type: (searchParams.get('type') as 'ANIME' | 'MANGA') || 'ANIME',
      genres: searchParams.get('genres')
        ? searchParams.get('genres')!.split(',').filter(Boolean)
        : undefined,
      format: searchParams.get('format')
        ? searchParams.get('format')!.split(',').filter(Boolean)
        : undefined,
      status: searchParams.get('status') || undefined,
      year: searchParams.get('year')
        ? parseInt(searchParams.get('year')!, 10)
        : undefined,
      yearMin: searchParams.get('yearMin')
        ? parseInt(searchParams.get('yearMin')!, 10)
        : undefined,
      yearMax: searchParams.get('yearMax')
        ? parseInt(searchParams.get('yearMax')!, 10)
        : undefined,
      season:
        (searchParams.get('season') as AnimeFilterOptions['season']) ||
        undefined,
      minScore: searchParams.get('minScore')
        ? parseFloat(searchParams.get('minScore')!)
        : undefined,
      ageRating: searchParams.get('ageRating') || undefined,
      source: searchParams.get('source')
        ? searchParams.get('source')!.split(',').filter(Boolean)
        : undefined,
      episodes: searchParams.get('episodes') || undefined,
      sort: searchParams.get('sort') || 'POPULARITY_DESC',
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: 24,
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<AnimeFilterOptions>(getFiltersFromUrl);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [mediaList, setMediaList] = useState<AniListMedia[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    total: 0,
    perPage: 24,
    currentPage: 1,
    lastPage: 1,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<AniListMedia | null>(null);

  // Sync state with URL if user navigates back/forward
  useEffect(() => {
    const urlFilters = getFiltersFromUrl();
    setFilters(urlFilters);
    setSearchInput(urlFilters.search || '');
  }, [getFiltersFromUrl]);

  // Push new filters into URL
  const updateUrlWithFilters = useCallback(
    (newFilters: AnimeFilterOptions) => {
      const params = new URLSearchParams();

      if (newFilters.search) params.set('q', newFilters.search);
      if (newFilters.type && newFilters.type !== 'ANIME')
        params.set('type', newFilters.type);
      if (newFilters.genres && newFilters.genres.length > 0)
        params.set('genres', newFilters.genres.join(','));
      if (newFilters.format && newFilters.format.length > 0)
        params.set('format', newFilters.format.join(','));
      if (newFilters.status && newFilters.status !== 'ALL')
        params.set('status', newFilters.status);
      if (newFilters.year) params.set('year', String(newFilters.year));
      if (newFilters.yearMin) params.set('yearMin', String(newFilters.yearMin));
      if (newFilters.yearMax) params.set('yearMax', String(newFilters.yearMax));
      if (newFilters.season && newFilters.season !== 'ALL')
        params.set('season', newFilters.season);
      if (newFilters.minScore && newFilters.minScore > 0)
        params.set('minScore', String(newFilters.minScore));
      if (newFilters.ageRating && newFilters.ageRating !== 'ALL')
        params.set('ageRating', newFilters.ageRating);
      if (newFilters.source && newFilters.source.length > 0)
        params.set('source', newFilters.source.join(','));
      if (newFilters.episodes && newFilters.episodes !== 'ALL')
        params.set('episodes', newFilters.episodes);
      if (newFilters.sort && newFilters.sort !== 'POPULARITY_DESC')
        params.set('sort', newFilters.sort);
      if (newFilters.page && newFilters.page > 1)
        params.set('page', String(newFilters.page));

      const queryStr = params.toString();
      const newUrl = queryStr ? `/browse?${queryStr}` : '/browse';
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  // Fetch results whenever filters change
  const fetchResults = useCallback(async (activeFilters: AnimeFilterOptions) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilters.search) params.set('q', activeFilters.search);
      if (activeFilters.type) params.set('type', activeFilters.type);
      if (activeFilters.genres && activeFilters.genres.length > 0)
        params.set('genres', activeFilters.genres.join(','));
      if (activeFilters.format && activeFilters.format.length > 0)
        params.set('format', activeFilters.format.join(','));
      if (activeFilters.status && activeFilters.status !== 'ALL')
        params.set('status', activeFilters.status);
      if (activeFilters.year) params.set('year', String(activeFilters.year));
      if (activeFilters.yearMin)
        params.set('yearMin', String(activeFilters.yearMin));
      if (activeFilters.yearMax)
        params.set('yearMax', String(activeFilters.yearMax));
      if (activeFilters.season && activeFilters.season !== 'ALL')
        params.set('season', activeFilters.season);
      if (activeFilters.minScore && activeFilters.minScore > 0)
        params.set('minScore', String(activeFilters.minScore));
      if (activeFilters.ageRating && activeFilters.ageRating !== 'ALL')
        params.set('ageRating', activeFilters.ageRating);
      if (activeFilters.source && activeFilters.source.length > 0)
        params.set('source', activeFilters.source.join(','));
      if (activeFilters.episodes && activeFilters.episodes !== 'ALL')
        params.set('episodes', activeFilters.episodes);
      if (activeFilters.sort) params.set('sort', activeFilters.sort);
      params.set('page', String(activeFilters.page || 1));
      params.set('perPage', '24');

      const res = await fetch(`/api/discover?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMediaList(json.data || []);
          setPageInfo(
            json.pageInfo || {
              total: 0,
              perPage: 24,
              currentPage: 1,
              lastPage: 1,
              hasNextPage: false,
            }
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch filtered anime:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run fetch whenever filters state updates
  useEffect(() => {
    fetchResults(filters);
  }, [filters, fetchResults]);

  // Debounced search text handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((searchInput.trim() || undefined) !== filters.search) {
        const next: AnimeFilterOptions = {
          ...filters,
          search: searchInput.trim() || undefined,
          page: 1,
        };
        setFilters(next);
        updateUrlWithFilters(next);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchInput, filters, updateUrlWithFilters]);

  // Generic filter update handler (resets page to 1)
  const handleFilterChange = (partial: Partial<AnimeFilterOptions>) => {
    const next: AnimeFilterOptions = {
      ...filters,
      ...partial,
      page: 1,
    };
    setFilters(next);
    updateUrlWithFilters(next);
  };

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pageInfo.lastPage) return;
    const next = { ...filters, page: newPage };
    setFilters(next);
    updateUrlWithFilters(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Remove individual active filter chip
  const handleRemoveFilter = (
    key: keyof AnimeFilterOptions,
    value?: string
  ) => {
    const next = { ...filters, page: 1 };
    if (key === 'genres' && value) {
      next.genres = (next.genres || []).filter((g) => g !== value);
      if (next.genres.length === 0) delete next.genres;
    } else if (key === 'format' && value) {
      next.format = (next.format || []).filter((f) => f !== value);
      if (next.format.length === 0) delete next.format;
    } else if (key === 'source' && value) {
      next.source = (next.source || []).filter((s) => s !== value);
      if (next.source.length === 0) delete next.source;
    } else if (key === 'yearMin' || key === 'yearMax') {
      delete next.yearMin;
      delete next.yearMax;
    } else if (key === 'search') {
      delete next.search;
      setSearchInput('');
    } else {
      delete next[key];
    }
    setFilters(next);
    updateUrlWithFilters(next);
  };

  // Reset all filters
  const handleResetAll = () => {
    const defaultFilters: AnimeFilterOptions = {
      type: 'ANIME',
      sort: 'POPULARITY_DESC',
      page: 1,
      perPage: 24,
    };
    setSearchInput('');
    setFilters(defaultFilters);
    updateUrlWithFilters(defaultFilters);
  };

  // Count active filters (excluding defaults)
  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.type && filters.type !== 'ANIME' ? 1 : 0) +
    (filters.genres?.length || 0) +
    (filters.format?.length || 0) +
    (filters.status && filters.status !== 'ALL' ? 1 : 0) +
    (filters.season && filters.season !== 'ALL' ? 1 : 0) +
    (filters.year || filters.yearMin ? 1 : 0) +
    (filters.minScore && filters.minScore > 0 ? 1 : 0) +
    (filters.ageRating && filters.ageRating !== 'ALL' ? 1 : 0) +
    (filters.source?.length || 0) +
    (filters.episodes && filters.episodes !== 'ALL' ? 1 : 0) +
    (filters.sort && filters.sort !== 'POPULARITY_DESC' ? 1 : 0);

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Search Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Discover Anime & Manga
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Browse, filter, and search across thousands of animated series, movies, and source titles.
              </p>
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by anime title, alternative romaji/english name, or keywords..."
              className="w-full bg-zinc-900/90 text-sm text-zinc-100 placeholder-zinc-500 pl-11 pr-10 py-3 rounded-2xl border border-zinc-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          <ActiveFilterChips
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
            onResetAll={handleResetAll}
          />
        </div>

        {/* Main Two-Column Layout */}
        <div className="flex gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto backdrop-blur-md shadow-xl">
            <AnimeFilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetAll={handleResetAll}
            />
          </aside>

          {/* Results Main Column */}
          <main className="flex-1 min-w-0">
            {/* Results Header Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800/80 text-xs text-zinc-400">
              <div>
                {!isLoading && (
                  <span>
                    Found <strong className="text-zinc-100">{pageInfo.total.toLocaleString()}</strong> results
                    {filters.search && ` for "${filters.search}"`}
                  </span>
                )}
              </div>
              <div>
                Page <strong className="text-zinc-100">{pageInfo.currentPage}</strong> of{' '}
                <strong className="text-zinc-100">{pageInfo.lastPage || 1}</strong>
              </div>
            </div>

            {/* Results Grid / Loading / Empty State */}
            {isLoading ? (
              <FilterSkeleton />
            ) : mediaList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5 sm:gap-4">
                {mediaList.map((media) => (
                  <AnimeCard
                    key={media.id}
                    media={media}
                    onSelect={(m) => setSelectedMedia(m)}
                  />
                ))}
              </div>
            ) : (
              <div className="min-h-[45vh] flex flex-col items-center justify-center p-8 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
                  <BookX className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  No Titles Matched Your Filters
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                  Try removing some genre constraints, widening your release year boundary, or clearing keywords.
                </p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Pagination Bar */}
            {!isLoading && pageInfo.lastPage > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10 pt-6 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={pageInfo.currentPage <= 1}
                  onClick={() => handlePageChange(pageInfo.currentPage - 1)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                <div className="flex items-center gap-1 px-2 text-xs font-medium text-zinc-400">
                  <span>Page {pageInfo.currentPage} of {pageInfo.lastPage}</span>
                </div>

                <button
                  type="button"
                  disabled={!pageInfo.hasNextPage}
                  onClick={() => handlePageChange(pageInfo.currentPage + 1)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm h-full bg-zinc-950 border-l border-zinc-800 p-5 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Filters
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1">
              <AnimeFilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetAll={handleResetAll}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
                totalResults={pageInfo.total}
              />
            </div>
          </div>
        </div>
      )}

      {/* Anime Preview Details Modal */}
      <AnimePreviewModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-24 px-4 max-w-7xl mx-auto">
          <FilterSkeleton />
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
