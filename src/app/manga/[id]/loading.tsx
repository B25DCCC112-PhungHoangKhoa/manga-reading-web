import React from 'react';
import { Loader2, ArrowLeft, BookOpen, Layers } from 'lucide-react';

export default function MangaDetailsLoading() {
  return (
    <div className="min-h-screen pb-16 animate-in fade-in duration-300">
      {/* Banner Backdrop Skeleton */}
      <div className="relative w-full h-72 sm:h-80 md:h-96 overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-zinc-900/60 to-zinc-950 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />

        {/* Back Link Button Skeleton */}
        <div className="absolute top-20 left-4 sm:left-8 z-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-zinc-400 text-xs font-medium backdrop-blur-md">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Browse</span>
          </div>
        </div>

        {/* Floating Centered Loading Indicator */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-xl shadow-2xl text-zinc-200">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs font-semibold tracking-wide">
              Loading manga details & chapters...
            </span>
          </div>
        </div>
      </div>

      {/* Main Details Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-36 sm:-mt-44 relative z-20">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Cover Art Skeleton */}
          <div className="w-48 sm:w-56 md:w-64 shrink-0 rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl border-2 border-zinc-800/80 mx-auto md:mx-0">
            <div className="aspect-[3/4] w-full bg-zinc-800/80 animate-pulse flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-zinc-700/50" />
            </div>
          </div>

          {/* Metadata & Synopsis Skeleton */}
          <div className="flex-1 space-y-4 w-full text-center md:text-left">
            {/* Title Skeleton */}
            <div className="space-y-2">
              <div className="h-8 sm:h-10 bg-zinc-800/80 rounded-xl w-3/4 max-w-md mx-auto md:mx-0 animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded-lg w-1/2 max-w-xs mx-auto md:mx-0 animate-pulse" />
            </div>

            {/* Badges / Chips Skeleton */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <div className="h-7 w-24 bg-zinc-800/70 rounded-xl animate-pulse" />
              <div className="h-7 w-20 bg-zinc-800/70 rounded-xl animate-pulse" />
              <div className="h-7 w-16 bg-zinc-800/70 rounded-xl animate-pulse" />
              <div className="h-7 w-24 bg-zinc-800/70 rounded-xl animate-pulse" />
            </div>

            {/* Genres Skeleton */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
              <div className="h-6 w-16 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse" />
              <div className="h-6 w-20 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse" />
              <div className="h-6 w-14 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse" />
              <div className="h-6 w-18 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse" />
            </div>

            {/* Synopsis Skeleton */}
            <div className="pt-2 space-y-2.5 max-w-3xl">
              <div className="h-4 w-20 bg-zinc-800/70 rounded mb-2 animate-pulse" />
              <div className="h-3.5 bg-zinc-800/60 rounded w-full animate-pulse" />
              <div className="h-3.5 bg-zinc-800/60 rounded w-11/12 animate-pulse" />
              <div className="h-3.5 bg-zinc-800/60 rounded w-4/5 animate-pulse" />
              <div className="h-3.5 bg-zinc-800/40 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Chapter Feed Section Skeleton */}
        <div className="mt-12 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="h-5 w-28 bg-zinc-800 rounded animate-pulse mb-1" />
                <div className="h-3 w-44 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-28 bg-zinc-800/70 rounded-xl animate-pulse" />
              <div className="h-8 w-24 bg-zinc-800/70 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Chapters Rows Skeleton */}
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800/80" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 sm:w-56 bg-zinc-800/80 rounded" />
                    <div className="h-3 w-20 sm:w-28 bg-zinc-800/40 rounded" />
                  </div>
                </div>
                <div className="h-7 w-20 bg-zinc-800/60 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
