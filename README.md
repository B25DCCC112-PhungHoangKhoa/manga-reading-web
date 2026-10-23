# MangaWeb 📖

A modern, high-performance manga discovery and reading platform built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. It aggregates rich metadata from **AniList** and provides seamless multi-provider chapter scraping across **MangaDex**, **WeebCentral**, **MangaPill**, and **NetTruyen** with automatic fallback resolution.

---

## ✨ Features

- **⚡ Instant Navigation & Streaming UX**:
  - React 19 `<Suspense>` streaming for chapter resolution and instant App Router `loading.tsx` skeletons.
  - Manga metadata (cover art, synopsis, genres, score) displays in `< 300ms`, while slower provider scraping streams chapters in progressively.

- **📚 Multi-Provider Chapter Aggregation**:
  - Automatically queries and fallbacks across **MangaDex**, **WeebCentral**, **MangaPill**, and **NetTruyen**.
  - Intelligent title matching (English, Romaji, Native, synonyms, and MangaDex alternative titles) to eliminate missing or mismatched chapters.
  - Edition and provider switching in the chapter reader interface.

- **🎯 Advanced Discovery & Multi-Genre Filtering**:
  - Full-featured browse page (`/browse`) with multi-genre filtering supporting compound genres (e.g., *Fantasy + Drama*).
  - Explicit adult content / 18+ Hentai filtering with dedicated safe search toggles.
  - Filtering by media format (Manga, Light Novel, One-shot, Anime), publishing status, chapter/episode counts, release year, score, and content rating.

- **🖼️ High-Performance Reader**:
  - Seamless page navigation (next/prev chapter, quick chapter select).
  - Built-in secure image proxy (`/api/image-proxy`) bypassing third-party referrer restrictions and CORS blockers.

- **💾 Smart Caching & In-Memory Pagination**:
  - Two-tier caching with `node-cache` and Next.js ISR revalidation to respect rate limits and ensure sub-second page loads.
  - In-memory grid caching for smooth, instant pagination without redundant network requests.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Caching**: `node-cache`
- **Analytics**: `@vercel/analytics`

---

## 📂 Project Structure

```text
mangaWeb/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── anilist/          # Trending, latest, and title search endpoints
│   │   │   ├── chapter/          # Chapter data, images, and navigation
│   │   │   ├── discover/         # Media filtering API (GraphQL AniList queries)
│   │   │   ├── image-proxy/      # Image proxy server for cross-origin assets
│   │   │   └── manga/            # Manga metadata and chapter resolution routes
│   │   ├── browse/               # Filter & discovery page
│   │   ├── manga/[id]/           # Manga detail page & chapter index
│   │   │   ├── loading.tsx       # Instant Next.js App Router skeleton
│   │   │   └── page.tsx          # Manga details with Suspense chapter streaming
│   │   ├── read/[chapterId]/     # Manga chapter reader
│   │   ├── layout.tsx            # Global root layout with Navbar & Footer
│   │   └── page.tsx              # Home page with hero carousel & trending manga
│   ├── components/               # Reusable UI components
│   │   ├── ActiveFilterChips.tsx # Interactive removable filter tags
│   │   ├── AnimeFilterSidebar.tsx# Full discovery filter sidebar
│   │   ├── ChapterList.tsx       # Interactive chapter selector & provider tabs
│   │   ├── MangaCard.tsx         # Manga cover card with score & multi-genre badges
│   │   ├── MangaGrid.tsx         # Paginated manga grid with in-memory caching
│   │   └── Navbar.tsx            # Global navigation bar
│   └── lib/
│       ├── anilist.ts            # AniList GraphQL queries, types, and caching
│       ├── mangadex.ts           # MangaDex API client & chapter resolver
│       ├── types.ts              # Global TypeScript interfaces
│       └── providers/            # Scraper integrations & title matchers
│           ├── mangapill.ts      # MangaPill scraper
│           ├── matcher.ts        # Levenshtein/token-based title matching
│           ├── nettruyen.ts      # NetTruyen scraper
│           └── weebcentral.ts    # WeebCentral scraper
├── public/                       # Static public assets
├── package.json
└── next.config.mjs
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/anilist/trending` | `GET` | Returns trending manga from AniList with pagination (`page`, `perPage`) |
| `/api/anilist/latest` | `GET` | Returns newly updated and releasing manga |
| `/api/anilist/search` | `GET` | Search manga titles by query string (`q`) |
| `/api/discover` | `GET` | Dynamic filtering endpoint supporting genres, formats, scores, years, and chapter counts |
| `/api/manga/[id]` | `GET` | Retrieves full AniList metadata for a manga ID |
| `/api/manga/[id]/chapters` | `GET` | Scrapes and resolves chapters across MangaDex, WeebCentral, MangaPill, and NetTruyen |
| `/api/chapter/[chapterId]` | `GET` | Fetches chapter page image URLs for the reader |
| `/api/chapter/[chapterId]/navigation` | `GET` | Fetches previous and next chapter IDs |
| `/api/image-proxy` | `GET` | Proxies manga page images to bypass hotlink protection (`?url=...`) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.18+` or `v20+` (Node 22+ recommended)
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/mangaWeb.git
   cd mangaWeb
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Start the production server
npm start
```

---

## 📜 License

This project is built for educational and portfolio demonstration purposes. All manga content and artwork belong to their respective copyright owners and creators.

