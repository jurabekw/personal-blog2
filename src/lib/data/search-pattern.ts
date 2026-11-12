import { normalizeForSearch } from '@/lib/translit'

/**
 * ILIKE pattern for a site search in any alphabet. The query is normalised to current Latin
 * (Cyrillic and new-Latin letters → current Latin, lower case, apostrophe variants → '), so
 * /kirill/ and /yangi/ searches match the stored Latin text; current-Latin text passes through.
 * LIKE wildcards typed by the user are escaped, and an apostrophe matches any one character so
 * o'/o‘/oʻ in the content all match.
 */
export function searchLikePattern(query: string): string {
  const q = normalizeForSearch(query.trim())
    .replace(/[\\%_]/g, '\\$&')
    .replace(/'/g, '_')
  return `%${q}%`
}
