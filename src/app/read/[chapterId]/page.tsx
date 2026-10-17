import React from 'react';
import { notFound } from 'next/navigation';
import { getChapterPages } from '@/lib/mangadex';
import ChapterReader from '@/components/ChapterReader';

interface PageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ mangaId?: string; provider?: string }>;
}

export default async function ChapterReaderPage({ params, searchParams }: PageProps) {
  const { chapterId } = await params;
  const { mangaId, provider } = await searchParams;

  if (!chapterId) {
    notFound();
  }

  let chapterData;
  try {
    chapterData = await getChapterPages(chapterId);
  } catch (err: unknown) {
    console.error('Failed to load chapter pages:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isNetTruyen = chapterId.startsWith('nettruyen-');
    const chapterNumMatch =
      chapterId.match(/(?:chuong|chapter)-(\d+(?:\.\d+)?)/i) ||
      chapterId.match(/(\d+(?:\.\d+)?)$/);

    chapterData = {
      chapterId,
      chapterNumber: chapterNumMatch?.[1] || null,
      title: null,
      volume: null,
      externalUrl: null,
      isUnavailable: !isNetTruyen,
      errorMessage: `Could not load chapter pages: ${message}`,
      pages: [],
      total: 0,
      mangaId,
    };
  }

  return (
    <ChapterReader
      initialData={chapterData}
      mangaId={mangaId || chapterData.mangaId}
      provider={provider}
    />
  );
}

