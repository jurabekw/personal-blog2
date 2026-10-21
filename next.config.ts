import type { NextConfig } from 'next'

/**
 * Extra image hosts (comma separated) that next/image may optimize, e.g. a
 * Supabase Storage or S3 bucket. Vercel Blob is always allowed.
 */
const extraImageHosts = (process.env.IMAGE_HOSTS || '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  // WordPress URLs end with "/" — keep them identical so rankings carry over.
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 75, 85],
    deviceSizes: [420, 640, 828, 1080, 1200, 1600],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      ...extraImageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },

  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
  },

  // Fonts used by the generated share images (/og/).
  outputFileTracingIncludes: {
    '/og': ['./assets/og/**/*'],
  },

  async redirects() {
    return [
      // Legacy WordPress endpoints → new equivalents.
      { source: '/wp-admin', destination: '/admin/', permanent: true },
      { source: '/wp-admin/:path*', destination: '/admin/', permanent: true },
      { source: '/wp-login.php', destination: '/admin/login/', permanent: true },
      { source: '/sitemap.xml', destination: '/sitemap_index.xml', permanent: true },
      { source: '/wp-sitemap.xml', destination: '/sitemap_index.xml', permanent: true },
      { source: '/rss', destination: '/feed/', permanent: true },
      { source: '/rss.xml', destination: '/feed/', permanent: true },
      { source: '/feed.xml', destination: '/feed/', permanent: true },
      { source: '/comments/feed', destination: '/feed/', permanent: true },
      { source: '/author/:name', destination: '/men-haqimda/', permanent: true },
      { source: '/author/:name/:rest*', destination: '/men-haqimda/', permanent: true },
      { source: '/blog/page/1', destination: '/blog/', permanent: true },
      // /?p=123, /?page_id=12 and /?s=query (classic WordPress query URLs)
      {
        source: '/',
        has: [{ type: 'query', key: 'p', value: '(?<pid>\\d+)' }],
        destination: '/api/legacy/:pid/',
        permanent: true,
      },
      {
        source: '/',
        has: [{ type: 'query', key: 'page_id', value: '(?<pageid>\\d+)' }],
        destination: '/api/legacy/:pageid/',
        permanent: true,
      },
      {
        source: '/',
        has: [{ type: 'query', key: 's', value: '(?<q>.*)' }],
        destination: '/search/?q=:q',
        permanent: false,
      },
    ]
  },

  async rewrites() {
    return [
      // Old /wp-content/uploads/... image URLs are looked up and redirected to their new home.
      { source: '/wp-content/uploads/:path*', destination: '/api/legacy-upload/:path*' },
    ]
  },

  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    ]
    return [
      { source: '/:path*', headers: security },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/fonts/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/images/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
    ]
  },
}

export default nextConfig
