'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  Star,
  Tv,
  Calendar,
  Clock,
  Building2,
  BookOpen,
  ExternalLink,
  Flame,
  Film,
} from 'lucide-react';
import { AniListMedia } from '@/lib/types';

interface AnimePreviewModalProps {
  media: AniListMedia | null;
  onClose: () => void;
}

export default function AnimePreviewModal({
  media,
  onClose,
}: AnimePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (media) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [media, onClose]);

  if (!media) return null;

  const title =
    media.title.english ||
    media.title.romaji ||
    media.title.native ||
    'Untitled Title';

  const secondaryTitle =
    media.title.english && media.title.romaji !== media.title.english
      ? media.title.romaji
      : media.title.native;

  const coverUrl =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    '/placeholder.png';

  const cleanDescription = media.description
    ? media.description.replace(/<[^>]*>/g, '')
    : 'No synopsis available for this title.';

  const isManga = media.type === 'MANGA';

  // Find associated manga adaptation if viewing anime
  const mangaRelation =
    media.relations?.edges?.find(
      (e) =>
        e.node?.type === 'MANGA' &&
        (e.relationType === 'ADAPTATION' || e.relationType === 'SOURCE')
    )?.node ||
    media.relations?.edges?.find((e) => e.node?.type === 'MANGA')?.node;

  const targetMangaId = isManga ? media.id : mangaRelation?.id || media.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-brand-bg border border-brand-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Backdrop */}
        <div className="relative w-full h-44 sm:h-52 shrink-0 bg-brand-card overflow-hidden">
          {media.bannerImage ? (
            <Image
              src={media.bannerImage}
              alt={`${title} banner`}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover object-center filter blur-xs brightness-75 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-black via-zinc-900 to-brand-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/50 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-brand-card text-zinc-300 hover:text-white flex items-center justify-center border border-brand-border backdrop-blur-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 -mt-16 sm:-mt-20 z-10">
          {/* Main Info Row */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            {/* Poster Cover */}
            <div className="relative w-28 sm:w-36 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-brand-card border-2 border-brand-border shadow-2xl">
              <Image
                src={coverUrl}
                alt={title}
                fill
                sizes="144px"
                className="object-cover"
              />
            </div>

            {/* Metadata Header */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {media.format && (
                  <span className="px-2 py-0.5 rounded-md bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 text-xs font-bold uppercase">
                    {media.format}
                  </span>
                )}
                {media.status && (
                  <span className="px-2 py-0.5 rounded-md bg-brand-card text-zinc-300 border border-brand-border text-xs font-medium">
                    {media.status}
                  </span>
                )}
                {media.averageScore && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 text-amber-300 border border-white/10 text-xs font-bold">
                    <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
                    {media.averageScore}%
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                {title}
              </h2>
              {secondaryTitle && (
                <p className="text-xs text-zinc-400 mt-0.5 font-medium line-clamp-1">
                  {secondaryTitle}
                </p>
              )}

              {/* Quick stats pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs text-zinc-300">
                {media.season && (
                  <div className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1.5 rounded-lg border border-brand-border">
                    <Calendar className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>
                      {media.season} {media.seasonYear || ''}
                    </span>
                  </div>
                )}
                {media.episodes ? (
                  <div className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1.5 rounded-lg border border-brand-border">
                    <Tv className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>{media.episodes} Episodes</span>
                  </div>
                ) : media.chapters ? (
                  <div className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1.5 rounded-lg border border-brand-border">
                    <BookOpen className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>{media.chapters} Chapters</span>
                  </div>
                ) : null}
                {media.duration && (
                  <div className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1.5 rounded-lg border border-brand-border">
                    <Clock className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>{media.duration} mins/ep</span>
                  </div>
                )}
                {media.studios?.nodes?.[0]?.name && (
                  <div className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1.5 rounded-lg border border-brand-border col-span-2 sm:col-span-1">
                    <Building2 className="w-3.5 h-3.5 text-brand-yellow" />
                    <span className="truncate">{media.studios.nodes[0].name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isManga ? (
              <Link
                href={`/manga/${media.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-yellow hover:bg-brand-yellow-light text-black text-xs font-black transition-all shadow-lg shadow-brand-yellow/30"
              >
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
                Read Chapters Now
              </Link>
            ) : (
              <Link
                href={`/manga/${targetMangaId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-yellow hover:bg-brand-yellow-light text-black text-xs font-black transition-all shadow-lg shadow-brand-yellow/30"
              >
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
                Read Manga Adaptation
              </Link>
            )}

            <a
              href={`https://anilist.co/${isManga ? 'manga' : 'anime'}/${media.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              AniList
            </a>

            {media.idMal && (
              <a
                href={`https://myanimelist.net/${isManga ? 'manga' : 'anime'}/${media.idMal}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                MyAnimeList
              </a>
            )}
          </div>

          {/* Genres Chips */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Genres & Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {media.genres?.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium"
                >
                  {g}
                </span>
              ))}
              {media.tags?.slice(0, 5).map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400"
                >
                  #{t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Synopsis
            </h4>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-h-48 overflow-y-auto pr-2 bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/60">
              {cleanDescription}
            </p>
          </div>

          {/* YouTube Trailer Player (if available) */}
          {media.trailer?.site?.toLowerCase() === 'youtube' &&
            media.trailer?.id && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-brand-yellow" />
                  Official Trailer
                </h4>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-lg">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${media.trailer.id}`}
                    title={`${title} Official Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

