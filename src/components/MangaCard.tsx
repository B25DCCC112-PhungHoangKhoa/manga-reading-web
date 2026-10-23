import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BookOpen } from 'lucide-react';
import { AniListManga } from '@/lib/types';

interface MangaCardProps {
  manga: AniListManga;
  priority?: boolean;
}

export default function MangaCard({ manga, priority = false }: MangaCardProps) {
  const title =
    manga.title.english ||
    manga.title.romaji ||
    manga.title.native ||
    'Untitled Manga';

  const coverUrl =
    manga.coverImage?.extraLarge ||
    manga.coverImage?.large ||
    manga.coverImage?.medium ||
    '/placeholder.png';

  const genres = manga.genres?.slice(0, 2) || [];
  const score = manga.averageScore;

  const statusLabel =
    manga.status === 'RELEASING'
      ? 'Ongoing'
      : manga.status === 'FINISHED'
      ? 'Completed'
      : manga.status || 'Manga';

  return (
    <Link
      href={`/manga/${manga.id}`}
      className="group flex flex-col bg-brand-card rounded-2xl overflow-hidden border border-brand-border/70 hover:border-brand-yellow/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Top Rating Badge */}
        {score ? (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 border border-white/10 backdrop-blur-md shadow-md">
            <Star className="w-2.5 h-2.5 fill-brand-yellow text-brand-yellow" />
            <span className="text-[11px] font-bold text-amber-300">{score}%</span>
          </div>
        ) : null}

        {/* Bottom Overlay with Genres & Chapter Count */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-zinc-300 pointer-events-none gap-1">
          {genres.length > 0 ? (
            <div className="flex items-center gap-1 overflow-hidden">
              {genres.map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-md bg-black/80 border border-white/10 text-[10px] font-medium text-zinc-300 truncate max-w-[80px]"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : (
            <div />
          )}

          {manga.chapters ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/10 text-[10px] text-zinc-300 font-medium shrink-0">
              <BookOpen className="w-2.5 h-2.5 text-brand-yellow" />
              {manga.chapters} Ch
            </span>
          ) : null}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-1">
        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-yellow transition-colors line-clamp-2 leading-tight">
          {title}
        </h3>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-brand-yellow uppercase tracking-wider">
            {statusLabel}
          </span>
          {manga.startDate?.year ? (
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
              {manga.startDate.year}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
