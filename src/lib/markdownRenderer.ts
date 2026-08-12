import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeReact from 'rehype-react';
import { Copy, Check } from 'lucide-react';

/**
 * Markdown Renderer - Converts Markdown to React components
 * Supports GitHub Flavored Markdown (tables, task lists, strikethrough)
 * Includes syntax highlighting for code blocks
 * Generates heading IDs for table of contents
 */

// State to track copied code blocks
let copiedCodeId: string | null = null;
const setCopiedCodeId = (id: string | null) => {
  copiedCodeId = id;
};

/**
 * Custom component for code blocks with copy button
 */
const CodeBlockComponent = ({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}) => {
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : 'text';
  const codeText =
    typeof children === 'string'
      ? children
      : React.Children.toArray(children)
          .map((child) => (typeof child === 'string' ? child : ''))
          .join('');

  const blockId = `code-${Math.random().toString(36).substring(7)}`;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      setCopiedCodeId(blockId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  return React.createElement(
    'div',
    {
      className:
        'my-6 rounded-[10px] overflow-hidden border border-[#E8E8E8] dark:border-[#2A2A28] bg-[#1A1A18] text-[#ECECEC] text-[14px] font-mono',
    },
    React.createElement(
      'div',
      {
        className:
          'flex items-center justify-between px-4 py-2 bg-[#242422] border-b border-[#333330] text-[12px] text-[#A0A09C]',
      },
      React.createElement('span', {}, language.toUpperCase()),
      React.createElement(
        'button',
        {
          onClick: handleCopyCode,
          className: 'flex items-center gap-1.5 hover:text-white transition-colors',
          type: 'button',
          title: 'Copy code',
        },
        copiedCodeId === blockId
          ? [
              React.createElement(Check, { key: 'icon', className: 'w-3.5 h-3.5 text-emerald-400' }),
              React.createElement('span', { key: 'text', className: 'text-emerald-400' }, 'Copied'),
            ]
          : [
              React.createElement(Copy, { key: 'icon', className: 'w-3.5 h-3.5' }),
              React.createElement('span', { key: 'text' }, 'Copy'),
            ]
      )
    ),
    React.createElement(
      'pre',
      {
        className: 'p-4 overflow-x-auto leading-relaxed font-mono',
      },
      React.createElement('code', { className }, children)
    )
  );
};

/**
 * Custom heading component with auto-generated ID for TOC
 */
const HeadingComponent = (level: number) => {
  return (props: { children?: React.ReactNode; [key: string]: any }) => {
    const text =
      typeof props.children === 'string'
        ? props.children
        : React.Children.toArray(props.children)
            .map((child) => (typeof child === 'string' ? child : ''))
            .join('');

    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const className =
      level === 2
        ? 'font-serif text-[28px] md:text-[32px] font-semibold text-[#111111] dark:text-[#ECECEC] mt-10 mb-4 scroll-mt-24'
        : level === 3
          ? 'font-serif text-[22px] md:text-[24px] font-semibold text-[#111111] dark:text-[#ECECEC] mt-8 mb-3 scroll-mt-24'
          : 'font-serif text-[18px] font-semibold text-[#111111] dark:text-[#ECECEC] mt-6 mb-2 scroll-mt-24';

    return React.createElement(
      `h${level}`,
      { id, className },
      props.children
    );
  };
};

/**
 * Custom blockquote component
 */
const BlockquoteComponent = (props: { children?: React.ReactNode; [key: string]: any }) => {
  return React.createElement(
    'blockquote',
    {
      className:
        'my-6 pl-5 border-l-2 border-[#1E3E62] dark:border-blue-500 font-serif-reading text-[20px] italic text-[#444444] dark:text-[#BBBBBB]',
    },
    props.children
  );
};

/**
 * Custom link component with external link handling
 */
const LinkComponent = (props: { href?: string; children?: React.ReactNode; [key: string]: any }) => {
  const isExternal = props.href && (props.href.startsWith('http') || props.href.startsWith('//'));

  return React.createElement(
    'a',
    {
      href: props.href,
      className:
        'text-[#1E3E62] dark:text-blue-400 hover:underline transition-colors',
      target: isExternal ? '_blank' : undefined,
      rel: isExternal ? 'noopener noreferrer' : undefined,
    },
    props.children
  );
};

/**
 * Custom image component with responsive styling
 */
const ImageComponent = (props: { src?: string; alt?: string; [key: string]: any }) => {
  return React.createElement('img', {
    src: props.src,
    alt: props.alt || 'Article image',
    className:
      'w-full h-auto rounded-[10px] border border-[#E8E8E8] dark:border-[#2A2A28] object-cover max-h-[480px]',
    referrerPolicy: 'no-referrer',
  });
};

/**
 * Custom table component with responsive wrapper
 */
const TableComponent = (props: { children?: React.ReactNode; [key: string]: any }) => {
  return React.createElement(
    'div',
    {
      className: 'my-6 overflow-x-auto border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[10px]',
    },
    React.createElement(
      'table',
      {
        className:
          'w-full border-collapse text-[14px] font-serif-reading text-[#111111] dark:text-[#ECECEC]',
      },
      props.children
    )
  );
};

/**
 * Custom table cell component
 */
const TableCellComponent = (props: { children?: React.ReactNode; isHeader?: boolean; [key: string]: any }) => {
  const TagName = props.isHeader ? 'th' : 'td';
  return React.createElement(
    TagName,
    {
      className: `px-4 py-2 border border-[#E8E8E8] dark:border-[#2A2A28] ${
        props.isHeader
          ? 'bg-[#F4F4F2] dark:bg-[#262624] font-semibold'
          : 'bg-white dark:bg-[#1A1A18]'
      }`,
    },
    props.children
  );
};

/**
 * Custom task list item for checkboxes
 */
const TaskListItemComponent = (props: { children?: React.ReactNode; checked?: boolean; [key: string]: any }) => {
  return React.createElement(
    'li',
    {
      className: 'flex items-start gap-3 my-2 text-[18px] leading-[1.8] text-[#111111] dark:text-[#ECECEC]',
    },
    React.createElement('input', {
      type: 'checkbox',
      checked: props.checked,
      disabled: true,
      className: 'mt-1 w-4 h-4 rounded accent-[#1E3E62] dark:accent-blue-400',
    }),
    React.createElement('span', {}, props.children)
  );
};

/**
 * Custom paragraph component with proper spacing
 */
const ParagraphComponent = (props: { children?: React.ReactNode; [key: string]: any }) => {
  return React.createElement(
    'p',
    {
      className: 'font-serif-reading text-[18px] md:text-[19px] leading-[1.8] text-[#111111] dark:text-[#ECECEC] mb-6',
    },
    props.children
  );
};

/**
 * Custom list component
 */
const ListComponent = (props: { children?: React.ReactNode; ordered?: boolean; [key: string]: any }) => {
  const TagName = props.ordered ? 'ol' : 'ul';
  return React.createElement(
    TagName,
    {
      className: `ml-6 my-4 ${props.ordered ? 'list-decimal' : 'list-disc'} text-[18px] leading-[1.8] text-[#111111] dark:text-[#ECECEC] space-y-2`,
    },
    props.children
  );
};

/**
 * Custom list item component
 */
const ListItemComponent = (props: { children?: React.ReactNode; [key: string]: any }) => {
  return React.createElement('li', { className: 'font-serif-reading' }, props.children);
};

/**
 * Main processor configuration
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeHighlight, {
    detect: true,
    ignoreMissing: true,
  })
  .use(rehypeReact, {
    components: {
      h1: HeadingComponent(1),
      h2: HeadingComponent(2),
      h3: HeadingComponent(3),
      h4: HeadingComponent(4),
      h5: HeadingComponent(5),
      h6: HeadingComponent(6),
      code: CodeBlockComponent,
      pre: (props: any) => props.children, // Let code handle styling
      blockquote: BlockquoteComponent,
      a: LinkComponent,
      img: ImageComponent,
      table: TableComponent,
      th: (props: any) => TableCellComponent({ ...props, isHeader: true }),
      td: (props: any) => TableCellComponent({ ...props, isHeader: false }),
      p: ParagraphComponent,
      ul: (props: any) => ListComponent({ ...props, ordered: false }),
      ol: (props: any) => ListComponent({ ...props, ordered: true }),
      li: ListItemComponent,
      hr: () => React.createElement('hr', { className: 'my-8 border-[#E8E8E8] dark:border-[#2A2A28]' }),
    },
    passNode: true,
    transformTagName: (tagName: string) => {
      // Handle task list items
      if (tagName === 'input' && (tagName as any).type === 'checkbox') {
        return 'input';
      }
      return tagName;
    },
  } as any);

/**
 * Main render function - converts markdown string to React components
 * @param markdown - Raw markdown content
 * @returns React component tree
 */
export const renderMarkdownToReact = (markdown: string): React.ReactNode => {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return null;
    }

    const result = processor.processSync(markdown);
    return result.result;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return React.createElement(
      'p',
      { className: 'text-red-500' },
      'Error rendering content. Please check the markdown syntax.'
    );
  }
};

/**
 * Extract headings from markdown for table of contents
 * @param markdown - Raw markdown content
 * @returns Array of {id, text, level} for TOC
 */
export interface TOCItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export const extractTableOfContents = (markdown: string): TOCItem[] => {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return [];
    }

    const ast = processor.parse(markdown);
    const headings: TOCItem[] = [];

    const visit = (node: any) => {
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const text = node.children
          ?.map((child: any) => {
            if (child.type === 'text') return child.value;
            if (child.children) return visit(child);
            return '';
          })
          .join('')
          .trim();

        if (text) {
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          headings.push({ id, text, level: node.depth as 1 | 2 | 3 });
        }
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    };

    visit(ast);
    return headings;
  } catch (error) {
    console.error('Error extracting TOC:', error);
    return [];
  }
};
