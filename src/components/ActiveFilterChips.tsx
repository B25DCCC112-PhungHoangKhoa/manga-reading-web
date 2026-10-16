'use client';

import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { AnimeFilterOptions } from '@/lib/types';

interface ActiveFilterChipsProps {
  filters: AnimeFilterOptions;
  onRemoveFilter: (key: keyof AnimeFilterOptions, value?: string) => void;
  onResetAll: () => void;
}

export default function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onResetAll,
}: ActiveFilterChipsProps) {
  const chips: { label: string; key: keyof AnimeFilterOptions; value?: string }[] = [];

  if (filters.search) {
    chips.push({ label: `Search: "${filters.search}"`, key: 'search' });
  }

  if (filters.type && filters.type !== 'ANIME') {
    chips.push({ label: `Type: ${filters.type}`, key: 'type' });
  }

  if (filters.genres && filters.genres.length > 0) {
    filters.genres.forEach((genre) => {
      chips.push({ label: genre, key: 'genres', value: genre });
    });
  }

  if (filters.format && filters.format.length > 0) {
    filters.format.forEach((fmt) => {
      chips.push({ label: `Format: ${fmt}`, key: 'format', value: fmt });
    });
  }

  if (filters.status && filters.status !== 'ALL') {
    const statusLabels: Record<string, string> = {
      RELEASING: 'Currently Airing',
      FINISHED: 'Finished Airing',
      NOT_YET_RELEASED: 'Not Yet Aired',
      CANCELLED: 'Cancelled',
      HIATUS: 'On Hiatus',
    };
    chips.push({
      label: `Status: ${statusLabels[filters.status] || filters.status}`,
      key: 'status',
    });
  }

  if (filters.season && filters.season !== 'ALL') {
    chips.push({
      label: `Season: ${filters.season.charAt(0) + filters.season.slice(1).toLowerCase()}`,
      key: 'season',
    });
  }

  if (filters.year) {
    chips.push({ label: `Year: ${filters.year}`, key: 'year' });
  } else if (filters.yearMin || filters.yearMax) {
    const min = filters.yearMin || '1970';
    const max = filters.yearMax || 'Present';
    chips.push({ label: `Years: ${min} - ${max}`, key: 'yearMin' });
  }

  if (filters.minScore && filters.minScore > 0) {
    chips.push({ label: `Score: ${filters.minScore}+`, key: 'minScore' });
  }

  if (filters.ageRating && filters.ageRating !== 'ALL') {
    chips.push({ label: `Rating: ${filters.ageRating}`, key: 'ageRating' });
  }

  if (filters.source && filters.source.length > 0) {
    filters.source.forEach((src) => {
      const srcLabels: Record<string, string> = {
        MANGA: 'Manga',
        LIGHT_NOVEL: 'Light Novel',
        ORIGINAL: 'Original',
        VISUAL_NOVEL: 'Visual Novel',
        VIDEO_GAME: 'Game',
        NOVEL: 'Novel',
        OTHER: 'Other',
      };
      chips.push({
        label: `Source: ${srcLabels[src] || src}`,
        key: 'source',
        value: src,
      });
    });
  }

  if (filters.episodes && filters.episodes !== 'ALL') {
    chips.push({ label: `Episodes: ${filters.episodes}`, key: 'episodes' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-1">
        <span>Active Filters</span>
        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] flex items-center justify-center font-bold">
          {chips.length}
        </span>
      </div>

      {chips.map((chip, idx) => (
        <span
          key={`${chip.key}-${chip.value || chip.label}-${idx}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:border-zinc-600 transition-colors shadow-xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(chip.key, chip.value)}
            className="text-zinc-400 hover:text-white rounded-full p-0.5 hover:bg-zinc-800 transition-colors"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onResetAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors ml-1"
      >
        <RotateCcw className="w-3 h-3" />
        Reset All
      </button>
    </div>
  );
}
