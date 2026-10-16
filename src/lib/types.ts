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
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  } | null;
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

export interface MangaDetailResponse {
  manga: AniListManga;
  mangadexId: string | null;
  chapters: MangaDexChapter[];
}

