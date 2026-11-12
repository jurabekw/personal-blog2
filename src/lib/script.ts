import type { Script } from './translit/types.js';

export type { Script };

export const SITE_ORIGIN = 'https://www.jurabek.blog';
export const SCRIPTS: Script[] = ['latn', 'cyrl', 'yangi'];

export const SCRIPT_PREFIX: Record<Script, '' | '/kirill' | '/yangi'> = {
  latn: '',
  cyrl: '/kirill',
  yangi: '/yangi',
};

export const HTML_LANG: Record<Script, 'uz-Latn' | 'uz-Cyrl'> = {
  latn: 'uz-Latn',
  cyrl: 'uz-Cyrl',
  yangi: 'uz-Latn',
};

export const SCRIPT_LABEL: Record<Script, string> = {
  latn: "O'zbek",
  cyrl: 'Ўзбек',
  yangi: 'Özbek',
};

export function isScript(value: unknown): value is Script {
  return value === 'latn' || value === 'cyrl' || value === 'yangi';
}

/** Splits an alphabet prefix off a pathname. `isPage` is false for admin, API and file paths. */
export function parseScriptPath(pathname: string): { script: Script; path: string; isPage: boolean } {
  const raw = (pathname || '/').split(/[?#]/)[0] || '/';
  let script: Script = 'latn';
  let path = raw;
  for (const s of ['cyrl', 'yangi'] as const) {
    const prefix = SCRIPT_PREFIX[s];
    if (raw === prefix || raw.startsWith(prefix + '/')) {
      script = s;
      path = raw.slice(prefix.length) || '/';
      break;
    }
  }
  const isPage =
    !/^\/(admin|api)(\/|$)/.test(path) &&
    !/^\/(@|src\/|node_modules\/)/.test(raw) &&
    !/\.[a-z0-9]+$/i.test(path);
  return { script, path, isPage };
}

export function buildScriptPath(script: Script, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SCRIPT_PREFIX[script]}${p}`;
}

/** Drops query/hash, lowercases, removes trailing slash (except root). */
export function canonicalPath(path: string): string {
  const p = (path || '/').split(/[?#]/)[0].toLowerCase().replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

/** Absolute canonical URL for a page in an alphabet. */
export function canonicalUrl(script: Script, path: string): string {
  return SITE_ORIGIN + buildScriptPath(script, canonicalPath(path));
}
