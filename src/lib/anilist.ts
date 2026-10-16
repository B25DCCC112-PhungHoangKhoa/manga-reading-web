import { AniListManga } from './types';
import { getOrSetCache } from './cache';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const MEDIA_FIELDS = `
  id
  idMal
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
  tags {
    id
    name
    rank
  }
  averageScore
  popularity
  status
  chapters
  volumes
  format
  startDate {
    year
    month
    day
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
 * Fetch trending manga list (cached for 10 minutes)
 */
export async function getTrendingManga(page = 1, perPage = 12): Promise<AniListManga[]> {
  const cacheKey = `anilist:trending:${page}:${perPage}`;
  return getOrSetCache(cacheKey, 600, async () => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: MANGA, sort: [TRENDING_DESC, POPULARITY_DESC]) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeAniListQuery<{ Page: { media: AniListManga[] } }>(query, {
      page,
      perPage,
    });
    return data.Page.media;
  });
}

/**
 * Fetch latest updated / popular manga (cached for 10 minutes)
 */
export async function getLatestManga(page = 1, perPage = 12): Promise<AniListManga[]> {
  const cacheKey = `anilist:latest:${page}:${perPage}`;
  return getOrSetCache(cacheKey, 600, async () => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: MANGA, sort: [UPDATED_AT_DESC, POPULARITY_DESC]) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeAniListQuery<{ Page: { media: AniListManga[] } }>(query, {
      page,
      perPage,
    });
    return data.Page.media;
  });
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
 * Fetch manga details by AniList ID (cached for 30 minutes)
 */
export async function getMangaById(id: number): Promise<AniListManga | null> {
  const cacheKey = `anilist:manga:${id}`;
  return getOrSetCache(cacheKey, 1800, async () => {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          ${MEDIA_FIELDS}
        }
      }
    `;
    try {
      const data = await executeAniListQuery<{ Media: AniListManga }>(query, { id });
      return data.Media;
    } catch (err) {
      console.error(`Failed to fetch manga by id ${id}:`, err);
      return null;
    }
  });
}

