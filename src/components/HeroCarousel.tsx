'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen, Star, Sparkles, Info } from 'lucide-react';
import { AniListManga } from '@/lib/types';

interface HeroCarouselProps {
  mangaList: AniListManga[];
}

export default function HeroCarousel({ mangaList }: HeroCarouselProps) {
  // Only include manga with valid banner images
  const items = mangaList.filter((m) => !!m.bannerImage || !!m.coverImage?.extraLarge).slice(0, 5);
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
    ? current.description.replace(/<[^>]*>/g, '').slice(0, 180) + '...'
    : 'No description available for this title.';

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden bg-brand-card border border-brand-border/70 shadow-2xl h-[420px] sm:h-[480px] md:h-[520px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {items.map((item, idx) => {
        const isActive = idx === currentIndex;
        const bannerUrl = item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large || '';
        const slideTitle =
          item.title.english ||
          item.title.romaji ||
          item.title.native ||
          'Featured Manga';

        return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Banner Artwork */}
            <div className="absolute inset-0">
              {bannerUrl && (
                <Image
                  src={bannerUrl}
                  alt={slideTitle}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover object-center scale-105 transform motion-safe:transition-transform motion-safe:duration-10000"
                  priority={idx === 0}
                  fetchPriority={idx === 0 ? 'high' : 'low'}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              )}
              {/* Gradient Dark Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-20 h-full p-6 sm:p-8 md:p-10 flex flex-col justify-between">
              {/* Top Badges */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-yellow shadow-md shadow-brand-yellow/30">
                  <Sparkles className="w-3.5 h-3.5 text-black fill-black" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-black">
                    SPOTLIGHT
                  </span>
                </div>

                {item.averageScore && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 border border-white/10 backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 fill-brand-yellow text-brand-yellow" />
                    <span className="text-xs font-bold text-amber-300">
                      {item.averageScore}%
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Title, Genres, & CTA Button */}
              <div className="max-w-2xl space-y-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                  {slideTitle}
                </h1>

                {item.genres && item.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-zinc-200 text-[11px] font-semibold backdrop-blur-sm"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <p className="hidden sm:block text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed drop-shadow">
                  {item.description
                    ? item.description.replace(/<[^>]*>/g, '').slice(0, 160) + '...'
                    : ''}
                </p>

                {/* Tapas-style Yellow CTA Button */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={`/manga/${item.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-yellow hover:bg-brand-yellow-light text-black font-black text-xs sm:text-sm tracking-wide shadow-md shadow-brand-yellow/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <BookOpen className="w-4 h-4 text-black stroke-[2.5]" />
                    Read Now
                  </Link>

                  <Link
                    href={`/manga/${item.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-card/80 hover:bg-brand-card-light text-zinc-200 font-bold text-xs sm:text-sm border border-brand-border backdrop-blur-md transition-all"
                  >
                    <Info className="w-4 h-4 text-brand-yellow" />
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
        className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all hover:scale-110 active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 text-brand-yellow" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all hover:scale-110 active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 text-brand-yellow" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex
                ? 'w-7 h-2 bg-brand-yellow shadow-sm shadow-brand-yellow/50'
                : 'w-2 h-2 bg-zinc-600/70 hover:bg-zinc-400'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
