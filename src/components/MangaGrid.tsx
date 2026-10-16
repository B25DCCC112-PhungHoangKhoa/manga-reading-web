import React, { ReactNode } from 'react';
import MangaCard from './MangaCard';
import { AniListManga } from '@/lib/types';

interface MangaGridProps {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  items: AniListManga[];
  id?: string;
}

export default function MangaGrid({
  title,
  icon,
  subtitle,
  items,
  id,
}: MangaGridProps) {
  if (!items || items.length === 0) return null;

  return (
    <section id={id} className="py-8 scroll-mt-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-indigo-400">{icon}</span>}
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs md:text-sm text-zinc-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
        {items.map((manga) => (
          <MangaCard key={manga.id} manga={manga} />
        ))}
      </div>
    </section>
  );
}

