export function defaultRobotsTxt(siteUrl: string): string {
  return [
    'User-agent: *',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /search/',
    'Allow: /api/legacy-upload/',
    '',
    `Sitemap: ${siteUrl}/sitemap_index.xml`,
    '',
  ].join('\n')
}
