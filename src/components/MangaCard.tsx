import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Book } from 'lucide-react';
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

  const primaryGenre = manga.genres?.[0];

  return (
    <Link
      href={`/manga/${manga.id}`}
      className="group flex flex-col bg-zinc-900/40 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      {/* Cover Image Container */}
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

        {/* Gradient Overlay for card badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-black/20 pointer-events-none" />

        {/* Score Badge */}
        {manga.averageScore && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/85 backdrop-blur-md border border-zinc-700/60 text-amber-400 text-xs font-bold shadow-md">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{manga.averageScore}%</span>
          </div>
        )}

        {/* Status or Format Badge */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-zinc-300 pointer-events-none">
          {primaryGenre && (
            <span className="px-2 py-0.5 rounded bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/50 text-[11px] font-medium truncate max-w-[100px]">
              {primaryGenre}
            </span>
          )}
          {manga.chapters && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 text-[11px]">
              <Book className="w-3 h-3 text-indigo-400" />
              {manga.chapters} Ch.
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-1">
        <h3 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
          {title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
          <span>{manga.status || 'Ongoing'}</span>
          {manga.startDate?.year && (
            <span className="text-zinc-400">{manga.startDate.year}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

