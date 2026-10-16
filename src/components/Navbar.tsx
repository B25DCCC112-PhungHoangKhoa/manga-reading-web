'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, X, Star, Flame, Compass, SlidersHorizontal } from 'lucide-react';
import { AniListManga } from '@/lib/types';

export default function Navbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AniListManga[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Detect scroll to add blur effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/anilist/search?q=${encodeURIComponent(searchQuery.trim())}&perPage=6`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setSearchResults(json.data || []);
            setIsDropdownOpen(true);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectManga = (id: number) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    router.push(`/manga/${id}`);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 shadow-lg shadow-black/20'
          : 'bg-gradient-to-b from-zinc-950/90 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              Manga<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Pulse</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Live
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
          <Link
            href="/"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            Discover
          </Link>
          <Link
            href="/browse"
            className="hover:text-white transition-colors flex items-center gap-1.5 text-indigo-300 font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            Browse & Filter
          </Link>
          <Link
            href="/#trending"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            Trending
          </Link>
          <Link
            href="/#latest"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Star className="w-4 h-4 text-pink-400" />
            Latest
          </Link>
        </nav>

        {/* Search Bar & Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setIsDropdownOpen(true)}
              placeholder="Search manga by title, genre..."
              className="w-full bg-zinc-900/90 text-sm text-zinc-100 placeholder-zinc-500 pl-10 pr-9 py-2 rounded-full border border-zinc-700/80 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {isSearching ? (
                <div className="p-6 text-center text-sm text-zinc-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Searching AniList...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2 divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
                  {searchResults.map((manga) => {
                    const title =
                      manga.title.english ||
                      manga.title.romaji ||
                      manga.title.native ||
                      'Untitled';
                    const cover =
                      manga.coverImage?.medium ||
                      manga.coverImage?.large ||
                      '/placeholder.png';

                    return (
                      <div
                        key={manga.id}
                        onClick={() => handleSelectManga(manga.id)}
                        className="px-4 py-2.5 flex items-center gap-3.5 hover:bg-zinc-800/60 cursor-pointer transition-colors"
                      >
                        <div className="relative w-11 h-15 shrink-0 rounded-md overflow-hidden bg-zinc-800 shadow-sm">
                          {cover && (
                            <Image
                              src={cover}
                              alt={title}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-100 truncate">
                            {title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {manga.averageScore && (
                              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {manga.averageScore}%
                              </span>
                            )}
                            <span className="text-xs text-zinc-400 truncate">
                              {manga.genres?.slice(0, 2).join(', ')}
                            </span>
                            {manga.status && (
                              <span className="text-[10px] text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800">
                                {manga.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-zinc-400">
                  No manga found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

