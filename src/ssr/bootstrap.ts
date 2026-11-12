import type { Script } from '../lib/script.js';
import type { PageKind } from '../lib/pageCopy.js';
import type { Category, Post, SiteSettings } from '../types.js';

/** Data the server embeds in the page so the client app starts without a loading state. */
export interface Bootstrap {
  script: Script;
  kind: PageKind;
  alphabetsEnabled: boolean;
  /** Current post with full content (post pages only). */
  post: Post | null;
  /** All published posts, already in `script`, with `content` emptied to keep the page small. */
  posts: Post[];
  categories: Category[];
  settings: SiteSettings;
}

declare global {
  interface Window {
    __BOOTSTRAP__?: Bootstrap;
  }
}

export function readBootstrap(): Bootstrap | null {
  if (typeof window === 'undefined') return null;
  return window.__BOOTSTRAP__ ?? null;
}
