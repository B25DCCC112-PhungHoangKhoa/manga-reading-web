'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryPill {
  label: string;
  value: string;
  href?: string;
  targetId?: string;
}

const CATEGORY_PILLS: CategoryPill[] = [
  { label: 'Spotlight', value: 'spotlight', targetId: 'spotlight' },
  { label: 'Trending', value: 'trending', targetId: 'trending' },
  { label: 'Latest Updates', value: 'latest', targetId: 'latest' },
  { label: 'Action & Fantasy', value: 'action_fantasy', href: '/browse?genres=Action,Fantasy' },
  { label: 'Romance & Drama', value: 'romance_drama', href: '/browse?genres=Romance,Drama' },
];

export default function CategoryPills() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('spotlight');

  const handleClick = (pill: CategoryPill) => {
    setActiveCategory(pill.value);

    if (pill.href) {
      router.push(pill.href);
      return;
    }

    if (pill.targetId === 'spotlight') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (pill.targetId) {
      const el = document.getElementById(pill.targetId);
      if (el) {
        const yOffset = -80;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max">
        {CATEGORY_PILLS.map((pill) => {
          const isSelected = activeCategory === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => handleClick(pill)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-brand-yellow border-brand-yellow text-black font-black shadow-md shadow-brand-yellow/30'
                  : 'bg-brand-card border-brand-border text-zinc-400 hover:text-white hover:bg-brand-card-light'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

