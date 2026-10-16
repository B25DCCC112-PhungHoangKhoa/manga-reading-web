import React from 'react';
import Link from 'next/link';
import { BookX, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mb-6 shadow-xl text-rose-400">
        <BookX className="w-8 h-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
        Title Unavailable
      </h1>

      <p className="max-w-md text-sm sm:text-base text-zinc-400 mb-8 leading-relaxed">
        This manga currently has no readable chapters or is unavailable on MangaDex. We only display titles with active scanlations.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
      >
        <Home className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
}

