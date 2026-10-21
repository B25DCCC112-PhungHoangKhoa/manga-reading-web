import { AniListManga, AniListMedia, AnimeFilterOptions, PageInfo, PaginatedMangaResponse } from './types';
import { getOrSetCache } from './cache';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const MEDIA_FIELDS = `
  id
  idMal
  type
  title {
    romaji
    english
    native
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  description(asHtml: false)
  genres
  synonyms
  tags {
    id
    name
    rank
  }
  averageScore
  popularity
  status
  episodes
  duration
  chapters
  volumes
  format
  source
  season
  seasonYear
  isAdult
  studios(isMain: true) {
    nodes {
      id
      name
    }
  }
  trailer {
    id
    site
    thumbnail
  }
  startDate {
    year
    month
    day
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
  relations {
    edges {
      relationType
      node {
        id
        type
        title {
          romaji
          english
          native
        }
      }
    }
  }
`;

async function executeAniListQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'MangaWeb/1.0',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AniList API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
  }

  return json.data;
}

/**
 * Fetch trending manga list with pagination info (cached for 10 minutes)
 */
export async function getTrendingMangaWithPagination(
  page = 1,
  perPage = 18
): Promise<PaginatedMangaResponse> {
  const cacheKey = `anilist:trending:v3:${page}:${perPage}`;
  return getOrSetCache(cacheKey, 600, async () => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(type: MANGA, sort: [TRENDING_DESC, POPULARITY_DESC]) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeAniListQuery<{
      Page: { media: AniListManga[]; pageInfo: PageInfo };
    }>(query, {
      page,
      perPage,
    });
    return {
      media: data.Page.media,
      pageInfo: data.Page.pageInfo,
    };
  });
}

/**
 * Fetch trending manga list (cached for 10 minutes)
 */
export async function getTrendingManga(page = 1, perPage = 18): Promise<AniListManga[]> {
  const res = await getTrendingMangaWithPagination(page, perPage);
  return res.media;
}

/**
 * Fetch latest updated / popular manga with pagination info (cached for 10 minutes)
 */
export async function getLatestMangaWithPagination(
  page = 1,
  perPage = 18
): Promise<PaginatedMangaResponse> {
  const cacheKey = `anilist:latest:v3:${page}:${perPage}`;
  return getOrSetCache(cacheKey, 600, async () => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(type: MANGA, sort: [UPDATED_AT_DESC, POPULARITY_DESC]) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeAniListQuery<{
      Page: { media: AniListManga[]; pageInfo: PageInfo };
    }>(query, {
      page,
      perPage,
    });
    return {
      media: data.Page.media,
      pageInfo: data.Page.pageInfo,
    };
  });
}

/**
 * Fetch latest updated / popular manga (cached for 10 minutes)
 */
export async function getLatestManga(page = 1, perPage = 18): Promise<AniListManga[]> {
  const res = await getLatestMangaWithPagination(page, perPage);
  return res.media;
}

/**
 * Search manga by keyword (cached for 5 minutes)
 */
export async function searchManga(queryText: string, page = 1, perPage = 12): Promise<AniListManga[]> {
  const cacheKey = `anilist:search:${queryText.trim().toLowerCase()}:${page}:${perPage}`;
  return getOrSetCache(cacheKey, 300, async () => {
    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: MANGA, search: $search, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeAniListQuery<{ Page: { media: AniListManga[] } }>(query, {
      search: queryText,
      page,
      perPage,
    });
    return data.Page.media;
  });
}

/**
 * Fetch manga details by AniList ID (cached for 30 minutes).
 * If an Anime ID is passed (e.g. from anime filter discovery), automatically resolves
 * its Manga adaptation counterpart so the reader page opens seamlessly.
 */
export async function getMangaById(id: number): Promise<AniListManga | null> {
  const cacheKey = `anilist:manga:${id}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    // Query Media without type: MANGA constraint so we can inspect both anime & manga
    const query = `
      query ($id: Int) {
        Media(id: $id) {
          ${MEDIA_FIELDS}
        }
      }
    `;
    try {
      const data = await executeAniListQuery<{ Media: AniListManga }>(query, { id });
      const media = data?.Media;
      if (!media) return null;

      // If it is already a Manga, return directly
      if (media.type === 'MANGA') {
        return media;
      }

      // If it is an ANIME, check relations for its MANGA counterpart
      const mangaRelation =
        media.relations?.edges?.find(
          (edge) =>
            edge.node?.type === 'MANGA' &&
            (edge.relationType === 'ADAPTATION' || edge.relationType === 'SOURCE')
        )?.node ||
        media.relations?.edges?.find((edge) => edge.node?.type === 'MANGA')?.node;

      if (mangaRelation?.id) {
        // Fetch the corresponding manga
        const resolvedManga = await getMangaById(mangaRelation.id);
        if (resolvedManga) {
          return resolvedManga;
        }
      }

      // Fallback: search AniList by title for the manga counterpart
      const titles = [
        media.title.english,
        media.title.romaji,
        media.title.native,
      ].filter(Boolean) as string[];

      for (const t of titles) {
        const searchResults = await searchManga(t, 1, 5);
        if (searchResults && searchResults.length > 0) {
          return searchResults[0];
        }
      }

      return null;
    } catch (err) {
      console.error(`Failed to fetch manga by id ${id}:`, err);
      return null;
    }
  });
}

/**
 * Filter anime / manga media dynamically with AniList GraphQL
 */
export async function filterAnimeOrMedia(
  options: AnimeFilterOptions = {}
): Promise<{ media: AniListMedia[]; pageInfo: PageInfo }> {
  const page = options.page || 1;
  const perPage = options.perPage || 24;
  const type = options.type || 'ANIME';

  const variables: Record<string, unknown> = {
    page,
    perPage,
    type,
  };

  // Search keyword (title, alternative titles, keywords)
  if (options.search && options.search.trim().length > 0) {
    variables.search = options.search.trim();
  }

  // Genres (OR logic across selected genres) & Tags (e.g. Isekai)
  if (options.genres && options.genres.length > 0) {
    const regularGenres = options.genres.filter(
      (g) => g.toLowerCase() !== 'isekai'
    );
    if (regularGenres.length > 0) {
      variables.genre_in = regularGenres;
    }
    if (options.genres.some((g) => g.toLowerCase() === 'isekai')) {
      variables.tag_in = ['Isekai'];
    }
  }

  // Format / Anime Type: TV, MOVIE, OVA, ONA, SPECIAL, MUSIC
  if (options.format && options.format.length > 0) {
    variables.format_in = options.format;
  }

  // Airing Status: RELEASING, FINISHED, NOT_YET_RELEASED
  if (options.status && options.status !== 'ALL') {
    variables.status = options.status;
  }

  // Season: WINTER, SPRING, SUMMER, FALL
  if (options.season && options.season !== 'ALL') {
    variables.season = options.season;
  }

  // Release year or year range (inclusive)
  if (options.year) {
    variables.seasonYear = Number(options.year);
  } else {
    if (options.yearMin) {
      variables.startDate_greater = Number(options.yearMin) * 10000;
    }
    if (options.yearMax) {
      variables.startDate_lesser = Number(options.yearMax) * 10000 + 1232;
    }
  }

  // Minimum score (5+, 6+, 7+, 8+, 9+)
  if (options.minScore && options.minScore > 0) {
    variables.averageScore_greater =
      options.minScore >= 10 ? options.minScore : options.minScore * 10;
  }

  // Age rating: G, PG, PG-13, R, R+, Rx
  if (options.ageRating && options.ageRating !== 'ALL') {
    if (options.ageRating === 'Rx') {
      variables.isAdult = true;
    } else {
      variables.isAdult = false;
    }
  }

  // Source material: MANGA, LIGHT_NOVEL, ORIGINAL, VISUAL_NOVEL, VIDEO_GAME, NOVEL, OTHER
  if (options.source && options.source.length > 0) {
    variables.source_in = options.source;
  }

  // Episode count range: 1-12, 13-24, 25-50, 50+
  if (options.episodes && options.episodes !== 'ALL') {
    switch (options.episodes) {
      case '1-12':
        variables.episodes_greater = 0;
        variables.episodes_lesser = 13;
        break;
      case '13-24':
        variables.episodes_greater = 12;
        variables.episodes_lesser = 25;
        break;
      case '25-50':
        variables.episodes_greater = 24;
        variables.episodes_lesser = 51;
        break;
      case '50+':
        variables.episodes_greater = 49;
        break;
    }
  }

  // Deterministic sorting with secondary sort key
  switch (options.sort) {
    case 'SCORE_DESC':
      variables.sort = ['SCORE_DESC', 'POPULARITY_DESC', 'ID_DESC'];
      break;
    case 'FAVOURITES_DESC':
      variables.sort = ['FAVOURITES_DESC', 'ID_DESC'];
      break;
    case 'START_DATE_DESC':
      variables.sort = ['START_DATE_DESC', 'ID_DESC'];
      break;
    case 'UPDATED_AT_DESC':
      variables.sort = ['UPDATED_AT_DESC', 'ID_DESC'];
      break;
    case 'TITLE_ROMAJI':
      variables.sort = ['TITLE_ROMAJI', 'ID_DESC'];
      break;
    case 'POPULARITY_DESC':
    default:
      variables.sort = ['POPULARITY_DESC', 'ID_DESC'];
      break;
  }

  const cacheKey = `anilist:filter:${JSON.stringify(variables)}`;
  return getOrSetCache(cacheKey, 300, async () => {
    const query = `
      query (
        $page: Int,
        $perPage: Int,
        $search: String,
        $type: MediaType,
        $format_in: [MediaFormat],
        $status: MediaStatus,
        $genre_in: [String],
        $tag_in: [String],
        $season: MediaSeason,
        $seasonYear: Int,
        $startDate_greater: FuzzyDateInt,
        $startDate_lesser: FuzzyDateInt,
        $averageScore_greater: Int,
        $source_in: [MediaSource],
        $episodes_greater: Int,
        $episodes_lesser: Int,
        $isAdult: Boolean,
        $sort: [MediaSort]
      ) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(
            search: $search,
            type: $type,
            format_in: $format_in,
            status: $status,
            genre_in: $genre_in,
            tag_in: $tag_in,
            season: $season,
            seasonYear: $seasonYear,
            startDate_greater: $startDate_greater,
            startDate_lesser: $startDate_lesser,
            averageScore_greater: $averageScore_greater,
            source_in: $source_in,
            episodes_greater: $episodes_greater,
            episodes_lesser: $episodes_lesser,
            isAdult: $isAdult,
            sort: $sort
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;

    try {
      const data = await executeAniListQuery<{
        Page: {
          media: AniListMedia[];
          pageInfo: PageInfo;
        };
      }>(query, variables);

      return {
        media: data.Page.media || [],
        pageInfo: data.Page.pageInfo || {
          total: 0,
          perPage,
          currentPage: page,
          lastPage: 1,
          hasNextPage: false,
        },
      };
    } catch (err) {
      console.error('Failed to execute filter query:', err);
      return {
        media: [],
        pageInfo: {
          total: 0,
          perPage,
          currentPage: page,
          lastPage: 1,
          hasNextPage: false,
        },
      };
    }
  });
}


