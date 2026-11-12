import { uzbekTranslations } from './i18n.js';
import { transliterateText } from './translit/core.js';
import type { Script, TranslitConfig } from './translit/types.js';

export type UiStrings = typeof uzbekTranslations;

const cache = new Map<string, UiStrings>();

function deepMap<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepMap(v, fn)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepMap(v, fn);
    return out as T;
  }
  return value;
}

/** All fixed interface text (menus, buttons, labels) in the given alphabet. */
export function getUiStrings(script: Script, cfg: TranslitConfig): UiStrings {
  if (script === 'latn') return uzbekTranslations;
  const key = `${script}|${cfg.version}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = deepMap(uzbekTranslations, (s) => transliterateText(s, script, cfg));
    cache.set(key, hit);
  }
  return hit;
}
