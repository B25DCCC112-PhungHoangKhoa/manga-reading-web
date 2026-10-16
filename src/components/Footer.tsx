import React from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800/80 bg-zinc-950/80 mt-16 py-12 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-zinc-800/60">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-white">
                Manga<span className="text-indigo-400">Pulse</span>
              </span>
            </Link>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              A modern, blazingly fast manga reader built with Next.js App Router, Tailwind CSS, and TypeScript.
              Powered dynamically by AniList and MangaDex public APIs with zero web scraping.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#trending" className="hover:text-white transition-colors">
                  Trending Manga
                </a>
              </li>
              <li>
                <a href="#latest" className="hover:text-white transition-colors">
                  Latest Updates
                </a>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* API Attribution */}
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">APIs & Data</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://anilist.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  AniList GraphQL API
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://api.mangadex.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  MangaDex API & @Home
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright and disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} MangaPulse. Built for educational & demo purposes.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> using Next.js & Tailwind
          </p>
        </div>
      </div>
    </footer>
  );
}

