import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Allowed image source domain suffixes to prevent SSRF while supporting all providers
const ALLOWED_HOST_SUFFIXES = [
  'mangadex.network',
  'mangadex.org',
  'anilist.co',
  'kitsu.io',
  'weebcentral.com',
  'mangapill.com',
  'mpcdn.top',
  'mpcdn.xyz',
  'mpcdn.org',
  'comick.pictures',
  'comick.fun',
  'comick.cc',
  'comick.io',
  'comick.app',
  'compsci88.com',
  'lowee.us',
  'leanbox.us',
  'gamindustri.us',
  'lastation.us',
  'subduedconquest.com',
  'readdetectiveconan.com',
  'readonepiece.com',
  'readchainsawman.com',
  'readjujutsukaisen.com',
  'readheroacademia.com',
  'readbleach.com',
  'readnaruto.com',
  'readberserk.com',
  'readvinlandsaga.com',
  'cloud-zzz.com',
  'kcgsbok.com',
  'nettruyen.gg',
  'nettruyenar.com',
  'nettruyenww.com',
  'nettruyenrr.com',
  'nettruyen.com',
  'truyenvua.com',
  'truyenqqviet.com',
  'truyenqq.com',
];

function isAllowedHost(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Prevent SSRF / internal IP / localhost abuse
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '127.0.0.1' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.includes('metadata.google')
    ) {
      return false;
    }

    // 1. Direct or subdomain match against allowed host suffixes
    if (
      ALLOWED_HOST_SUFFIXES.some(
        (suffix) => host === suffix || host.endsWith(`.${suffix}`)
      )
    ) {
      return true;
    }

    // 2. MangaPill franchise reader domains: *.readdetectiveconan.com, *.readonepiece.com, etc.
    if (/^([a-z0-9-]+\.)?read[a-z0-9-]+\.(com|org|net|us|top)$/i.test(host)) {
      return true;
    }

    // 3. MangaPill CDN storage paths (/file/mangap/..., /file/mangapill/...)
    if (
      parsed.pathname.startsWith('/file/mangap/') ||
      parsed.pathname.startsWith('/file/mangapill/')
    ) {
      return true;
    }

    // 4. Manga CDN hosts using .us or .top or .pictures
    if (
      (host.endsWith('.us') || host.endsWith('.top') || host.endsWith('.pictures')) &&
      (parsed.pathname.includes('/file/') ||
        parsed.pathname.includes('/chapters/') ||
        parsed.pathname.includes('/manga/'))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function getRefererForUrl(targetUrl: string): string {
  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // WeebCentral CDNs
    if (
      host.includes('weebcentral') ||
      host.includes('leanbox') ||
      host.includes('compsci88') ||
      host.includes('lowee') ||
      host.includes('gamindustri') ||
      host.includes('lastation') ||
      host.includes('subduedconquest')
    ) {
      return 'https://weebcentral.com/';
    }

    // MangaPill CDNs & franchise reader domains
    if (
      host.includes('mangapill') ||
      host.includes('mpcdn') ||
      host.includes('readdetectiveconan') ||
      host.includes('readonepiece') ||
      /^([a-z0-9-]+\.)?read[a-z0-9-]+\.(com|org|net|us|top)$/i.test(host) ||
      pathname.startsWith('/file/mangap/') ||
      pathname.startsWith('/file/mangapill/')
    ) {
      return 'https://mangapill.com/';
    }

    // NetTruyen CDNs
    if (
      host.includes('cloud-zzz') ||
      host.includes('kcgsbok') ||
      host.includes('nettruyen') ||
      host.includes('truyenqq') ||
      host.includes('truyenvua')
    ) {
      return 'https://nettruyen.gg/';
    }

    // Comick
    if (host.includes('comick')) {
      return 'https://comick.io/';
    }

    // Default MangaDex
    return 'https://mangadex.org/';
  } catch {
    return 'https://mangadex.org/';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 });
  }

  if (!isAllowedHost(targetUrl)) {
    return NextResponse.json({ error: 'Target host is not permitted' }, { status: 403 });
  }

  try {
    const primaryReferer = getRefererForUrl(targetUrl);

    let upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: primaryReferer,
      },
    });

    // If upstream rejects with 403 or 401, retry with candidate referers (origin, root domain, or none)
    if (!upstreamRes.ok && (upstreamRes.status === 403 || upstreamRes.status === 401)) {
      try {
        const parsed = new URL(targetUrl);
        const rootHost = parsed.hostname.replace(/^[a-z0-9-]+\./, '');
        const candidateReferers = [
          `${parsed.protocol}//${parsed.hostname}/`,
          `${parsed.protocol}//${rootHost}/`,
          '',
        ];

        for (const altReferer of candidateReferers) {
          if (altReferer === primaryReferer) continue;
          const headers: Record<string, string> = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          };
          if (altReferer) {
            headers['Referer'] = altReferer;
          }

          const retryRes = await fetch(targetUrl, { headers });
          if (retryRes.ok) {
            upstreamRes = retryRes;
            break;
          }
        }
      } catch {
        // Ignore fallback error and continue with initial response check
      }
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstreamRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Proxy failure: ${message}` }, { status: 502 });
  }
}

