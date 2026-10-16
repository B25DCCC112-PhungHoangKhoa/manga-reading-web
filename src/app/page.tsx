import React from 'react';
import HeroCarousel from '@/components/HeroCarousel';
import MangaGrid from '@/components/MangaGrid';
import { getTrendingManga, getLatestManga } from '@/lib/anilist';
import { Flame, Sparkles } from 'lucide-react';

import { AniListManga } from '@/lib/types';

export const revalidate = 600; // ISR cache for 10 minutes

export default async function HomePage() {
  let trendingManga: AniListManga[] = [];
  let latestManga: AniListManga[] = [];

  try {
    const [trending, latest] = await Promise.all([
      getTrendingManga(1, 18),
      getLatestManga(1, 12),
    ]);
    trendingManga = trending;
    latestManga = latest;
  } catch (err) {
    console.error('Failed to fetch home page manga:', err);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Carousel with AniList Banners */}
      <HeroCarousel mangaList={trendingManga} />

      {/* Main Content Grids */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 mt-6">
        {/* Trending Manga Section */}
        <MangaGrid
          id="trending"
          title="Trending Manga"
          icon={<Flame className="w-6 h-6 text-amber-400 fill-amber-400/20" />}
          subtitle="Top ranked and most discussed manga this week"
          items={trendingManga}
        />

        {/* Latest Updates Section */}
        <MangaGrid
          id="latest"
          title="Latest Updates"
          icon={<Sparkles className="w-6 h-6 text-pink-400" />}
          subtitle="Recently published chapters and trending releases"
          items={latestManga}
        />
      </div>
    </div>
  );
}
