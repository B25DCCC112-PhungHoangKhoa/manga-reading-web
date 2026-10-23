import React from 'react';
import HeroCarousel from '@/components/HeroCarousel';
import MangaGrid from '@/components/MangaGrid';
import CategoryPills from '@/components/CategoryPills';
import { getTrendingMangaWithPagination, getLatestMangaWithPagination } from '@/lib/anilist';
import { Flame, Sparkles } from 'lucide-react';
import { AniListManga, PageInfo } from '@/lib/types';

export const revalidate = 600; // ISR cache for 10 minutes

export default async function HomePage() {
  let trendingManga: AniListManga[] = [];
  let latestManga: AniListManga[] = [];
  let trendingPageInfo: PageInfo = { total: 500, perPage: 18, currentPage: 1, lastPage: 50, hasNextPage: true };
  let latestPageInfo: PageInfo = { total: 500, perPage: 18, currentPage: 1, lastPage: 50, hasNextPage: true };

  try {
    const [trendingRes, latestRes] = await Promise.all([
      getTrendingMangaWithPagination(1, 18),
      getLatestMangaWithPagination(1, 18),
    ]);

    trendingManga = trendingRes.media;
    trendingPageInfo = trendingRes.pageInfo;

    latestManga = latestRes.media;
    latestPageInfo = latestRes.pageInfo;
  } catch (err) {
    console.error('Failed to fetch home page manga:', err);
  }

  return (
    <div className="flex flex-col min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Horizontal Category Pills matching Mobile */}
        <CategoryPills />

        {/* Hero Carousel with Spotlight Art */}
        <div id="spotlight">
          <HeroCarousel mangaList={trendingManga} />
        </div>

        {/* Trending Comics Section */}
        <MangaGrid
          id="trending"
          title="Trending Comics"
          icon={<Flame className="w-5 h-5 text-brand-yellow fill-brand-yellow" />}
          subtitle="Top ranked stories loved right now"
          items={trendingManga}
          apiEndpoint="/api/anilist/trending"
          initialPageInfo={trendingPageInfo}
          perPage={18}
        />

        {/* Latest Updates Section */}
        <MangaGrid
          id="latest"
          title="Latest Updates"
          icon={<Sparkles className="w-5 h-5 text-brand-yellow fill-brand-yellow" />}
          subtitle="Recently updated releases & chapters"
          items={latestManga}
          apiEndpoint="/api/anilist/latest"
          initialPageInfo={latestPageInfo}
          perPage={18}
        />
      </div>
    </div>
  );
}
