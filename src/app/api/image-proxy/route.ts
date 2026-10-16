import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Allowed image source domains to prevent open proxy / SSRF abuse
const ALLOWED_HOSTS = [
  'mangadex.network',
  'mangadex.org',
  'anilist.co',
  'kitsu.io',
  'weebcentral.com',
  'mangapill.com',
  'mpcdn.top',
  'comick.pictures',
  'comick.fun',
  'comick.cc',
  'comick.io',
  'compsci88.com',
  'lowee.us',
  'leanbox.us',
];

function isAllowedHost(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function getRefererForUrl(targetUrl: string): string {
  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    if (
      host.includes('weebcentral') ||
      host.includes('leanbox') ||
      host.includes('compsci88') ||
      host.includes('lowee')
    ) {
      return 'https://weebcentral.com/';
    }
    if (host.includes('mangapill') || host.includes('mpcdn')) {
      return 'https://mangapill.com/';
    }
    if (host.includes('comick')) {
      return 'https://comick.io/';
    }
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
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: getRefererForUrl(targetUrl),
      },
    });

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

