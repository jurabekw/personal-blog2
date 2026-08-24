import React from 'react';

export interface TableColumn {
  header: string;
  align: 'left' | 'center' | 'right';
}

export function parseMarkdownTable(block: string): { headers: TableColumn[]; rows: string[][] } | null {
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
    // Pad or trim cells to match header count
    const normalizedCells: string[] = headers.map((_, colIdx) => cells[colIdx] || '');
    rows.push(normalizedCells);
  }

  return { headers, rows };
}

export function renderInlineMarkdown(text: string): React.ReactNode {
  // Replace bold **text** or inline code `code` or links [title](url)
  // Split on bold, code, and links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Check for code
    const codeMatch = remaining.match(/`(.+?)`/);
    // Check for link
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);

    // Find first occurrence
    type MatchInfo = { type: 'bold' | 'code' | 'link'; index: number; length: number; match: RegExpMatchArray };
    const matches: MatchInfo[] = [];

    if (boldMatch && boldMatch.index !== undefined) {
      matches.push({ type: 'bold', index: boldMatch.index, length: boldMatch[0].length, match: boldMatch });
    }
    if (codeMatch && codeMatch.index !== undefined) {
      matches.push({ type: 'code', index: codeMatch.index, length: codeMatch[0].length, match: codeMatch });
    }
    if (linkMatch && linkMatch.index !== undefined) {
      matches.push({ type: 'link', index: linkMatch.index, length: linkMatch[0].length, match: linkMatch });
    }

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    matches.sort((a, b) => a.index - b.index);
    const earliest = matches[0];

    // Push preceding plain text
    if (earliest.index > 0) {
      parts.push(remaining.substring(0, earliest.index));
    }

    if (earliest.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold text-[#111111] dark:text-white">
          {earliest.match[1]}
        </strong>
      );
    } else if (earliest.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded-[4px] bg-[#F0F0EE] dark:bg-[#2A2A28] font-mono text-[13px] text-[#1E3E62] dark:text-blue-400"
        >
          {earliest.match[1]}
        </code>
      );
    } else if (earliest.type === 'link') {
      parts.push(
        <a
          key={key++}
          href={earliest.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1E3E62] dark:text-blue-400 hover:underline"
        >
          {earliest.match[1]}
        </a>
      );
    }

    remaining = remaining.substring(earliest.index + earliest.length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
