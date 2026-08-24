import React from 'react';
import { uzbekTranslations } from '../lib/i18n';

interface FooterProps {
  siteTitle: string;
  authorName: string;
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ siteTitle, authorName, setActiveTab }) => {
  const t = uzbekTranslations.footer;

  return (
    <footer className="mt-20 border-t border-[#E8E8E8] dark:border-[#2A2A28] py-12 bg-[#FAFAF8] dark:bg-[#121211] transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-[14px] text-[#666666] dark:text-[#999999]">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <span className="font-serif font-medium text-[#111111] dark:text-[#ECECEC]">
            {siteTitle || 'Jurabek'}
          </span>
          <span className="hidden sm:inline text-[#E8E8E8] dark:text-[#2A2A28]">•</span>
          <span>{t.craftedBy} {authorName}</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('writing')}
            className="hover:text-[#111111] dark:hover:text-[#ECECEC] transition-colors cursor-pointer"
          >
            {t.archive}
          </button>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#111111] dark:hover:text-[#ECECEC] transition-colors"
          >
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
};

