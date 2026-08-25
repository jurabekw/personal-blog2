import React, { useMemo } from 'react';
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
  type:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'quote'
    | 'code'
    | 'divider'
    | 'table'
    | 'bullet-list'
    | 'ordered-list'
    | 'image'
    | 'paragraph';
  content?: string;
  items?: string[];
  lang?: string;
  imageUrl?: string;
  imageAlt?: string;
  tableData?: ReturnType<typeof parseMarkdownTable>;
}

const BULLET_PREFIX_REGEX = /^[\*\-\+•]\s+(.*)$/;
const ORDERED_PREFIX_REGEX = /^(\d+[\.\)])\s+(.*)$/;
const DIVIDER_REGEX = /^(\-{3,}|\*{3,}|_{3,})$/;
const IMAGE_REGEX = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

export function parseMarkdownBlocks(rawContent: string): ParsedBlock[] {
  if (!rawContent || !rawContent.trim()) return [];

  const lines = rawContent.replace(/\r\n/g, '\n').split('\n');
  const blocks: ParsedBlock[] = [];
  const numLines = lines.length;

  let i = 0;
  while (i < numLines) {
    const startI = i;
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines
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
      while (i < numLines && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < numLines && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
        lang,
      });
      continue;
    }

    // 2. Headings (#, ##, ###, ####)
    if (trimmed.startsWith('#')) {
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        if (level === 1) blocks.push({ type: 'h1', content: text });
        else if (level === 2) blocks.push({ type: 'h2', content: text });
        else if (level === 3) blocks.push({ type: 'h3', content: text });
        else blocks.push({ type: 'h4', content: text });
        i++;
        continue;
      }
    }

    // 3. Standalone Image (![alt](url))
    const imageMatch = trimmed.match(IMAGE_REGEX);
    if (imageMatch) {
      blocks.push({
        type: 'image',
        imageAlt: imageMatch[1] || '',
        imageUrl: imageMatch[2],
      });
      i++;
      continue;
    }

    // 4. Horizontal Divider (---, ***, ___)
    if (DIVIDER_REGEX.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // 5. Blockquote (> )
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < numLines && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        content: quoteLines.join(' '),
      });
      continue;
    }

    // 6. Markdown Table (| header | header |)
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      const tableLines: string[] = [];
      while (i < numLines && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const tableRaw = tableLines.join('\n');
      const parsedTable = parseMarkdownTable(tableRaw);
      if (parsedTable && parsedTable.headers.length > 0) {
        blocks.push({
          type: 'table',
          tableData: parsedTable,
        });
        continue;
      } else {
        blocks.push({
          type: 'paragraph',
          content: tableRaw,
        });
        continue;
      }
    }

    // 7. Bullet List (- , * , + , • )
    if (BULLET_PREFIX_REGEX.test(trimmed)) {
      const items: string[] = [];
      while (i < numLines) {
        const currTrimmed = lines[i].trim();
        if (!currTrimmed) break;

        const match = currTrimmed.match(BULLET_PREFIX_REGEX);
        if (match) {
          items.push(match[1].trim());
          i++;
        } else if (
          items.length > 0 &&
          !currTrimmed.startsWith('#') &&
          !currTrimmed.startsWith('>') &&
          !currTrimmed.startsWith('|') &&
          !currTrimmed.startsWith('```') &&
          !ORDERED_PREFIX_REGEX.test(currTrimmed)
        ) {
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
    if (ORDERED_PREFIX_REGEX.test(trimmed)) {
      const items: string[] = [];
      while (i < numLines) {
        const currTrimmed = lines[i].trim();
        if (!currTrimmed) break;

        const match = currTrimmed.match(ORDERED_PREFIX_REGEX);
        if (match) {
          items.push(match[2].trim());
          i++;
        } else if (
          items.length > 0 &&
          !currTrimmed.startsWith('#') &&
          !currTrimmed.startsWith('>') &&
          !currTrimmed.startsWith('|') &&
          !currTrimmed.startsWith('```') &&
          !BULLET_PREFIX_REGEX.test(currTrimmed)
        ) {
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

    // 9. Standard Paragraph (collect consecutive text lines)
    const pLines: string[] = [];
    while (i < numLines) {
      const curr = lines[i];
      const currTrimmed = curr.trim();

      if (!currTrimmed) break;

      // Check if current line begins a distinct block element
      if (
        currTrimmed.startsWith('#') ||
        currTrimmed.startsWith('```') ||
        currTrimmed.startsWith('>') ||
        (currTrimmed.startsWith('|') && currTrimmed.includes('|', 1)) ||
        DIVIDER_REGEX.test(currTrimmed) ||
        BULLET_PREFIX_REGEX.test(currTrimmed) ||
        ORDERED_PREFIX_REGEX.test(currTrimmed) ||
        IMAGE_REGEX.test(currTrimmed)
      ) {
        break;
      }

      pLines.push(currTrimmed);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: pLines.join(' '),
      });
    }

    // Strict safety invariant: guarantee that `i` always moves forward!
    if (i === startI) {
      // If for any unforeseen reason no branch consumed the current line,
      // consume it as a fallback paragraph and advance.
      blocks.push({
        type: 'paragraph',
        content: lines[i].trim(),
      });
      i++;
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
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  if (!content || !content.trim()) {
    return isEditorPreview ? (
      <p className="font-serif-reading text-[18px] text-[#888888] dark:text-[#777777] italic">
        Start typing in the write panel to see live preview.
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-col">
      {blocks.map((block, idx) => {
        // Heading 1
        if (block.type === 'h1') {
          const text = block.content || '';
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h1
              key={idx}
              id={id}
              className={`font-serif ${
                isEditorPreview ? 'text-[28px] mt-6 mb-3' : 'text-[32px] md:text-[36px] mt-10 mb-4'
              } font-bold text-[#111111] dark:text-[#ECECEC] scroll-mt-24`}
            >
              {text}
            </h1>
          );
        }

        // Heading 2
        if (block.type === 'h2') {
          const text = block.content || '';
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h2
              key={idx}
              id={id}
              className={`font-serif ${
                isEditorPreview ? 'text-[24px] mt-6 mb-3' : 'text-[26px] md:text-[30px] mt-10 mb-4'
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

        // Heading 4
        if (block.type === 'h4') {
          const text = block.content || '';
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h4
              key={idx}
              id={id}
              className={`font-serif ${
                isEditorPreview ? 'text-[17px] mt-4 mb-2' : 'text-[18px] md:text-[20px] mt-6 mb-2.5'
              } font-semibold text-[#111111] dark:text-[#ECECEC] scroll-mt-24`}
            >
              {text}
            </h4>
          );
        }

        // Standalone Image
        if (block.type === 'image' && block.imageUrl) {
          return (
            <figure key={idx} className="my-6">
              <img
                src={block.imageUrl}
                alt={block.imageAlt || ''}
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-[10px] border border-[#E8E8E8] dark:border-[#2A2A28] object-cover max-h-[440px]"
              />
              {block.imageAlt && (
                <figcaption className="text-center text-[13px] text-[#666666] dark:text-[#999999] mt-2 font-serif italic">
                  {block.imageAlt}
                </figcaption>
              )}
            </figure>
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
