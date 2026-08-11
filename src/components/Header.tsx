import React from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { uzbekTranslations } from '../lib/i18n';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  siteTitle: string;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  siteTitle,
  onOpenSearch,
}) => {
  const t = uzbekTranslations.nav;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAFAF8]/90 dark:bg-[#121211]/90 backdrop-blur-md border-b border-[#E8E8E8] dark:border-[#2A2A28] transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Site Title / Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <span className="font-serif text-[20px] font-semibold tracking-tight text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors">
              {siteTitle || 'Jurabek'}
            </span>
          </button>

          {/* Navigation Links in Uzbek */}
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 text-[14px] font-medium rounded-[8px] transition-colors ${
                activeTab === 'home'
                  ? 'text-[#111111] dark:text-[#ECECEC] bg-black/5 dark:bg-white/5'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC]'
              }`}
            >
              {t.home}
            </button>
            <button
              onClick={() => setActiveTab('writing')}
              className={`px-3 py-1.5 text-[14px] font-medium rounded-[8px] transition-colors ${
                activeTab === 'writing' || activeTab === 'article'
                  ? 'text-[#111111] dark:text-[#ECECEC] bg-black/5 dark:bg-white/5'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC]'
              }`}
            >
              {t.writing}
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-3 py-1.5 text-[14px] font-medium rounded-[8px] transition-colors ${
                activeTab === 'contact'
                  ? 'text-[#111111] dark:text-[#ECECEC] bg-black/5 dark:bg-white/5'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC]'
              }`}
            >
              {t.contact}
            </button>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSearch}
            className="text-[#666666] hover:text-[#111111] dark:text-[#999999] dark:hover:text-[#ECECEC] gap-2 px-3"
            aria-label={t.search}
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline text-[13px] text-[#666666] dark:text-[#999999]">{t.search}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className="text-[#666666] hover:text-[#111111] dark:text-[#999999] dark:hover:text-[#ECECEC] px-2.5"
            aria-label="Rejimni o'zgartirish"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

