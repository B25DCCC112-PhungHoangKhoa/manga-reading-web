import React from 'react';

export default function FilterSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 sm:gap-4">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col bg-zinc-900/40 rounded-xl overflow-hidden border border-zinc-800/80 animate-pulse"
        >
          {/* Cover Placeholder */}
          <div className="relative aspect-[3/4] w-full bg-zinc-800/60" />

          {/* Content Placeholder */}
          <div className="p-3 space-y-2">
            <div className="h-3.5 bg-zinc-800/80 rounded w-4/5" />
            <div className="h-3 bg-zinc-800/60 rounded w-3/5" />
            <div className="flex gap-1.5 pt-1">
              <div className="h-2.5 bg-zinc-800/50 rounded w-10" />
              <div className="h-2.5 bg-zinc-800/50 rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

