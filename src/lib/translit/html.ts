import { transliterateText } from './core';
import type { Script, TranslitConfig } from './types';

const TOKEN_RE = /(<!--[\s\S]*?-->|<[^>]+>)/;
const ENTITY_RE = /(&[a-zA-Z#0-9]+;)/;
const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style', 'kbd', 'textarea']);
const VOID_TAGS = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ATTR_RE = /(\s(?:alt|title)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;
/** WordPress-style theme shortcodes: [jb_article_sections], [jb_copy_box title="…"], [/jb_copy_box]. */
const SHORTCODE_RE = /(\[\/?jb_[a-zA-Z0-9_-]*(?:\s[^[\]<>]*)?\])/;
const SHORTCODE_TITLE_RE = /(\stitle\s*=\s*)(?:"([^"]*)"|'([^']*)'|“([^”]*)”|&quot;([\s\S]*?)&quot;)/i;

/** Apostrophe entities become the character they stand for, so O&#39;zbek is read as one word. */
function decodeApostrophes(text: string): string {
  return text
    .replace(/&(?:#0*39|#x0*27|apos);/gi, "'")
    .replace(/&(?:#0*8217|#x0*2019|rsquo);/gi, '’');
}

function plainSegment(text: string, script: Script, cfg: TranslitConfig): string {
  return decodeApostrophes(text)
    .split(ENTITY_RE)
    .map((part, i) => (i % 2 === 1 ? part : transliterateText(part, script, cfg)))
    .join('');
}

/** Shortcode token: tag and attribute names stay; only the title value is transliterated. */
function shortcodeSegment(code: string, script: Script, cfg: TranslitConfig): string {
  return code.replace(SHORTCODE_TITLE_RE, (_m, head: string, dq?: string, sq?: string, cq?: string, eq?: string) => {
    if (dq !== undefined) return `${head}"${plainSegment(dq, script, cfg)}"`;
    if (sq !== undefined) return `${head}'${plainSegment(sq, script, cfg).replace(/'/g, '&#39;')}'`;
    if (cq !== undefined) return `${head}“${plainSegment(cq, script, cfg)}”`;
    return `${head}&quot;${plainSegment(eq ?? '', script, cfg)}&quot;`;
  });
}

function textSegment(text: string, script: Script, cfg: TranslitConfig): string {
  if (!text.includes('[')) return plainSegment(text, script, cfg);
  return text
    .split(SHORTCODE_RE)
    .map((part, i) => (i % 2 === 1 ? shortcodeSegment(part, script, cfg) : plainSegment(part, script, cfg)))
    .join('');
}

function tagSegment(tag: string, script: Script, cfg: TranslitConfig): string {
  return tag.replace(ATTR_RE, (_m, head: string, dq?: string, sq?: string) => {
    if (dq !== undefined) return `${head}"${plainSegment(dq, script, cfg)}"`;
    // A decoded apostrophe must not close a single-quoted value.
    return `${head}'${plainSegment(sq ?? '', script, cfg).replace(/'/g, '&#39;')}'`;
  });
}

/** Elements whose contents are not Uzbek: lang="en…", translate="no" or class "notranslate". */
function isOptOut(tag: string): boolean {
  if (/\slang\s*=\s*["']?\s*en(?![a-z])/i.test(tag)) return true;
  if (/\stranslate\s*=\s*["']?\s*no(?![a-z])/i.test(tag)) return true;
  const cls = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(tag);
  return !!cls && (cls[1] ?? cls[2] ?? cls[3] ?? '').split(/\s+/).includes('notranslate');
}

/**
 * Transliterates the visible text of an HTML fragment, leaving markup, URLs, code, entities and
 * shortcode syntax untouched. Elements marked lang="en", translate="no" or class="notranslate"
 * (and everything inside them) are left as they are.
 */
export function transliterateHtml(html: string, script: Script, cfg: TranslitConfig): string {
  if (script === 'latn' || !html) return html;
  let skip = 0;
  /** Open opt-out element: its tag name and how many same-name elements are open inside it. */
  let optOut: { name: string; depth: number } | null = null;
  return html
    .split(TOKEN_RE)
    .map((seg, i) => {
      if (i % 2 === 0) return skip > 0 || optOut ? seg : textSegment(seg, script, cfg);
      if (seg.startsWith('<!--')) return seg;
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(seg);
      if (!m) return seg;
      const closing = !!m[1];
      const name = m[2].toLowerCase();
      const selfClosing = seg.endsWith('/>') || VOID_TAGS.has(name);
      if (optOut) {
        if (name === optOut.name && !selfClosing) {
          optOut.depth += closing ? -1 : 1;
          if (optOut.depth === 0) optOut = null;
        }
        return seg;
      }
      if (SKIP_TAGS.has(name)) {
        if (closing) skip = Math.max(0, skip - 1);
        else if (!seg.endsWith('/>')) skip++;
        return seg;
      }
      if (closing || skip > 0) return seg;
      if (isOptOut(seg)) {
        if (!selfClosing) optOut = { name, depth: 1 };
        return seg;
      }
      return tagSegment(seg, script, cfg);
    })
    .join('');
}
