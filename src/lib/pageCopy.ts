export type PageKind = 'home' | 'blog' | 'post' | 'contact' | 'notfound';

/** Page titles/descriptions in current Latin (transliterated per alphabet at render time). */
export const PAGE_COPY: Record<Exclude<PageKind, 'post'>, { title: string; description: string }> = {
  home: { title: 'Bosh sahifa', description: '' },
  blog: {
    title: 'Maqolalar va Insholar',
    description: "Marketing, Sun'iy Intellekt va vebsaytlar haqidagi barcha maqolalar va insholar to'plami.",
  },
  contact: {
    title: "Bog'lanish",
    description: "Savollar va takliflar uchun elektron pochta orqali bog'laning.",
  },
  notfound: {
    title: 'Sahifa topilmadi',
    description: "Siz qidirayotgan sahifa o'chirilgan yoki manzili o'zgartirilgan bo'lishi mumkin.",
  },
};

/** Classifies an unprefixed path. Post slugs are decoded and lowercased. */
export function pageKindFor(path: string): { kind: PageKind; slug?: string } {
  const p = (path || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (p === '/') return { kind: 'home' };
  if (p === '/blog') return { kind: 'blog' };
  if (p === '/contact') return { kind: 'contact' };
  const m = p.match(/^\/blog\/([^/]+)$/);
  if (m) {
    let slug = m[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep raw */
    }
    return { kind: 'post', slug: slug.toLowerCase() };
  }
  return { kind: 'notfound' };
}
