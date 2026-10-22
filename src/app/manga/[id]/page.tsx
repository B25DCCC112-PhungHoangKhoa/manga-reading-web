import React, { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Star, BookOpen, Calendar, Tag, ArrowLeft, Loader2, Layers } from 'lucide-react';
import { getMangaById } from '@/lib/anilist';
import {
  resolveMangaDexId,
  getMangaEditions,
  getCompleteChaptersAcrossProviders,
  getMangaDexAltTitles,
} from '@/lib/mangadex';
import ChapterList from '@/components/ChapterList';

export const revalidate = 900; // Cache page for 15 minutes

interface PageProps {
  params: Promise<{ id: string }>;
}

function ChapterListSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">Chapters</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-medium text-indigo-300">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                Scanning providers...
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Fetching latest chapters across MangaDex, WeebCentral, and more</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-zinc-800/70 rounded-xl animate-pulse" />
          <div className="h-8 w-24 bg-zinc-800/70 rounded-xl animate-pulse" />
        </div>
      </div>

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
  );
}

async function ChaptersSection({
  mangaId,
  title,
  initialTitles,
}: {
  mangaId: number;
  title: string;
  initialTitles: string[];
}) {
  let titles = [...initialTitles];
  let chapters: Awaited<ReturnType<typeof getCompleteChaptersAcrossProviders>> = [];
  let mangadexId: string | null = null;
  let editions: Array<{ id: string; title: string; isColored?: boolean }> = [];
  let initialProvider: 'mangadex' | 'weebcentral' | 'mangapill' | 'nettruyen' | 'all' = 'mangadex';

  try {
    const [resolvedId, foundEditions] = await Promise.all([
      resolveMangaDexId(mangaId, titles),
      getMangaEditions(mangaId, titles),
    ]);

    mangadexId = resolvedId;
    editions = foundEditions;

    // Enrich titles with MangaDex official alternative titles (improves NetTruyen/WeebCentral/MangaPill accuracy)
    if (mangadexId) {
      const mdAlt = await getMangaDexAltTitles(mangadexId);
      titles = Array.from(new Set([...titles, ...mdAlt]));
    }

    // Fast initial load: Fetch chapters from MangaDex (default provider)
    if (mangadexId) {
      chapters = await getCompleteChaptersAcrossProviders(mangadexId, titles, 'mangadex');
    }

    // Fallback: If MangaDex has no chapters or no ID, check if alternative providers have chapters
    if (chapters.length === 0) {
      chapters = await getCompleteChaptersAcrossProviders(mangadexId, titles, 'all');
      if (chapters.length > 0) {
        initialProvider = 'all';
      }
    }
  } catch (err) {
    console.error('Error fetching manga chapters across providers:', err);
  }

  return (
    <ChapterList
      chapters={chapters}
      mangaId={mangaId}
      mangaTitle={title}
      mangaTitles={titles}
      editions={editions}
      initialMangaDexId={mangadexId || undefined}
      initialProvider={initialProvider}
    />
  );
}

export default async function MangaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const anilistId = parseInt(id, 10);

  if (isNaN(anilistId)) {
    notFound();
  }

  const manga = await getMangaById(anilistId);
  if (!manga) {
    notFound();
  }

  // If the user arrived via an Anime ID (e.g. /manga/21), redirect to the canonical Manga ID (/manga/30013)
  if (manga.id !== anilistId) {
    redirect(`/manga/${manga.id}`);
  }

  const title =
    manga.title.english ||
    manga.title.romaji ||
    manga.title.native ||
    'Untitled Manga';

  const secondaryTitle =
    manga.title.english && manga.title.romaji !== manga.title.english
      ? manga.title.romaji
      : manga.title.native;

  const coverUrl =
    manga.coverImage?.extraLarge ||
    manga.coverImage?.large ||
    '/placeholder.png';

  const titles = [
    manga.title.english,
    manga.title.romaji,
    manga.title.native,
    ...(manga.synonyms || []),
  ].filter(Boolean) as string[];

  // Clean HTML from synopsis
  const cleanSynopsis = manga.description
    ? manga.description.replace(/<[^>]*>/g, '')
    : 'No synopsis available for this title.';

  return (
    <div className="min-h-screen pb-16">
      {/* Banner Backdrop */}
      <div className="relative w-full h-72 sm:h-80 md:h-96 overflow-hidden bg-zinc-900">
        {manga.bannerImage ? (
          <Image
            src={manga.bannerImage}
            alt={`${title} banner`}
            fill
            sizes="100vw"
            className="object-cover object-center filter blur-xs brightness-75 scale-105"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />

        {/* Back Link */}
        <div className="absolute top-20 left-4 sm:left-8 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700/60 backdrop-blur-md text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Browse</span>
          </Link>
        </div>
      </div>

      {/* Main Details Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-36 sm:-mt-44 relative z-20">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* High-res Cover Art */}
          <div className="w-48 sm:w-56 md:w-64 shrink-0 rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl border-2 border-zinc-800/80 mx-auto md:mx-0">
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={coverUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 224px, 256px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Metadata & Synopsis */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                {title}
              </h1>
              {secondaryTitle && (
                <p className="text-sm md:text-base text-zinc-400 mt-1 font-medium">
                  {secondaryTitle}
                </p>
              )}
            </div>

            {/* Badges / Chips */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              {manga.averageScore && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {manga.averageScore}% Score
                </span>
              )}
              {manga.status && (
                <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold">
                  {manga.status}
                </span>
              )}
              {manga.format && (
                <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
                  {manga.format}
                </span>
              )}
              {manga.startDate?.year && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  {manga.startDate.year}
                </span>
              )}
              {manga.chapters && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium">
                  <BookOpen className="w-3.5 h-3.5" />
                  {manga.chapters} Chapters
                </span>
              )}
            </div>

            {/* Genres */}
            {manga.genres && manga.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                {manga.genres.map((genre) => (
                  <span
                    key={genre}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div className="pt-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Synopsis
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl whitespace-pre-line text-left">
                {cleanSynopsis}
              </p>
            </div>

            {/* Tags */}
            {manga.tags && manga.tags.length > 0 && (
              <div className="pt-2 text-left">
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manga.tags.slice(0, 8).map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900/90 text-zinc-400 border border-zinc-800"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Feed Section */}
        <div className="mt-12">
          <Suspense fallback={<ChapterListSkeleton />}>
            <ChaptersSection
              mangaId={manga.id}
              title={title}
              initialTitles={titles}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

