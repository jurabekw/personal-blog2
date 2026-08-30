import React from 'react';
import { Post, SiteSettings } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { ArrowRight, Clock, Calendar, Sparkles, BookOpen } from 'lucide-react';
import { uzbekTranslations, formatUzbekDate, formatUzbekReadingTime } from '../../lib/i18n';

interface HomeViewProps {
  posts: Post[];
  settings: SiteSettings;
  onSelectPost: (post: Post) => void;
  onSelectCategory: (category: string) => void;
  onViewAllPosts: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  posts,
  settings,
  onSelectPost,
  onSelectCategory,
  onViewAllPosts,
}) => {
  const publishedPosts = posts.filter((p) => p.status === 'published');
  const featuredPost = publishedPosts.find((p) => p.isFeatured) || publishedPosts[0];
  const recentPosts = publishedPosts.filter((p) => p.id !== featuredPost?.id).slice(0, 5);
  const t = uzbekTranslations.home;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-8 py-10 flex flex-col gap-16">
      {/* Quiet Author Intro Header */}
      <section className="max-w-[72ch] flex flex-col gap-5 pt-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={settings.authorAvatar || undefined}
            name={settings.authorName || 'Jurabek'}
            size="lg"
            className="w-14 h-14"
          />
          <div>
            <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-[#111111] dark:text-[#ECECEC]">
              {settings.authorName}
            </h1>
            <p className="text-[15px] text-[#666666] dark:text-[#999999]">
              {settings.authorSubtitle || t.authorSubtitle}
            </p>
          </div>
        </div>

        <p className="font-serif-reading text-[20px] md:text-[22px] leading-relaxed text-[#111111] dark:text-[#ECECEC]">
          {settings.authorBio || t.authorBioDefault}
        </p>

        <div className="flex items-center gap-3 pt-2 text-[14px]">
          <span className="text-[#666666] dark:text-[#999999]">{t.exploreByTopic}</span>
          {['Dizayn', 'Texnologiya', 'Insholar'].map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className="px-2.5 py-1 rounded-[6px] bg-[#F4F4F2] dark:bg-[#262624] text-[#111111] dark:text-[#ECECEC] hover:bg-[#E8E8E4] dark:hover:bg-[#333330] font-medium transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Article Section */}
      {featuredPost && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wider text-[#666666] dark:text-[#999999] uppercase">
            <Sparkles className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
            <span>{t.featuredBadge}</span>
          </div>

          <Card
            elevation="sm"
            onClick={() => onSelectPost(featuredPost)}
            className="cursor-pointer group hover:border-[#1E3E62]/40 dark:hover:border-blue-500/40 transition-all duration-200 p-8 flex flex-col md:flex-row gap-8 items-start"
          >
            {featuredPost.coverImage && (
              <div className="w-full md:w-1/3 aspect-[4/3] rounded-[10px] overflow-hidden bg-[#F4F4F2] dark:bg-[#262624] shrink-0">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.coverImageAlt || featuredPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
            )}
            <div className="flex-1 flex flex-col justify-between gap-4 h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-[13px] text-[#666666] dark:text-[#999999]">
                  <Badge variant="accent">{featuredPost.category}</Badge>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatUzbekDate(featuredPost.publishedAt)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatUzbekReadingTime(featuredPost.readingTimeMinutes)}
                  </span>
                </div>

                <h2 className="font-serif text-[28px] md:text-[32px] font-semibold leading-tight text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors">
                  {featuredPost.title}
                </h2>

                <p className="font-serif-reading text-[17px] text-[#666666] dark:text-[#999999] line-clamp-3 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[14px] font-medium text-[#1E3E62] dark:text-blue-400 pt-2 group-hover:translate-x-1 transition-transform">
                <span>{t.readEssay}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Recent Writing List */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-[#111111] dark:text-[#ECECEC]">
            <BookOpen className="w-5 h-5 text-[#1E3E62] dark:text-blue-400" />
            <h2>{t.recentWritings}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAllPosts} className="gap-1.5 text-[14px]">
            <span>{t.viewAllArchive} ({publishedPosts.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col divide-y divide-[#E8E8E8] dark:divide-[#2A2A28]">
          {recentPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-baseline justify-between gap-4 cursor-pointer group"
            >
              <div className="max-w-[72ch] flex flex-col gap-2">
                <div className="flex items-center gap-3 text-[13px] text-[#666666] dark:text-[#999999]">
                  <span className="font-medium text-[#111111] dark:text-[#ECECEC]">{post.category}</span>
                  <span>•</span>
                  <span>{formatUzbekDate(post.publishedAt)}</span>
                  <span>•</span>
                  <span>{formatUzbekReadingTime(post.readingTimeMinutes)}</span>
                </div>

                <h3 className="font-serif text-[22px] font-semibold text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {post.title}
                </h3>

                <p className="font-serif-reading text-[16px] text-[#666666] dark:text-[#999999] line-clamp-2">
                  {post.excerpt}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1 text-[13px] font-medium text-[#666666] dark:text-[#999999] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors">
                <span>{t.readShort}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

