import React from 'react';

export interface TableColumn {
  header: string;
  align: 'left' | 'center' | 'right';
}

export function parseMarkdownTable(block: string): { headers: TableColumn[]; rows: string[][] } | null {
  if (!block || !block.includes('|')) return null;

  const lines = block
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  // Header line must contain pipes
  const headerLine = lines[0];
  if (!headerLine.includes('|')) return null;

  // Second line must be the separator: e.g. |---|:---:|---:|
  const separatorLine = lines[1];
  const isSeparator = /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(separatorLine);
  if (!isSeparator) return null;

  const extractCells = (line: string): string[] => {
    let clean = line.trim();
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map((c) => c.trim());
  };

  const rawHeaders = extractCells(headerLine);
  const rawAligns = extractCells(separatorLine);

  if (rawHeaders.length === 0) return null;

  const headers: TableColumn[] = rawHeaders.map((header, idx) => {
    const alignStr = rawAligns[idx] || '';
    const leftColon = alignStr.startsWith(':');
    const rightColon = alignStr.endsWith(':');

    let align: 'left' | 'center' | 'right' = 'left';
    if (leftColon && rightColon) {
      align = 'center';
    } else if (rightColon) {
      align = 'right';
    }

    return { header, align };
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = extractCells(lines[i]);
    const normalizedCells: string[] = headers.map((_, colIdx) => cells[colIdx] || '');
    rows.push(normalizedCells);
  }

  return { headers, rows };
}

/**
 * Ultra-fast O(N) single-pass inline markdown tokenizer.
 * Handles bold (**text**), italic (*text* / _text_), inline code (`code`), and markdown links ([text](url))
 * with fast-path fallback and zero catastrophic backtracking.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return '';

  // Fast-path: If the string has none of the markdown characters, return plain string immediately
  if (!text.includes('*') && !text.includes('`') && !text.includes('[') && !text.includes('_')) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Single non-backtracking global regex:
  // group 1: bold **text**
  // group 2: bold __text__
  // group 3: inline code `code`
  // group 4 & 5: link [label](url)
  // group 6: italic *text*
  // group 7: italic _text_
  const inlineRegex = /\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|`([^`\n]+?)`|\[([^\]\n]+?)\]\(([^)\s]+)\)|\*([^*\n]+?)\*|_([^_\n]+?)_/g;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1] !== undefined || match[2] !== undefined) {
      // Bold: **text** or __text__
      const boldText = match[1] ?? match[2];
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold text-[#111111] dark:text-white">
          {boldText}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // Inline Code: `code`
      parts.push(
        <code
          key={`c-${key++}`}
          className="px-1.5 py-0.5 rounded-[4px] bg-[#F0F0EE] dark:bg-[#2A2A28] font-mono text-[13px] text-[#1E3E62] dark:text-blue-400"
        >
          {match[3]}
        </code>
      );
    } else if (match[4] !== undefined && match[5] !== undefined) {
      // Link: [text](url)
      parts.push(
        <a
          key={`l-${key++}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1E3E62] dark:text-blue-400 hover:underline"
        >
          {match[4]}
        </a>
      );
    } else if (match[6] !== undefined || match[7] !== undefined) {
      // Italic: *text* or _text_
      const italicText = match[6] ?? match[7];
      parts.push(
        <em key={`i-${key++}`} className="italic">
          {italicText}
        </em>
      );
    }

    lastIndex = inlineRegex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}
