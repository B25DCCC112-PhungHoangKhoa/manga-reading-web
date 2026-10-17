'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  ExternalLink,
  Search,
  BookOpen,
  Clock,
  Layers,
  Globe,
  Info,
  HelpCircle,
  Sparkles,
  Server,
  Loader2,
} from 'lucide-react';
import { MangaDexChapter, MangaEdition } from '@/lib/types';

interface ChapterListProps {
  chapters: MangaDexChapter[];
  mangaId: string | number;
  mangaTitle?: string;
  editions?: MangaEdition[];
  initialMangaDexId?: string;
  initialProvider?: 'mangadex' | 'weebcentral' | 'mangapill' | 'nettruyen' | 'all';
}

export default function ChapterList({
  chapters: initialChapters,
  mangaId,
  mangaTitle = 'this manga',
  editions = [],
  initialMangaDexId,
  initialProvider = 'mangadex',
}: ChapterListProps) {
  const [chapters, setChapters] = useState<MangaDexChapter[]>(initialChapters);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    initialProvider || 'mangadex'
  );
  const [isLoadingEdition, setIsLoadingEdition] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Sync initial chapters if props change
  useEffect(() => {
    setChapters(initialChapters);
    if (initialProvider) {
      setSelectedEditionId(initialProvider);
    }
  }, [initialChapters, initialProvider]);

  // Handle switching provider / edition / server
  const handleEditionChange = async (val: string) => {
    setSelectedEditionId(val);
    setIsLoadingEdition(true);
    try {
      let url = `/api/manga/${mangaId}/chapters`;
      if (['all', 'mangadex', 'weebcentral', 'mangapill', 'nettruyen'].includes(val)) {
        url += `?provider=${val}`;
      } else {
        url += `?mangadexId=${val}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setChapters(json.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to switch provider/edition:', err);
    } finally {
      setIsLoadingEdition(false);
    }
  };

  // Collect all unique languages in the chapters list
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    chapters.forEach((ch) => {
      if (ch.translatedLanguage) langs.add(ch.translatedLanguage);
    });
    return Array.from(langs);
  }, [chapters]);

  // Filter and sort chapters
  const filteredChapters = useMemo(() => {
    let list = [...chapters];

    // Filter by language if selected
    if (selectedLanguage !== 'all') {
      list = list.filter((ch) => ch.translatedLanguage === selectedLanguage);
    }

    // Filter by search query (chapter number or title)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ch) => {
        const chNum = (ch.chapter || '').toLowerCase();
        const chTitle = (ch.title || '').toLowerCase();
        const group = (ch.scanlationGroup || '').toLowerCase();
        return chNum.includes(q) || chTitle.includes(q) || group.includes(q);
      });
    }

    // Numerical sort order
    list.sort((a, b) => {
      const numA = parseFloat(a.chapter || '-1');
      const numB = parseFloat(b.chapter || '-1');
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return sortOrder === 'desc' ? numB - numA : numA - numB;
    });

    return list;
  }, [chapters, search, sortOrder, selectedLanguage]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Find if a colored/in-app edition exists
  const coloredEdition = useMemo(() => {
    return editions.find((e) => e.isColored);
  }, [editions]);

  return (
    <div className="w-full bg-zinc-900/60 rounded-2xl border border-zinc-800/80 p-5 md:p-6 backdrop-blur-md">
      {/* Colored Edition Promo Banner for titles like One Piece */}
      {coloredEdition && selectedEditionId !== coloredEdition.id && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-violet-950/80 via-indigo-950/80 to-zinc-900 border border-indigo-500/40 flex items-center justify-between gap-3 flex-wrap shadow-lg shadow-indigo-500/10 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-amber-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                Full In-App Edition Available
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-semibold uppercase">
                  Recommended
                </span>
              </p>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Switch to <strong>{coloredEdition.title}</strong> to read 760+ chapters directly on this website with full color pages!
              </p>
            </div>
          </div>
          <button
            onClick={() => handleEditionChange(coloredEdition.id)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all hover:scale-102 active:scale-98 shadow-md shadow-indigo-600/30"
          >
            Switch to In-App Edition 🎨
          </button>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Chapters
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                {isLoadingEdition ? 'Loading...' : `${chapters.length} available`}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Provider:{' '}
              <span className="text-zinc-300 font-medium">
                {selectedEditionId === 'mangadex'
                  ? 'MangaDex (Default)'
                  : selectedEditionId === 'weebcentral'
                  ? 'WeebCentral'
                  : selectedEditionId === 'mangapill'
                  ? 'MangaPill'
                  : selectedEditionId === 'nettruyen'
                  ? 'NetTruyen (Tiếng Việt)'
                  : selectedEditionId === 'all'
                  ? 'All Providers (Merged)'
                  : editions.find((e) => e.id === selectedEditionId)?.title || 'MangaDex'}
              </span>
            </p>
          </div>
        </div>

        {/* Multi-Provider / Edition Switcher */}
        <div className="flex items-center gap-2 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800">
          <Server className="w-3.5 h-3.5 text-indigo-400 ml-1.5 shrink-0" />
          <span className="text-xs font-medium text-zinc-400">Provider:</span>
          <select
            value={selectedEditionId}
            onChange={(e) => handleEditionChange(e.target.value)}
            disabled={isLoadingEdition}
            className="bg-zinc-800 text-xs text-zinc-200 font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
          >
            <option value="mangadex">MangaDex (Default)</option>
            <option value="mangapill">MangaPill (Recommended)</option>
            <option value="nettruyen">🇻🇳 NetTruyen (Local / Dev)</option>
            <option value="weebcentral">WeebCentral (Local / Dev)</option>
            <option value="all">⚡ All Providers (Merged)</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.title} {ed.isColored ? '🎨' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Search, Language & Sort Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Language Selector */}
          {availableLanguages.length > 1 && (
            <div className="relative flex items-center">
              <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-zinc-800/80 text-xs text-zinc-200 pl-7 pr-3 py-2 rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
              >
                <option value="all">All Languages</option>
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chapter Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chapter..."
              className="w-32 sm:w-36 bg-zinc-800/80 text-xs text-zinc-200 placeholder-zinc-500 pl-8 pr-3 py-2 rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-xs font-medium text-zinc-300 border border-zinc-700 transition-colors"
            title={`Sort ${sortOrder === 'desc' ? 'Oldest first' : 'Newest first'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Fallback Alternative Server Banner if active */}
      {chapters.some((c) => c.sourceProvider?.includes('Alternative')) && (
        <div className="mt-4 p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-center justify-between text-xs text-violet-200 shadow-sm animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <span>
              <strong>Multi-Source Fallback Active:</strong> Missing and unlisted chapters have been automatically supplemented from alternative servers.
            </span>
          </span>
        </div>
      )}

      {/* Chapters Table or Informative Empty State */}
      <div className="mt-4 divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto pr-1 relative">
        {isLoadingEdition ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">Loading chapters...</span>
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="py-10 px-4 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-zinc-400" />
            </div>

            <div>
              <h4 className="text-base font-bold text-zinc-200">
                {selectedEditionId === 'weebcentral'
                  ? 'WeebCentral unavailable on cloud host'
                  : selectedEditionId === 'nettruyen'
                  ? 'NetTruyen is blocked by Cloudflare on Vercel'
                  : selectedEditionId === 'mangadex'
                  ? 'No chapters currently available on MangaDex'
                  : 'No chapters found for this provider'}
              </h4>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {selectedEditionId === 'weebcentral'
                  ? 'WeebCentral is protected by Cloudflare and blocks datacenter IPs in production. Switch to MangaPill (which has 1,100+ chapters) or MangaDex to read this manga!'
                  : selectedEditionId === 'nettruyen'
                  ? 'NetTruyen blocks cloud hosting datacenters (AWS / Vercel). NetTruyen works when running locally (localhost), but on Vercel production please switch to MangaPill or MangaDex!'
                  : selectedEditionId === 'mangadex'
                  ? 'MangaDex does not host chapters for this series. Try switching to MangaPill or WeebCentral to read this manga!'
                  : 'Try selecting a different provider from the dropdown to check for available chapters.'}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 justify-center">
              {selectedEditionId !== 'mangapill' && (
                <button
                  onClick={() => handleEditionChange('mangapill')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  ⚡ Switch to MangaPill (Recommended)
                </button>
              )}
              {selectedEditionId !== 'nettruyen' && (
                <button
                  onClick={() => handleEditionChange('nettruyen')}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 text-xs font-semibold border border-rose-800/80 transition-colors shadow-sm"
                >
                  🇻🇳 Đọc Tiếng Việt (NetTruyen)
                </button>
              )}
              {selectedEditionId !== 'mangadex' && (
                <button
                  onClick={() => handleEditionChange('mangadex')}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                >
                  Switch to MangaDex
                </button>
              )}
              {selectedEditionId !== 'weebcentral' && (
                <button
                  onClick={() => handleEditionChange('weebcentral')}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                >
                  Check WeebCentral
                </button>
              )}
              {selectedEditionId !== 'all' && (
                <button
                  onClick={() => handleEditionChange('all')}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                >
                  Check All Providers
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-left text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Common reasons for missing chapters:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-zinc-400">
                <li>Exclusive official license (Webtoons, Tappytoon, Tapas, Kakao).</li>
                <li>Scanlation group hosts exclusively on their private portal.</li>
                <li>DMCA takedown from copyright holders on MangaDex.</li>
              </ul>
            </div>

            {/* Quick External Search Links */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <a
                href={`https://mangadex.org/search?q=${encodeURIComponent(mangaTitle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
              >
                <span>Search MangaDex</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(mangaTitle + ' manga online read')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
              >
                <span>Search on Google</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>
        ) : (
          filteredChapters.map((ch) => {
            const hasExternal = !!ch.externalUrl;
            const chapterLabel = ch.chapter ? `Chapter ${ch.chapter}` : 'Special';

            return (
              <div
                key={ch.id}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/40 rounded-xl transition-colors group"
              >
                {/* Chapter Info */}
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                        {chapterLabel}
                      </span>
                      {ch.translatedLanguage && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                          {ch.translatedLanguage}
                        </span>
                      )}
                      {ch.sourceProvider?.includes('Alternative') && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          ⚡ Alternative Server
                        </span>
                      )}
                      {ch.title && (
                        <span className="text-sm text-zinc-400 truncate max-w-xs sm:max-w-md">
                          - {ch.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                      {ch.publishAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {formatDate(ch.publishAt)}
                        </span>
                      )}
                      {ch.scanlationGroup && (
                        <span className="text-zinc-400 font-medium truncate max-w-[150px]">
                          {ch.scanlationGroup}
                        </span>
                      )}
                      {ch.pages > 0 && (
                        <span className="text-zinc-500">{ch.pages} pages</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex items-center gap-2">
                  {hasExternal ? (
                    <a
                      href={ch.externalUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all hover:scale-102 active:scale-98"
                    >
                      <span>Read on MangaPlus</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <Link
                      href={`/read/${ch.id}?mangaId=${mangaId}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all hover:scale-102 active:scale-95"
                    >
                      <span>Read Chapter</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
