import { transliterateText } from './core.js';
import type { Script, TranslitConfig } from './types.js';

/**
 * Inline segments that must never be transliterated: inline code, link/image targets,
 * HTML tags, bare URLs, footnote markers and HTML entities.
 */
const PROTECTED_INLINE = /(`[^`]*`|\]\([^)]*\)|<[^>]+>|https?:\/\/[^\s)]+|\[\^[^\]]*\]|&[a-zA-Z#0-9]+;)/;

function transliterateLine(line: string, script: Script, cfg: TranslitConfig): string {
  return line
    .split(PROTECTED_INLINE)
    .map((part, i) => (i % 2 === 1 ? part : transliterateText(part, script, cfg)))
    .join('');
}

/** Transliterates the readable text of a markdown document, leaving code and URLs untouched. */
export function transliterateMarkdown(md: string, script: Script, cfg: TranslitConfig): string {
  if (!md || script === 'latn') return md;
  let inFence = false;
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : transliterateLine(line, script, cfg);
    })
    .join('\n');
}
