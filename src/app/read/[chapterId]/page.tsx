import React from 'react';
import { notFound } from 'next/navigation';
import { getChapterPages } from '@/lib/mangadex';
import ChapterReader from '@/components/ChapterReader';

interface PageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ mangaId?: string }>;
}

export default async function ChapterReaderPage({ params, searchParams }: PageProps) {
  const { chapterId } = await params;
  const { mangaId } = await searchParams;

  if (!chapterId) {
    notFound();
  }

  let chapterData;
  try {
    chapterData = await getChapterPages(chapterId);
  } catch (err) {
    console.error('Failed to load chapter pages:', err);
    notFound();
  }

  return (
    <ChapterReader
      initialData={chapterData}
      mangaId={mangaId || chapterData.mangaId}
    />
  );
}

