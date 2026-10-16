import { NextRequest, NextResponse } from 'next/server';
import { filterAnimeOrMedia } from '@/lib/anilist';
import { AnimeFilterOptions } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const options: AnimeFilterOptions = {
      search: searchParams.get('q') || searchParams.get('search') || undefined,
      type: (searchParams.get('type') as 'ANIME' | 'MANGA') || 'ANIME',
      genres: searchParams.get('genres')
        ? searchParams.get('genres')!.split(',').filter(Boolean)
        : undefined,
      format: searchParams.get('format')
        ? searchParams.get('format')!.split(',').filter(Boolean)
        : undefined,
      status: searchParams.get('status') || undefined,
      year: searchParams.get('year')
        ? parseInt(searchParams.get('year')!, 10)
        : undefined,
      yearMin: searchParams.get('yearMin')
        ? parseInt(searchParams.get('yearMin')!, 10)
        : undefined,
      yearMax: searchParams.get('yearMax')
        ? parseInt(searchParams.get('yearMax')!, 10)
        : undefined,
      season:
        (searchParams.get('season') as
          | 'WINTER'
          | 'SPRING'
          | 'SUMMER'
          | 'FALL') || undefined,
      minScore: searchParams.get('minScore')
        ? parseFloat(searchParams.get('minScore')!)
        : undefined,
      ageRating: searchParams.get('ageRating') || undefined,
      source: searchParams.get('source')
        ? searchParams.get('source')!.split(',').filter(Boolean)
        : undefined,
      episodes: searchParams.get('episodes') || undefined,
      sort: searchParams.get('sort') || 'POPULARITY_DESC',
      page: parseInt(searchParams.get('page') || '1', 10),
      perPage: Math.min(
        parseInt(searchParams.get('perPage') || '24', 10),
        50
      ),
    };

    const result = await filterAnimeOrMedia(options);

    return NextResponse.json({
      success: true,
      data: result.media,
      pageInfo: result.pageInfo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

