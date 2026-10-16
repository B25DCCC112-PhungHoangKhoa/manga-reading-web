'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen, Star, Flame, Sparkles } from 'lucide-react';
import { AniListManga } from '@/lib/types';

interface HeroCarouselProps {
  mangaList: AniListManga[];
}

export default function HeroCarousel({ mangaList }: HeroCarouselProps) {
  // Only include manga with valid banner images
  const items = mangaList.filter((m) => !!m.bannerImage).slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play timer
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  if (items.length === 0) return null;

  const current = items[currentIndex];
  const title =
    current.title.english ||
    current.title.romaji ||
    current.title.native ||
    'Featured Manga';

  const cleanDescription = current.description
    ? current.description.replace(/<[^>]*>/g, '').slice(0, 220) + '...'
    : 'No description available for this title.';

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div
      className="relative w-full h-[480px] sm:h-[540px] md:h-[600px] overflow-hidden bg-zinc-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {items.map((item, idx) => {
        const isActive = idx === currentIndex;
        const bannerUrl = item.bannerImage!;

        return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Banner Image */}
            <div className="absolute inset-0">
              <Image
                src={bannerUrl}
                alt={title}
                fill
                sizes="100vw"
                className="object-cover object-center scale-105 transform motion-safe:transition-transform motion-safe:duration-10000"
                priority={idx === 0}
                // fetchpriority guidance: 'high' for the critical LCP candidate (idx === 0), 'low' for inactive slides
                fetchPriority={idx === 0 ? 'high' : 'low'}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              {/* Gradient Overlays for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            </div>

            {/* Slide Content */}
            <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-end pb-16 md:pb-20">
              <div className="max-w-2xl space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold backdrop-blur-sm">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    Trending #1
                  </span>
                  {item.averageScore && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 text-amber-400 border border-zinc-700/60 text-xs font-semibold backdrop-blur-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {item.averageScore}% Score
                    </span>
                  )}
                  {item.format && (
                    <span className="px-2.5 py-1 rounded-full bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 text-xs font-medium">
                      {item.format}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                  {title}
                </h1>

                {/* Genres */}
                {item.genres && item.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.genres.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        className="text-xs text-zinc-300 bg-zinc-900/80 px-2.5 py-0.5 rounded-md border border-zinc-700/40"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <p className="text-sm md:text-base text-zinc-300 line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow">
                  {cleanDescription}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={`/manga/${item.id}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <BookOpen className="w-4 h-4" />
                    Read Now
                  </Link>
                  <Link
                    href={`/manga/${item.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 font-semibold text-sm border border-zinc-700/80 backdrop-blur-md transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 backdrop-blur-md transition-all hover:scale-110 active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 backdrop-blur-md transition-all hover:scale-110 active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex
                ? 'w-8 h-2.5 bg-indigo-500 shadow-sm shadow-indigo-500/50'
                : 'w-2.5 h-2.5 bg-zinc-600/60 hover:bg-zinc-400'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

