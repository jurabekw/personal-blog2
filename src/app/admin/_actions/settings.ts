'use server'

import { requireUser } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/data/settings'
import { sanitizeContent, sanitizePlain } from '@/lib/content/sanitize'
import { revalidateSite } from '@/lib/revalidate'
import { DEFAULT_SETTINGS, type AllSettings, type SettingsKey } from '@/lib/settings-defaults'
import type { ActionResult } from '@/lib/admin-types'

/** Fields that may contain raw HTML/script (administrators only). */
const RAW_FIELDS = new Set(['headCode', 'bodyCode', 'robotsTxt', 'homeContent'])

/** Recursively coerce `value` into the shape of `shape` (unknown keys dropped, types fixed, strings sanitized). */
function coerce(shape: unknown, value: unknown, key = ''): unknown {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return shape
    return value.slice(0, 200).map((item) => {
      if (typeof item === 'string') return sanitizePlain(item).slice(0, 2000)
      if (item && typeof item === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          if (k === 'children' && Array.isArray(v)) out[k] = coerce([], v)
          else if (typeof v === 'string') out[k] = sanitizePlain(v).slice(0, 2000)
          else if (typeof v === 'boolean' || typeof v === 'number') out[k] = v
        }
        return out
      }
      return null
    }).filter((x) => x !== null)
  }
  if (shape !== null && typeof shape === 'object') {
    const src = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    const out: Record<string, unknown> = {}
    for (const [k, def] of Object.entries(shape as Record<string, unknown>)) out[k] = coerce(def, src[k], k)
    return out
  }
  if (typeof shape === 'boolean') return typeof value === 'boolean' ? value : Boolean(value ?? shape)
  if (typeof shape === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : shape
  }
  if (typeof shape === 'string') {
    if (typeof value !== 'string') return shape
    if (RAW_FIELDS.has(key)) return value.slice(0, 100_000)
    return sanitizePlain(value).slice(0, 5000)
  }
  return value ?? shape
}

export async function saveSettingsAction<K extends SettingsKey>(key: K, value: AllSettings[K]): Promise<ActionResult> {
  const user = await requireUser(key === 'seo' ? 'edit_others' : 'manage_options')
  if (!(key in DEFAULT_SETTINGS)) return { ok: false, error: 'Unknown settings group.' }
  const current = await getSettings()
  const next = coerce(DEFAULT_SETTINGS[key], value) as AllSettings[K]

  if (key === 'general') {
    const g = next as AllSettings['general']
    g.siteUrl = g.siteUrl.trim().replace(/\/+$/, '')
    if (g.siteUrl && !/^https?:\/\/[^/]+$/i.test(g.siteUrl)) return { ok: false, error: 'Site URL must look like https://www.example.com (no path).' }
  }
  if (key === 'appearance') {
    const a = next as AllSettings['appearance']
    a.homeContent = sanitizeContent(a.homeContent)
    if (!/^#[0-9a-f]{6}$/i.test(a.primaryColor)) a.primaryColor = DEFAULT_SETTINGS.appearance.primaryColor
    a.contentWidth = Math.min(1440, Math.max(960, Math.round(a.contentWidth)))
    a.sidebar.blogNav.recentCount = Math.min(10, Math.max(1, Math.round(a.sidebar.blogNav.recentCount)))
  }
  if (key === 'reading') {
    const r = next as AllSettings['reading']
    r.postsPerPage = Math.min(50, Math.max(1, Math.round(r.postsPerPage)))
    r.homeRecentCount = Math.min(12, Math.max(0, Math.round(r.homeRecentCount)))
    r.feedItems = Math.min(100, Math.max(1, Math.round(r.feedItems)))
  }
  if (key === 'seo') {
    const s = next as AllSettings['seo']
    // Accept a pasted <meta ... content="..."> tag for verification codes.
    for (const k of Object.keys(s.verification) as (keyof AllSettings['seo']['verification'])[]) {
      const m = s.verification[k].match(/content=["']?([^"'>\s]+)/i)
      s.verification[k] = (m ? m[1] : s.verification[k]).trim()
    }
    s.analytics.ga4 = s.analytics.ga4.trim()
    s.analytics.gtm = s.analytics.gtm.trim()
    s.analytics.yandexMetrica = s.analytics.yandexMetrica.replace(/\D/g, '')
    s.social.twitterUsername = s.social.twitterUsername.replace(/^@/, '').trim()
    if (!['uz', 'ru', 'en'].includes(s.analysisLanguage)) s.analysisLanguage = 'uz'
    if (user.role !== 'administrator') {
      // Only administrators may change code that runs on every page.
      s.analytics.headCode = current.seo.analytics.headCode
      s.analytics.bodyCode = current.seo.analytics.bodyCode
      s.robotsTxt = current.seo.robotsTxt
    }
  }

  await saveSettings(key, next)
  revalidateSite()
  return { ok: true, message: 'Settings saved.' }
}
