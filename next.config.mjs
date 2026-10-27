/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    CLOUDFLARE_PROXY_URL:
      process.env.CLOUDFLARE_PROXY_URL ||
      process.env.NEXT_PUBLIC_PROXY_URL ||
      process.env.NEXT_PUBLIC_CLOUDFLARE_PROXY_URL ||
      process.env.PROXY_URL ||
      '',
    NEXT_PUBLIC_PROXY_URL:
      process.env.CLOUDFLARE_PROXY_URL ||
      process.env.NEXT_PUBLIC_PROXY_URL ||
      process.env.NEXT_PUBLIC_CLOUDFLARE_PROXY_URL ||
      process.env.PROXY_URL ||
      '',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
      {
        protocol: 'https',
        hostname: '**.mangadex.org',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

