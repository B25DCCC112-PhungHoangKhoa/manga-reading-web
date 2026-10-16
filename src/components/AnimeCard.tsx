'use client';

import React from 'react';
import Image from 'next/image';
import { Star, Tv, Film, PlayCircle } from 'lucide-react';
import { AniListMedia } from '@/lib/types';

interface AnimeCardProps {
  media: AniListMedia;
  onSelect: (media: AniListMedia) => void;
  priority?: boolean;
}

export default function AnimeCard({
  media,
  onSelect,
  priority = false,
}: AnimeCardProps) {
  const title =
    media.title.english ||
    media.title.romaji ||
    media.title.native ||
    'Untitled Title';

  const coverUrl =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium ||
    '/placeholder.png';

  const format = media.format || 'TV';
  const score = media.averageScore;

  // Status color dot
  const getStatusDot = (st?: string | null) => {
    switch (st) {
      case 'RELEASING':
        return 'bg-emerald-400';
      case 'FINISHED':
        return 'bg-sky-400';
      case 'NOT_YET_RELEASED':
        return 'bg-amber-400';
      default:
        return 'bg-zinc-500';
    }
  };

  const getStatusLabel = (st?: string | null) => {
    switch (st) {
      case 'RELEASING':
        return 'Airing';
      case 'FINISHED':
        return 'Finished';
      case 'NOT_YET_RELEASED':
        return 'Upcoming';
      default:
        return st || 'Unknown';
    }
  };

  return (
    <div
      onClick={() => onSelect(media)}
      className="group flex flex-col bg-zinc-900/40 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-indigo-500/60 hover:bg-zinc-800/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer text-left select-none"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-800">
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
        />

        {/* Gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-black/20 pointer-events-none" />

        {/* Play hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <div className="w-11 h-11 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <PlayCircle className="w-6 h-6 fill-white text-indigo-600" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Format Badge */}
          <span className="px-2 py-0.5 rounded-md bg-zinc-950/85 backdrop-blur-md border border-zinc-700/60 text-[10px] font-bold uppercase tracking-wider text-zinc-300 shadow-xs flex items-center gap-1">
            {format === 'MOVIE' ? (
              <Film className="w-2.5 h-2.5 text-indigo-400" />
            ) : (
              <Tv className="w-2.5 h-2.5 text-indigo-400" />
            )}
            {format}
          </span>

          {/* Score Badge */}
          {score ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/85 backdrop-blur-md border border-zinc-700/60 text-amber-400 text-xs font-bold shadow-xs">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{score}%</span>
            </div>
          ) : null}
        </div>

        {/* Bottom Badges */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-zinc-300 pointer-events-none">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950/85 backdrop-blur-sm border border-zinc-700/50">
            <span
              className={`w-2 h-2 rounded-full ${getStatusDot(media.status)}`}
            />
            <span className="text-[10px] font-medium">
              {getStatusLabel(media.status)}
            </span>
          </div>

          {/* Episodes or Chapters */}
          {media.episodes ? (
            <span className="px-1.5 py-0.5 rounded bg-zinc-950/85 backdrop-blur-sm border border-zinc-700/50 text-zinc-300 text-[10px] font-medium">
              {media.episodes} eps
            </span>
          ) : media.chapters ? (
            <span className="px-1.5 py-0.5 rounded bg-zinc-950/85 backdrop-blur-sm border border-zinc-700/50 text-zinc-300 text-[10px] font-medium">
              {media.chapters} ch.
            </span>
          ) : null}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>
        </div>

        <div className="space-y-1">
          {/* Genre chips */}
          <div className="flex flex-wrap gap-1">
            {media.genres?.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Year & Season */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
            <span>
              {media.season
                ? `${media.season.charAt(0) + media.season.slice(1).toLowerCase()} `
                : ''}
              {media.seasonYear || media.startDate?.year || ''}
            </span>
            {media.studios?.nodes?.[0]?.name && (
              <span className="truncate max-w-[100px] text-zinc-400">
                {media.studios.nodes[0].name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

