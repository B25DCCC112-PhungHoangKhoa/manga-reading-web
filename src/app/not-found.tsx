import React from 'react';
import Link from 'next/link';
import { BookX, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-center mb-6 shadow-xl text-brand-yellow">
        <BookX className="w-8 h-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
        Page Not Found
      </h1>

      <p className="max-w-md text-sm sm:text-base text-zinc-400 mb-8 leading-relaxed">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-yellow hover:bg-brand-yellow-light text-black font-extrabold text-sm transition-all shadow-lg shadow-brand-yellow/30 active:scale-95"
      >
        <Home className="w-4 h-4 text-black stroke-[2.5]" />
        Return to Home
      </Link>
    </div>
  );
}
