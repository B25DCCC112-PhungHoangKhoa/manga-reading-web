'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import iconImg from '@/app/icon.png';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, Search, X, Star, Flame, Compass, SlidersHorizontal, Menu } from 'lucide-react';
import { AniListManga } from '@/lib/types';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AniListManga[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard accessibility: close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown or mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('[data-mobile-toggle]')
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectManga = (id: number) => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setSearchQuery('');
    router.push(`/manga/${id}`);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? 'bg-brand-bg/95 backdrop-blur-md border-b border-brand-border/80 shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-brand-bg/95 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand Logo matching MangaPulse Mobile */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-md shadow-brand-yellow/20 group-hover:scale-105 transition-transform">
            <Image
              src={iconImg}
              alt="MangaPulse Icon"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex items-center">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:opacity-90 transition-opacity">
              Manga<span className="text-brand-yellow">Pulse</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
          <Link
            href="/"
            className={`hover:text-brand-yellow transition-colors flex items-center gap-1.5 ${
              pathname === '/' ? 'text-brand-yellow font-bold' : ''
            }`}
          >
            <Compass className={`w-4 h-4 ${pathname === '/' ? 'text-brand-yellow' : 'text-zinc-400'}`} />
            Discover
          </Link>
          <Link
            href="/browse"
            className={`hover:text-brand-yellow transition-colors flex items-center gap-1.5 ${
              pathname === '/browse' ? 'text-brand-yellow font-bold' : ''
            }`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${pathname === '/browse' ? 'text-brand-yellow' : 'text-zinc-400'}`} />
            Browse & Filter
          </Link>
          <Link
            href="/#trending"
            className="hover:text-brand-yellow transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-brand-yellow" />
            Trending
          </Link>
          <Link
            href="/#latest"
            className="hover:text-brand-yellow transition-colors flex items-center gap-1.5"
          >
            <Star className="w-4 h-4 text-brand-yellow" />
            Latest
          </Link>
        </nav>

        {/* Search Bar & Dropdown matching Mobile Pill Style */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-yellow" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setIsDropdownOpen(true)}
              placeholder="Find comics..."
              className="w-full bg-brand-card text-sm text-zinc-100 placeholder-zinc-400 pl-10 pr-9 py-2 rounded-full border border-brand-border focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/40 transition-all shadow-inner"
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
            <div className="absolute top-full left-0 right-0 mt-2 bg-brand-card/95 backdrop-blur-md border border-brand-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {isSearching ? (
                <div className="p-6 text-center text-sm text-zinc-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
                  Searching comics...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2 divide-y divide-brand-border/60 max-h-96 overflow-y-auto">
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
                        className="px-4 py-2.5 flex items-center gap-3.5 hover:bg-brand-card-light cursor-pointer transition-colors"
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
                              <span className="flex items-center gap-1 text-xs text-amber-300 font-bold">
                                <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
                                {manga.averageScore}%
                              </span>
                            )}
                            <span className="text-xs text-zinc-400 truncate">
                              {manga.genres?.slice(0, 2).join(', ')}
                            </span>
                            {manga.status && (
                              <span className="text-[10px] text-brand-yellow font-bold uppercase px-1.5 py-0.2 rounded bg-black/60 border border-brand-border">
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

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          data-mobile-toggle
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          className="md:hidden shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-zinc-300 hover:text-white bg-brand-card hover:bg-brand-card-light border border-brand-border transition-all active:scale-95 shadow-sm"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-brand-yellow" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden border-b border-brand-border bg-brand-bg/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200 shadow-2xl shadow-black/50"
        >
          <nav className="px-4 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === '/'
                  ? 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30'
                  : 'text-zinc-300 hover:text-white hover:bg-brand-card'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">Discover</div>
                <div className="text-[11px] text-zinc-400">Homepage & featured manga</div>
              </div>
            </Link>

            <Link
              href="/browse"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === '/browse'
                  ? 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30'
                  : 'text-zinc-300 hover:text-white hover:bg-brand-card'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-brand-yellow">Browse & Filter</div>
                <div className="text-[11px] text-zinc-400">Filter by genre, year, status & sort</div>
              </div>
            </Link>

            <Link
              href="/#trending"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-brand-card transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">Trending</div>
                <div className="text-[11px] text-zinc-400">Most popular manga this season</div>
              </div>
            </Link>

            <Link
              href="/#latest"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-brand-card transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">Latest</div>
                <div className="text-[11px] text-zinc-400">Recently updated releases</div>
              </div>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

