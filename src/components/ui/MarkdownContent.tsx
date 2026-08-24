import React from 'react';
import { parseMarkdownTable } from './MarkdownTable';
import { FormattedTable } from './FormattedTable';
import { renderInlineMarkdown } from './MarkdownTable';
import { Check, Copy } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  onCopyCode?: (code: string, id: string) => void;
  copiedCodeId?: string | null;
  copiedLabel?: string;
  copyLabel?: string;
  isEditorPreview?: boolean;
}

interface ParsedBlock {
  type: 'h2' | 'h3' | 'quote' | 'code' | 'divider' | 'table' | 'bullet-list' | 'ordered-list' | 'paragraph';
  content?: string;
  items?: string[];
  lang?: string;
  tableData?: ReturnType<typeof parseMarkdownTable>;
}

// Regex to detect if a line starts a list item (e.g. "* ", "- ", "+ ", "• ", "1. ", "1) ")
const BULLET_REGEX = /^[\*\-\+•]\s+(.*)$/;
const ORDERED_REGEX = /^(\d+[\.\)])\s+(.*)$/;

export function parseMarkdownBlocks(rawContent: string): ParsedBlock[] {
  if (!rawContent || !rawContent.trim()) return [];

  const lines = rawContent.replace(/\r\n/g, '\n').split('\n');
  const blocks: ParsedBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Code Block (```)
    if (trimmed.startsWith('```')) {
      const langMatch = trimmed.match(/^```(\w+)?/);
      const lang = langMatch ? langMatch[1] || 'text' : 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
        lang,
      });
      continue;
    }

    // 2. Heading 2 (## )
    if (trimmed.startsWith('## ')) {
      blocks.push({
        type: 'h2',
        content: trimmed.replace(/^##\s+/, '').trim(),
      });
      i++;
      continue;
    }

    // 3. Heading 3 (### )
    if (trimmed.startsWith('### ')) {
      blocks.push({
        type: 'h3',
        content: trimmed.replace(/^###\s+/, '').trim(),
      });
      i++;
      continue;
    }

    // 4. Horizontal Divider (--- or *** or ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // 5. Blockquote (> )
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        content: quoteLines.join(' '),
      });
      continue;
    }

    // 6. Markdown Table (starts with | and has separator on line 2)
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const tableRaw = tableLines.join('\n');
      const parsedTable = parseMarkdownTable(tableRaw);
      if (parsedTable) {
        blocks.push({
          type: 'table',
          tableData: parsedTable,
        });
        continue;
      } else {
        // Fallback to paragraph if table format is invalid
        blocks.push({
          type: 'paragraph',
          content: tableRaw,
        });
        continue;
      }
    }

    // 7. Bullet List (- , * , + , • )
    if (BULLET_REGEX.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const currTrimmed = lines[i].trim();
        if (!currTrimmed) break; // empty line terminates list

        const match = currTrimmed.match(BULLET_REGEX);
        if (match) {
          items.push(match[1].trim());
          i++;
        } else if (items.length > 0 && !currTrimmed.startsWith('#') && !currTrimmed.startsWith('>') && !currTrimmed.startsWith('|') && !ORDERED_REGEX.test(currTrimmed)) {
          // Continued multiline list item
          items[items.length - 1] += ' ' + currTrimmed;
          i++;
        } else {
          break;
        }
      }
      blocks.push({
        type: 'bullet-list',
        items,
      });
      continue;
    }

    // 8. Numbered List (1. , 1) )
    if (ORDERED_REGEX.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const currTrimmed = lines[i].trim();
        if (!currTrimmed) break; // empty line terminates list

        const match = currTrimmed.match(ORDERED_REGEX);
        if (match) {
          items.push(match[2].trim());
          i++;
        } else if (items.length > 0 && !currTrimmed.startsWith('#') && !currTrimmed.startsWith('>') && !currTrimmed.startsWith('|') && !BULLET_REGEX.test(currTrimmed)) {
          // Continued multiline list item
          items[items.length - 1] += ' ' + currTrimmed;
          i++;
        } else {
          break;
        }
      }
      blocks.push({
        type: 'ordered-list',
        items,
      });
      continue;
    }

    // 9. Standard Paragraph (consume consecutive text lines until empty line or next block element)
    const pLines: string[] = [];
    while (i < lines.length) {
      const curr = lines[i];
      const currTrimmed = curr.trim();

      if (!currTrimmed) break; // paragraph separator

      // Check if next line is a special block element
      if (
        currTrimmed.startsWith('#') ||
        currTrimmed.startsWith('```') ||
        currTrimmed.startsWith('>') ||
        currTrimmed.startsWith('|') ||
        /^(\-{3,}|\*{3,}|_{3,})$/.test(currTrimmed) ||
        BULLET_REGEX.test(currTrimmed) ||
        ORDERED_REGEX.test(currTrimmed)
      ) {
        break;
      }

      pLines.push(currTrimmed);
      i++;
    }

    if (pLines.length > 0) {
      const paragraphText = pLines.join(' ');
      // Secondary check: inline bullet points separated by * inside a single paragraph line
      // e.g. "* muammolari; * ehtiyojlari; * xarid qilish motivlari"
      if (paragraphText.startsWith('* ') || paragraphText.startsWith('- ') || paragraphText.startsWith('• ')) {
        const inlineSplits = paragraphText.split(/(?=(?:^|\s)(?:[\*\-•]\s|\d+[\.\)]\s))/g).map(s => s.trim()).filter(Boolean);
        if (inlineSplits.length > 1 && inlineSplits.every(s => /^[\*\-•]\s+/.test(s))) {
          blocks.push({
            type: 'bullet-list',
            items: inlineSplits.map(s => s.replace(/^[\*\-•]\s+/, '').trim()),
          });
          continue;
        }
      }

      blocks.push({
        type: 'paragraph',
        content: paragraphText,
      });
    }
  }

  return blocks;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  onCopyCode,
  copiedCodeId,
  copiedLabel = 'Nusxalandi',
  copyLabel = 'Nusxalash',
  isEditorPreview = false,
}) => {
  if (!content || !content.trim()) {
    return isEditorPreview ? (
      <p className="font-serif-reading text-[18px] text-[#888888] dark:text-[#777777] italic">
        Start typing in the write panel to see live preview.
      </p>
    ) : null;
  }

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="flex flex-col">
      {blocks.map((block, idx) => {
        // Heading 2
        if (block.type === 'h2') {
          const text = block.content || '';
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h2
              key={idx}
              id={id}
              className={`font-serif ${
                isEditorPreview ? 'text-[26px] mt-6 mb-3' : 'text-[28px] md:text-[32px] mt-10 mb-4'
              } font-semibold text-[#111111] dark:text-[#ECECEC] scroll-mt-24`}
            >
              {text}
            </h2>
          );
        }

        // Heading 3
        if (block.type === 'h3') {
          const text = block.content || '';
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h3
              key={idx}
              id={id}
              className={`font-serif ${
                isEditorPreview ? 'text-[20px] mt-5 mb-2' : 'text-[22px] md:text-[24px] mt-8 mb-3'
              } font-semibold text-[#111111] dark:text-[#ECECEC] scroll-mt-24`}
            >
              {text}
            </h3>
          );
        }

        // Blockquote
        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className={`my-5 pl-5 border-l-2 border-[#1E3E62] dark:border-blue-500 font-serif-reading ${
                isEditorPreview ? 'text-[18px]' : 'text-[20px]'
              } italic text-[#444444] dark:text-[#BBBBBB]`}
            >
              {renderInlineMarkdown(block.content || '')}
            </blockquote>
          );
        }

        // Code Block
        if (block.type === 'code') {
          const codeText = block.content || '';
          const lang = block.lang || 'text';
          const blockId = `code-${idx}`;

          return (
            <div
              key={idx}
              className="my-6 rounded-[10px] overflow-hidden border border-[#E8E8E8] dark:border-[#2A2A28] bg-[#1A1A18] text-[#ECECEC] text-[14px] font-mono"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-[#242422] border-b border-[#333330] text-[12px] text-[#A0A09C]">
                <span>{lang.toUpperCase()}</span>
                {onCopyCode && (
                  <button
                    type="button"
                    onClick={() => onCopyCode(codeText, blockId)}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCodeId === blockId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{copiedLabel}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copyLabel}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <pre className="p-4 overflow-x-auto leading-relaxed font-mono">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        // Divider
        if (block.type === 'divider') {
          return <hr key={idx} className="my-8 border-[#E8E8E8] dark:border-[#2A2A28]" />;
        }

        // Table
        if (block.type === 'table' && block.tableData) {
          return (
            <FormattedTable
              key={idx}
              headers={block.tableData.headers}
              rows={block.tableData.rows}
            />
          );
        }

        // Bullet List
        if (block.type === 'bullet-list' && block.items) {
          return (
            <ul
              key={idx}
              className="my-5 pl-6 list-disc space-y-2.5 font-serif-reading text-[18px] md:text-[19px] leading-[1.8] text-[#111111] dark:text-[#ECECEC] marker:text-[#1E3E62] dark:marker:text-blue-400"
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        // Ordered List
        if (block.type === 'ordered-list' && block.items) {
          return (
            <ol
              key={idx}
              className="my-5 pl-6 list-decimal space-y-2.5 font-serif-reading text-[18px] md:text-[19px] leading-[1.8] text-[#111111] dark:text-[#ECECEC] marker:font-semibold marker:text-[#1E3E62] dark:marker:text-blue-400"
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        // Standard Paragraph
        return (
          <p
            key={idx}
            className={`font-serif-reading ${
              isEditorPreview ? 'text-[18px] mb-5' : 'text-[18px] md:text-[19px] mb-6'
            } leading-[1.8] text-[#111111] dark:text-[#ECECEC]`}
          >
            {renderInlineMarkdown(block.content || '')}
          </p>
        );
      })}
    </div>
  );
};
