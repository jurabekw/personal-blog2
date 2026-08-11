import React from 'react';
import { SiteSettings } from '../../types';
import { Mail } from 'lucide-react';
import { uzbekTranslations } from '../../lib/i18n';

interface ContactViewProps {
  settings: SiteSettings;
}

export const ContactView: React.FC<ContactViewProps> = ({ settings }) => {
  const t = uzbekTranslations.contact;
  const contactEmail = settings.email || 'shokirovj35@gmail.com';

  return (
    <div className="w-full max-w-[72ch] mx-auto px-6 md:px-8 py-12 flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-8">
        <h1 className="font-serif text-[40px] font-semibold text-[#111111] dark:text-[#ECECEC] tracking-tight">
          {t.title}
        </h1>
        <p className="font-serif-reading text-[18px] text-[#666666] dark:text-[#999999] leading-relaxed">
          {t.subtitle}
        </p>
      </header>

      {/* Direct Email Block */}
      <div className="p-8 rounded-[16px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-[#111111] dark:text-[#ECECEC] font-semibold text-[18px]">
          <Mail className="w-5 h-5 text-[#1E3E62] dark:text-blue-400" />
          <span>{t.emailTitle}</span>
        </div>
        <p className="text-[15px] text-[#666666] dark:text-[#999999]">
          {t.emailDesc}
        </p>
        <a
          href={`mailto:${contactEmail}`}
          className="text-[17px] font-semibold text-[#1E3E62] dark:text-blue-400 hover:underline pt-1 w-fit"
        >
          {contactEmail}
        </a>
      </div>
    </div>
  );
};


