import React from 'react';
import { TableColumn, renderInlineMarkdown } from './MarkdownTable';

interface FormattedTableProps {
  headers: TableColumn[];
  rows: string[][];
}

export const FormattedTable: React.FC<FormattedTableProps> = ({ headers, rows }) => {
  const getAlignClass = (align: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className="my-8 w-full overflow-hidden rounded-[12px] border border-[#E8E8E8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[15px] md:text-[16px]">
          <thead>
            <tr className="border-b border-[#E8E8E8] dark:border-[#2A2A28] bg-[#FAF9F6] dark:bg-[#20201E]">
              {headers.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-5 font-bold text-[#111111] dark:text-[#ECECEC] ${getAlignClass(
                    col.align
                  )}`}
                >
                  {renderInlineMarkdown(col.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0EE] dark:divide-[#262624]">
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-[#FBFBFA] dark:hover:bg-[#222220] transition-colors"
              >
                {row.map((cell, cellIdx) => {
                  const align = headers[cellIdx]?.align || 'left';
                  return (
                    <td
                      key={cellIdx}
                      className={`py-3.5 px-5 text-[#333333] dark:text-[#CCCCCC] leading-relaxed ${getAlignClass(
                        align
                      )}`}
                    >
                      {renderInlineMarkdown(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
