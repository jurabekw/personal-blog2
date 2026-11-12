export function defaultRobotsTxt(siteUrl: string): string {
  return [
    'User-agent: *',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /search/',
    'Disallow: /kirill/search/',
    'Disallow: /yangi/search/',
    'Allow: /api/legacy-upload/',
    '',
    `Sitemap: ${siteUrl}/sitemap_index.xml`,
    '',
  ].join('\n')
}
