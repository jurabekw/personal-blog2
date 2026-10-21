import 'server-only'
import { cache } from 'react'
import { getDb, isDatabaseConfigured, schema } from '@/lib/db'
import { DEFAULT_SETTINGS, mergeDeep, type AllSettings, type SettingsKey } from '@/lib/settings-defaults'

/** All settings groups merged over defaults. Deduplicated per request. */
export const getSettings = cache(async (): Promise<AllSettings> => {
  if (!isDatabaseConfigured()) return DEFAULT_SETTINGS
  try {
    const rows = await getDb().select().from(schema.settings)
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<SettingsKey, unknown>>
    return {
      general: mergeDeep(DEFAULT_SETTINGS.general, stored.general),
      reading: mergeDeep(DEFAULT_SETTINGS.reading, stored.reading),
      appearance: mergeDeep(DEFAULT_SETTINGS.appearance, stored.appearance),
      menus: mergeDeep(DEFAULT_SETTINGS.menus, stored.menus),
      seo: mergeDeep(DEFAULT_SETTINGS.seo, stored.seo),
    }
  } catch (error) {
    console.error('[settings] Falling back to defaults:', error)
    return DEFAULT_SETTINGS
  }
})

export async function saveSettings<K extends SettingsKey>(key: K, value: AllSettings[K]): Promise<void> {
  const db = getDb()
  await db
    .insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } })
}

/** Canonical origin of the public site, without trailing slash. */
export function resolveSiteUrl(settings: AllSettings): string {
  const fromSettings = settings.general.siteUrl?.trim()
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  const url = fromSettings || fromEnv || (vercel ? `https://${vercel}` : 'http://localhost:3000')
  return url.replace(/\/+$/, '')
}

export async function getSiteUrl(): Promise<string> {
  return resolveSiteUrl(await getSettings())
}
