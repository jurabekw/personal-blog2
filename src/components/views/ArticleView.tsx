import React, { useState, useEffect, useMemo } from 'react';
import { Post, TOCItem, SiteSettings } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { MarkdownContent } from '../ui/MarkdownContent';
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  List,
  Mail,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { uzbekTranslations, formatUzbekDate, formatUzbekReadingTime } from '../../lib/i18n';

const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.4 1.4 0 1 0 1.4 1.4 1.4 1.4 0 0 0-1.4-1.4z" />
  </svg>
);

interface ArticleViewProps {
  post: Post;
  allPosts: Post[];
  settings?: SiteSettings;
  onSelectPost: (post: Post) => void;
  onBackToWriting: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  post,
  allPosts,
  settings,
  onSelectPost,
  onBackToWriting,
}) => {
  const { toast } = useToast();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showTopShareMenu, setShowTopShareMenu] = useState(false);
  const [openFaqIndexes, setOpenFaqIndexes] = useState<Record<number, boolean>>({ 0: true });
  const t = uzbekTranslations.article;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://jurabek.dev/blog/${post.slug}`;
  const shareTitle = `${post.title} — ${settings?.title || 'Jurabek'}`;

  const shareLinks = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareTitle)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareTitle + '\n\n' + currentUrl)}`
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      toast(t.linkCopied, t.linkCopiedDesc, 'success');
      setShowTopShareMenu(false);
    }
  };

  // Check bookmark state
  useEffect(() => {
    const saved = localStorage.getItem('jurabek_bookmarks');
    if (saved) {
      const list = JSON.parse(saved);
      setIsBookmarked(list.includes(post.id));
    }
  }, [post.id]);

  const toggleBookmark = () => {
    const saved = localStorage.getItem('jurabek_bookmarks');
    let list: string[] = saved ? JSON.parse(saved) : [];
    if (list.includes(post.id)) {
      list = list.filter((id) => id !== post.id);
      setIsBookmarked(false);
      toast(t.articleRemoved, t.articleRemovedDesc, 'info');
    } else {
      list.push(post.id);
      setIsBookmarked(true);
      toast(t.articleSaved, t.articleSavedDesc, 'success');
    }
    localStorage.setItem('jurabek_bookmarks', JSON.stringify(list));
  };

  // Scroll Progress calculation
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Generate Table of Contents from headings in markdown content
  const tocItems: TOCItem[] = useMemo(() => {
    const lines = post.content.split('\n');
    const items: TOCItem[] = [];
    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        items.push({ id, text, level: 2 });
      } else if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        items.push({ id, text, level: 3 });
      }
    });
    return items;
  }, [post.content]);

  // Find Prev / Next posts
  const publishedList = allPosts
    .filter((p) => p.status === 'published')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());

  const currentIndex = publishedList.findIndex((p) => p.id === post.id);
  const prevPost = currentIndex < publishedList.length - 1 ? publishedList[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? publishedList[currentIndex - 1] : null;

  // Related posts by category
  const relatedPosts = publishedList
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 2);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast(t.linkCopied, t.linkCopiedDesc, 'success');
    }
  };

  const handleCopyCode = (codeText: string, blockId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      setCopiedCodeId(blockId);
      toast(t.copied, t.linkCopiedDesc, 'success');
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  return (
    <div className="relative w-full">
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50">
        <div
          className="h-full bg-[#1E3E62] dark:bg-blue-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 flex flex-col gap-10">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBackToWriting} className="gap-2 text-[#666666] dark:text-[#999999]">
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToArchive}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleBookmark} className="gap-1.5">
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                  <span className="text-[#1E3E62] dark:text-blue-400 font-medium">{t.saved}</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-[#666666]" />
                  <span>{t.save}</span>
                </>
              )}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTopShareMenu(!showTopShareMenu)}
                className="gap-1.5 text-[#666666] dark:text-[#AAAAAA] hover:text-[#111111] dark:hover:text-white"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.share}</span>
              </Button>

              {showTopShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTopShareMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-[12px] bg-white dark:bg-[#1C1C1A] border border-[#E8E8E8] dark:border-[#2A2A28] shadow-lg z-20 py-2 flex flex-col gap-0.5 text-[13px]">
                    <a
                      href={shareLinks.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowTopShareMenu(false)}
                      className="px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262624] flex items-center gap-2.5 text-[#111111] dark:text-[#ECECEC] transition-colors"
                    >
                      <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
                      <span>Telegram-da ulashish</span>
                    </a>
                    <a
                      href={shareLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowTopShareMenu(false)}
                      className="px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262624] flex items-center gap-2.5 text-[#111111] dark:text-[#ECECEC] transition-colors"
                    >
                      <TwitterIcon className="w-4 h-4 text-[#1DA1F2] dark:text-sky-400" />
                      <span>X (Twitter)-da ulashish</span>
                    </a>
                    <a
                      href={shareLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowTopShareMenu(false)}
                      className="px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262624] flex items-center gap-2.5 text-[#111111] dark:text-[#ECECEC] transition-colors"
                    >
                      <LinkedInIcon className="w-4 h-4 text-[#0A66C2] dark:text-blue-400" />
                      <span>LinkedIn-da ulashish</span>
                    </a>
                    <a
                      href={shareLinks.email}
                      onClick={() => setShowTopShareMenu(false)}
                      className="px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262624] flex items-center gap-2.5 text-[#111111] dark:text-[#ECECEC] transition-colors"
                    >
                      <Mail className="w-4 h-4 text-[#EA4335] dark:text-red-400" />
                      <span>Email orqali yuborish</span>
                    </a>
                    <div className="my-1 border-t border-[#E8E8E8] dark:border-[#2A2A28]" />
                    <button
                      onClick={handleCopyLink}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262624] flex items-center gap-2.5 text-[#111111] dark:text-[#ECECEC] transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#666666]" />
                      <span>Havolani nusxalash</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Article Layout */}
        <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
          {/* Left Table of Contents Sidebar (Desktop) */}
          {tocItems.length > 0 && (
            <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
              <div className="p-4 rounded-[12px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-2">
                  <List className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                  <span>{t.tableOfContents}</span>
                </div>
                <nav className="flex flex-col gap-2 text-[13px]">
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`hover:text-[#1E3E62] dark:hover:text-blue-400 transition-colors line-clamp-1 ${
                        item.level === 3 ? 'pl-3 text-[#666666] dark:text-[#999999]' : 'font-medium text-[#444444] dark:text-[#CCCCCC]'
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Core Reading Column (72ch max) */}
          <main className="w-full max-w-[72ch] flex flex-col gap-8">
            {/* Header Metadata */}
            <header className="flex flex-col gap-4 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-8">
              <div className="flex items-center gap-3 text-[13px] text-[#666666] dark:text-[#999999]">
                <Badge variant="accent">{post.category}</Badge>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatUzbekDate(post.publishedAt || post.createdAt)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatUzbekReadingTime(post.readingTimeMinutes)} ({post.wordCount} {t.words})
                </span>
              </div>

              <h1 className="font-serif text-[36px] md:text-[44px] font-bold text-[#111111] dark:text-[#ECECEC] leading-[1.15] tracking-tight">
                {post.title}
              </h1>

              <p className="font-serif-reading text-[20px] text-[#555555] dark:text-[#AAAAAA] leading-relaxed italic">
                {post.excerpt}
              </p>
            </header>

            {/* Featured Cover Image */}
            {post.coverImage && (
              <figure className="my-2">
                <img
                  src={post.coverImage}
                  alt={post.coverImageAlt || post.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto rounded-[12px] border border-[#E8E8E8] dark:border-[#2A2A28] object-cover max-h-[480px]"
                />
                {post.coverImageAlt && (
                  <figcaption className="text-center text-[13px] text-[#666666] dark:text-[#999999] mt-2 font-serif italic">
                    {post.coverImageAlt}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Article Content Body */}
            <article className="prose dark:prose-invert max-w-none">
              <MarkdownContent
                content={post.content}
                onCopyCode={handleCopyCode}
                copiedCodeId={copiedCodeId}
                copiedLabel={t.copied}
                copyLabel={t.copy}
              />
            </article>

            {/* FAQ Accordion Section */}
            {post.faqs && post.faqs.filter((f) => f && f.question?.trim() && f.answer?.trim()).length > 0 && (
              <section className="mt-12 pt-8 border-t border-[#E8E8E8] dark:border-[#2A2A28] flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-[8px] bg-[#1E3E62]/10 dark:bg-blue-500/10 text-[#1E3E62] dark:text-blue-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[18px] md:text-[20px] font-bold text-[#111111] dark:text-[#ECECEC] font-serif">
                        {t.faqTitle}
                      </h3>
                      <p className="text-[12px] md:text-[13px] text-[#666666] dark:text-[#999999]">
                        {t.faqSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {post.faqs
                    .filter((f) => f && f.question?.trim() && f.answer?.trim())
                    .map((faq, idx) => {
                      const isOpen = !!openFaqIndexes[idx];
                      return (
                        <div
                          key={faq.id || `faq-${idx}`}
                          className="rounded-[12px] border border-[#E8E8E8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] overflow-hidden transition-all duration-200"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenFaqIndexes((prev) => ({
                                ...prev,
                                [idx]: !prev[idx],
                              }))
                            }
                            className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 hover:bg-[#F9F9F8] dark:hover:bg-[#222220] transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-[15px] md:text-[16px] text-[#111111] dark:text-[#ECECEC]">
                              {faq.question}
                            </span>
                            <div className="shrink-0 p-1 rounded-[6px] text-[#666666] dark:text-[#999999] bg-[#F0F0EE] dark:bg-[#2A2A28]">
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4 pt-1 text-[14px] md:text-[15px] leading-relaxed text-[#555555] dark:text-[#AAAAAA] border-t border-[#F0F0EE] dark:border-[#262624] font-serif-reading">
                              {faq.answer.split('\n\n').map((paragraph, pIdx) => (
                                <p key={pIdx} className="mb-2 last:mb-0">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* Footnotes Section */}
            {post.footnotes && post.footnotes.length > 0 && (
              <section className="mt-12 pt-8 border-t border-[#E8E8E8] dark:border-[#2A2A28] flex flex-col gap-3">
                <h4 className="text-[14px] font-semibold text-[#111111] dark:text-[#ECECEC] uppercase tracking-wider">
                  {t.footnotes}
                </h4>
                <ol className="flex flex-col gap-2 text-[14px] text-[#666666] dark:text-[#999999]">
                  {post.footnotes.map((fn) => (
                    <li key={fn.id} className="flex items-start gap-2">
                      <span className="font-mono text-[#1E3E62] dark:text-blue-400 font-bold">[{fn.number}]</span>
                      <span>{fn.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Social Share Bar Section */}
            <div className="mt-10 p-5 rounded-[12px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#111111] dark:text-[#ECECEC]">
                <Share2 className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                <span>Postni ulashish:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={shareLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-[13px] font-medium transition-colors border border-[#229ED9]/20"
                  title="Telegram-da ulashish"
                >
                  <TelegramIcon className="w-4 h-4" />
                  <span>Telegram</span>
                </a>
                <a
                  href={shareLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] dark:text-sky-400 text-[13px] font-medium transition-colors border border-[#1DA1F2]/20"
                  title="X (Twitter)-da ulashish"
                >
                  <TwitterIcon className="w-4 h-4" />
                  <span>X (Twitter)</span>
                </a>
                <a
                  href={shareLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] dark:text-blue-400 text-[13px] font-medium transition-colors border border-[#0A66C2]/20"
                  title="LinkedIn-da ulashish"
                >
                  <LinkedInIcon className="w-4 h-4" />
                  <span>LinkedIn</span>
                </a>
                <a
                  href={shareLinks.email}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#EA4335]/10 hover:bg-[#EA4335]/20 text-[#EA4335] dark:text-red-400 text-[13px] font-medium transition-colors border border-[#EA4335]/20"
                  title="Email orqali yuborish"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#F4F4F2] dark:bg-[#262624] hover:bg-[#E8E8E8] dark:hover:bg-[#333331] text-[#333333] dark:text-[#DDDDDD] text-[13px] font-medium transition-colors border border-[#E8E8E8] dark:border-[#333331]"
                  title="Havolani nusxalash"
                >
                  <Copy className="w-4 h-4 text-[#666666] dark:text-[#AAAAAA]" />
                  <span>Nusxalash</span>
                </button>
              </div>
            </div>

            {/* Author Bio Footer Box */}
            <div className="mt-10 p-6 rounded-[12px] bg-[#F4F4F2] dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] flex items-center gap-4">
              <Avatar
                src={settings?.authorAvatar || undefined}
                name={settings?.authorName || 'Jurabek'}
                size="md"
                className="w-12 h-12"
              />
              <div className="flex flex-col gap-0.5 text-[14px]">
                <h4 className="font-semibold text-[#111111] dark:text-[#ECECEC]">
                  {t.writtenBy} {settings?.authorName || 'Jurabek'}
                </h4>
                <p className="text-[#666666] dark:text-[#999999] text-[13px]">
                  {settings?.authorBio || "Dasturiy ta'minot arxitektori va insho muallifi. Sokin raqamli vositalar va tipografik vazminlik bo'yicha izlanishlar olib boradi."}
                </p>
              </div>
            </div>

            {/* Previous / Next Article Navigation */}
            <nav className="my-10 pt-8 border-t border-[#E8E8E8] dark:border-[#2A2A28] grid grid-cols-1 md:grid-cols-2 gap-4">
              {prevPost ? (
                <button
                  onClick={() => onSelectPost(prevPost)}
                  className="p-4 rounded-[10px] border border-[#E8E8E8] dark:border-[#2A2A28] hover:border-[#1E3E62]/40 text-left flex flex-col gap-1 transition-colors group"
                >
                  <span className="text-[12px] text-[#666666] dark:text-[#999999] flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    {t.previousEssay}
                  </span>
                  <span className="font-serif font-medium text-[16px] text-[#111111] dark:text-[#ECECEC] line-clamp-1 group-hover:text-[#1E3E62] dark:group-hover:text-blue-400">
                    {prevPost.title}
                  </span>
                </button>
              ) : <div />}

              {nextPost ? (
                <button
                  onClick={() => onSelectPost(nextPost)}
                  className="p-4 rounded-[10px] border border-[#E8E8E8] dark:border-[#2A2A28] hover:border-[#1E3E62]/40 text-right flex flex-col gap-1 items-end transition-colors group"
                >
                  <span className="text-[12px] text-[#666666] dark:text-[#999999] flex items-center gap-1">
                    {t.nextEssay}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="font-serif font-medium text-[16px] text-[#111111] dark:text-[#ECECEC] line-clamp-1 group-hover:text-[#1E3E62] dark:group-hover:text-blue-400">
                    {nextPost.title}
                  </span>
                </button>
              ) : <div />}
            </nav>

            {/* Related Posts Section */}
            {relatedPosts.length > 0 && (
              <section className="flex flex-col gap-4">
                <h3 className="font-serif text-[20px] font-semibold text-[#111111] dark:text-[#ECECEC]">
                  "{post.category}" {t.moreInCategory}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedPosts.map((rel) => (
                    <Card
                      key={rel.id}
                      onClick={() => onSelectPost(rel)}
                      className="cursor-pointer group hover:border-[#1E3E62]/40 p-5 flex flex-col justify-between gap-3"
                    >
                      <h4 className="font-serif font-semibold text-[17px] text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {rel.title}
                      </h4>
                      <p className="text-[13px] text-[#666666] dark:text-[#999999] line-clamp-2 font-serif-reading">
                        {rel.excerpt}
                      </p>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

