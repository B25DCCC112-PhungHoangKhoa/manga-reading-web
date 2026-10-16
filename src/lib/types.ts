export interface MangaTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface MangaCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface MangaTag {
  id: number;
  name: string;
  rank?: number;
}

export interface AniListManga {
  id: number;
  idMal?: number;
  title: MangaTitle;
  coverImage: MangaCoverImage;
  bannerImage?: string | null;
  description?: string | null;
  genres: string[];
  tags?: MangaTag[];
  averageScore?: number | null;
  popularity?: number | null;
  status?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  format?: string | null;
  type?: 'ANIME' | 'MANGA';
  episodes?: number | null;
  duration?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  source?: string | null;
  isAdult?: boolean;
  studios?: {
    nodes?: {
      id: number;
      name: string;
    }[];
  };
  trailer?: {
    id?: string;
    site?: string;
    thumbnail?: string;
  } | null;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  } | null;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  } | null;
  relations?: {
    edges?: {
      relationType?: string;
      node?: {
        id: number;
        type?: 'ANIME' | 'MANGA';
        title?: MangaTitle;
      };
    }[];
  };
}

export type AniListMedia = AniListManga;

export interface PageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export interface AnimeFilterOptions {
  search?: string;
  type?: 'ANIME' | 'MANGA';
  genres?: string[];
  format?: string[];
  status?: string;
  year?: number;
  yearMin?: number;
  yearMax?: number;
  season?: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | 'ALL';
  minScore?: number;
  ageRating?: string;
  source?: string[];
  episodes?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export interface DiscoverApiResponse {
  success: boolean;
  data: AniListMedia[];
  pageInfo: PageInfo;
  error?: string;
}

export interface MangaDexChapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  translatedLanguage: string;
  externalUrl: string | null;
  pages: number;
  publishAt: string;
  scanlationGroup?: string | null;
}

export interface ChapterPagesResponse {
  chapterId: string;
  chapterNumber: string | null;
  title: string | null;
  volume: string | null;
  externalUrl: string | null;
  isUnavailable?: boolean;
  errorMessage?: string;
  pages: {
    pageNumber: number;
    url: string;
    originalUrl: string;
  }[];
  total: number;
  mangaId?: string;
  nextChapterId?: string | null;
  prevChapterId?: string | null;
}

export interface MangaEdition {
  id: string;
  title: string;
  isColored?: boolean;
}

export interface MangaDetailResponse {
  manga: AniListManga;
  mangadexId: string | null;
  chapters: MangaDexChapter[];
  editions?: MangaEdition[];
}

