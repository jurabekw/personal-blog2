import { transliterateText } from './core';
import type { Script, TranslitConfig } from './types';

const TOKEN_RE = /(<!--[\s\S]*?-->|<[^>]+>)/;
const ENTITY_RE = /(&[a-zA-Z#0-9]+;)/;
const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style', 'kbd', 'textarea']);
const ATTR_RE = /(\s(?:alt|title)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;

function textSegment(text: string, script: Script, cfg: TranslitConfig): string {
  return text
    .split(ENTITY_RE)
    .map((part, i) => (i % 2 === 1 ? part : transliterateText(part, script, cfg)))
    .join('');
}

function tagSegment(tag: string, script: Script, cfg: TranslitConfig): string {
  return tag.replace(ATTR_RE, (_m, head: string, dq?: string, sq?: string) => {
    const quote = dq !== undefined ? '"' : "'";
    return `${head}${quote}${textSegment(dq ?? sq ?? '', script, cfg)}${quote}`;
  });
}

/** Transliterates the visible text of an HTML fragment, leaving markup, URLs, code and entities untouched. */
export function transliterateHtml(html: string, script: Script, cfg: TranslitConfig): string {
  if (script === 'latn' || !html) return html;
  let skip = 0;
  return html
    .split(TOKEN_RE)
    .map((seg, i) => {
      if (i % 2 === 0) return skip > 0 ? seg : textSegment(seg, script, cfg);
      if (seg.startsWith('<!--')) return seg;
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(seg);
      if (!m) return seg;
      const name = m[2].toLowerCase();
      if (SKIP_TAGS.has(name)) {
        if (m[1]) skip = Math.max(0, skip - 1);
        else if (!seg.endsWith('/>')) skip++;
        return seg;
      }
      return m[1] || skip > 0 ? seg : tagSegment(seg, script, cfg);
    })
    .join('');
}
