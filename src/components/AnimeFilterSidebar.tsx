'use client';

import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  Search,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Star,
  Check,
  ShieldAlert,
  Film,
  Tv,
} from 'lucide-react';
import { AnimeFilterOptions } from '@/lib/types';

interface AnimeFilterSidebarProps {
  filters: AnimeFilterOptions;
  onFilterChange: (newFilters: Partial<AnimeFilterOptions>) => void;
  onResetAll: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  totalResults?: number;
}

const GENRE_LIST = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Horror',
  'Mystery',
  'Sci-Fi',
  'Sports',
  'Slice of Life',
  'Supernatural',
  'Psychological',
  'Isekai',
  'Mecha',
  'Music',
  'Thriller',
];

const ANIME_FORMATS = [
  { label: 'TV Series', value: 'TV' },
  { label: 'Movie', value: 'MOVIE' },
  { label: 'OVA', value: 'OVA' },
  { label: 'ONA', value: 'ONA' },
  { label: 'Special', value: 'SPECIAL' },
  { label: 'Music', value: 'MUSIC' },
];

const AIRING_STATUSES = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Currently Airing', value: 'RELEASING' },
  { label: 'Finished Airing', value: 'FINISHED' },
  { label: 'Not Yet Aired', value: 'NOT_YET_RELEASED' },
];

const SEASONS = [
  { label: 'All Seasons', value: 'ALL', icon: '🌐' },
  { label: 'Winter', value: 'WINTER', icon: '❄️' },
  { label: 'Spring', value: 'SPRING', icon: '🌸' },
  { label: 'Summer', value: 'SUMMER', icon: '☀️' },
  { label: 'Fall', value: 'FALL', icon: '🍁' },
];

const SCORE_OPTIONS = [
  { label: 'All', value: 0 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
];

const AGE_RATINGS = [
  { label: 'All Ratings', value: 'ALL' },
  { label: 'G (All Ages)', value: 'G' },
  { label: 'PG (Children)', value: 'PG' },
  { label: 'PG-13 (Teens)', value: 'PG-13' },
  { label: 'R (17+ Violence/Profanity)', value: 'R' },
  { label: 'R+ (Mild Nudity)', value: 'R+' },
  { label: 'Rx (Adult / 18+)', value: 'Rx' },
];

const SOURCE_MATERIALS = [
  { label: 'Manga', value: 'MANGA' },
  { label: 'Light Novel', value: 'LIGHT_NOVEL' },
  { label: 'Original', value: 'ORIGINAL' },
  { label: 'Visual Novel', value: 'VISUAL_NOVEL' },
  { label: 'Game', value: 'VIDEO_GAME' },
  { label: 'Novel', value: 'NOVEL' },
  { label: 'Other', value: 'OTHER' },
];

const EPISODE_COUNTS = [
  { label: 'All', value: 'ALL' },
  { label: '1–12', value: '1-12' },
  { label: '13–24', value: '13-24' },
  { label: '25–50', value: '25-50' },
  { label: '50+', value: '50+' },
];

const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'POPULARITY_DESC' },
  { label: 'Highest Rated', value: 'SCORE_DESC' },
  { label: 'Most Favorited', value: 'FAVOURITES_DESC' },
  { label: 'Newest Releases', value: 'START_DATE_DESC' },
  { label: 'Recently Updated', value: 'UPDATED_AT_DESC' },
  { label: 'Title A–Z', value: 'TITLE_ROMAJI' },
];

const SEASONAL_PRESETS = [
  { label: 'Winter 2025', season: 'WINTER', year: 2025 },
  { label: 'Fall 2024', season: 'FALL', year: 2024 },
  { label: 'Summer 2024', season: 'SUMMER', year: 2024 },
  { label: 'Spring 2024', season: 'SPRING', year: 2024 },
  { label: 'Winter 2024', season: 'WINTER', year: 2024 },
];

export default function AnimeFilterSidebar({
  filters,
  onFilterChange,
  onResetAll,
  isMobileDrawer = false,
  onCloseMobileDrawer,
  totalResults,
}: AnimeFilterSidebarProps) {
  // Collapsible section toggles
  const [sectionsOpen, setSectionsOpen] = useState({
    genres: true,
    format: true,
    status: true,
    seasonal: true,
    score: true,
    episodes: true,
    advanced: false,
  });

  const toggleSection = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenreToggle = (genre: string) => {
    const current = filters.genres || [];
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    onFilterChange({ genres: next });
  };

  const handleFormatToggle = (fmt: string) => {
    const current = filters.format || [];
    const next = current.includes(fmt)
      ? current.filter((f) => f !== fmt)
      : [...current, fmt];
    onFilterChange({ format: next });
  };

  const handleSourceToggle = (src: string) => {
    const current = filters.source || [];
    const next = current.includes(src)
      ? current.filter((s) => s !== src)
      : [...current, src];
    onFilterChange({ source: next });
  };

  const currentYear = new Date().getFullYear();
  const yearList = Array.from({ length: 45 }, (_, i) => currentYear + 1 - i);

  return (
    <div className="flex flex-col gap-6 text-zinc-100">
      {/* Header with Title and Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
            Filters & Search
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetAll}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-400 transition-colors font-medium px-2 py-1 rounded hover:bg-zinc-800/80"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      {/* Media Type Switcher: Anime vs Manga */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400">Media Type</label>
        <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => onFilterChange({ type: 'ANIME' })}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              (filters.type || 'ANIME') === 'ANIME'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Anime
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ type: 'MANGA' })}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filters.type === 'MANGA'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Manga
          </button>
        </div>
      </div>

      {/* Seasonal Quick Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Seasonal Browse
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SEASONAL_PRESETS.map((p) => {
            const isSelected =
              filters.season === p.season && filters.year === p.year;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  onFilterChange({
                    season: p.season as AnimeFilterOptions['season'],
                    year: p.year,
                    yearMin: undefined,
                    yearMax: undefined,
                  })
                }
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort By Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400">Sort By</label>
        <div className="relative">
          <select
            value={filters.sort || 'POPULARITY_DESC'}
            onChange={(e) => onFilterChange({ sort: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Genres (Multi-Select Chips / Checkboxes) */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('genres')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Genres
            {filters.genres && filters.genres.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                {filters.genres.length}
              </span>
            )}
          </span>
          {sectionsOpen.genres ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.genres && (
          <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in duration-150">
            {GENRE_LIST.map((genre) => {
              const selected = (filters.genres || []).includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleGenreToggle(genre)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                    selected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs shadow-indigo-600/30'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 stroke-[3]" />}
                  {genre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Anime Format / Type */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('format')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            Format
            {filters.format && filters.format.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                {filters.format.length}
              </span>
            )}
          </span>
          {sectionsOpen.format ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.format && (
          <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in duration-150">
            {ANIME_FORMATS.map((fmt) => {
              const selected = (filters.format || []).includes(fmt.value);
              return (
                <button
                  key={fmt.value}
                  type="button"
                  onClick={() => handleFormatToggle(fmt.value)}
                  className={`text-[11px] font-medium px-2 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                    selected
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{fmt.label}</span>
                  {selected && <Check className="w-3 h-3 text-indigo-400 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Airing Status */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('status')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span>Airing Status</span>
          {sectionsOpen.status ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.status && (
          <div className="space-y-1 pt-1 animate-in fade-in duration-150">
            {AIRING_STATUSES.map((st) => {
              const isSelected = (filters.status || 'ALL') === st.value;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => onFilterChange({ status: st.value })}
                  className={`w-full text-[11px] font-medium px-2.5 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{st.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Season & Release Year */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('seasonal')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Season & Year
          </span>
          {sectionsOpen.seasonal ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.seasonal && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            {/* Season buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {SEASONS.map((s) => {
                const isSelected = (filters.season || 'ALL') === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      onFilterChange({
                        season: s.value as AnimeFilterOptions['season'],
                      })
                    }
                    className={`text-[11px] font-medium px-2 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Year Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">
                  Specific Year
                </label>
                <select
                  value={filters.year || ''}
                  onChange={(e) =>
                    onFilterChange({
                      year: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      yearMin: undefined,
                      yearMax: undefined,
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any Year</option>
                  {yearList.map((y) => (
                    <option key={y} value={y} className="bg-zinc-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">
                  From Year (Min)
                </label>
                <select
                  value={filters.yearMin || ''}
                  onChange={(e) =>
                    onFilterChange({
                      yearMin: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      year: undefined,
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any</option>
                  {yearList.map((y) => (
                    <option key={y} value={y} className="bg-zinc-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimum Score */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('score')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Minimum Score
          </span>
          {sectionsOpen.score ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.score && (
          <div className="grid grid-cols-6 gap-1 pt-1 animate-in fade-in duration-150">
            {SCORE_OPTIONS.map((sc) => {
              const isSelected = (filters.minScore || 0) === sc.value;
              return (
                <button
                  key={sc.value}
                  type="button"
                  onClick={() => onFilterChange({ minScore: sc.value })}
                  className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Episode Count */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('episodes')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span>Episode Count</span>
          {sectionsOpen.episodes ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.episodes && (
          <div className="grid grid-cols-5 gap-1 pt-1 animate-in fade-in duration-150">
            {EPISODE_COUNTS.map((ep) => {
              const isSelected = (filters.episodes || 'ALL') === ep.value;
              return (
                <button
                  key={ep.value}
                  type="button"
                  onClick={() => onFilterChange({ episodes: ep.value })}
                  className={`py-1.5 text-center text-[11px] font-bold rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {ep.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Filters: Age Rating & Source Material */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => toggleSection('advanced')}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            Source & Age Rating
          </span>
          {sectionsOpen.advanced ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {sectionsOpen.advanced && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            {/* Age Rating */}
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">
                Age Rating (Content Safety)
              </label>
              <select
                value={filters.ageRating || 'ALL'}
                onChange={(e) => onFilterChange({ ageRating: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {AGE_RATINGS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-zinc-900">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Material */}
            <div>
              <label className="text-[10px] text-zinc-400 mb-1.5 block">
                Original Source Material
              </label>
              <div className="flex flex-wrap gap-1">
                {SOURCE_MATERIALS.map((src) => {
                  const selected = (filters.source || []).includes(src.value);
                  return (
                    <button
                      key={src.value}
                      type="button"
                      onClick={() => handleSourceToggle(src.value)}
                      className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                        selected
                          ? 'bg-indigo-600/25 text-indigo-300 border-indigo-500/60'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {src.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer Bottom Apply button */}
      {isMobileDrawer && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-zinc-950 border-t border-zinc-800 mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onResetAll}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
          >
            Show Results {totalResults ? `(${totalResults})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}

