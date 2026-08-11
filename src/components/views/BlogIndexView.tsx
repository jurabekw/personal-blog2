import React, { useState, useMemo } from 'react';
import { Post, Category } from '../../types';
import { Badge } from '../ui/Badge';
import {
  Search,
  Calendar,
  Clock,
  ArrowUpRight,
  Eye,
  LayoutGrid,
  List,
  Sparkles,
  Tag as TagIcon,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { uzbekTranslations, formatUzbekDate, formatUzbekReadingTime } from '../../lib/i18n';

interface BlogIndexViewProps {
  posts: Post[];
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onSelectPost: (post: Post) => void;
}

export const BlogIndexView: React.FC<BlogIndexViewProps> = ({
  posts,
  categories,
  selectedCategory,
  onSelectCategory,
  onSelectPost,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'readingTime' | 'popular'>('newest');

  const t = uzbekTranslations.blog;

  // Extract all unique tags from published posts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts
      .filter((p) => p.status === 'published')
      .forEach((p) => {
        p.tags?.forEach((tag) => tagSet.add(tag));
      });
    return Array.from(tagSet);
  }, [posts]);

  // Filter published posts
  const publishedPosts = useMemo(() => {
    let list = posts.filter((p) => p.status === 'published');

    if (selectedCategory) {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedTag) {
      list = list.filter((p) => p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.publishedAt || a.createdAt).getTime() - new Date(b.publishedAt || b.createdAt).getTime();
      }
      if (sortBy === 'readingTime') {
        return b.readingTimeMinutes - a.readingTimeMinutes;
      }
      if (sortBy === 'popular') {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      }
      // newest default
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });
  }, [posts, selectedCategory, selectedTag, searchQuery, sortBy]);

  // Featured post selection (if no strict search/filter or if featured post is inside filtered list)
  const featuredPost = useMemo(() => {
    // Only show dedicated hero featured card when not searching heavily
    if (searchQuery.trim() || selectedTag) return null;
    return publishedPosts.find((p) => p.isFeatured) || null;
  }, [publishedPosts, searchQuery, selectedTag]);

  // Non-featured posts list
  const regularPosts = useMemo(() => {
    if (!featuredPost) return publishedPosts;
    return publishedPosts.filter((p) => p.id !== featuredPost.id);
  }, [publishedPosts, featuredPost]);

  const clearAllFilters = () => {
    onSelectCategory(null);
    setSelectedTag(null);
    setSearchQuery('');
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-8 py-10 flex flex-col gap-10">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-8">
        <h1 className="font-serif text-[38px] md:text-[44px] font-semibold text-[#111111] dark:text-[#ECECEC] tracking-tight">
          {t.title}
        </h1>
        <p className="font-serif-reading text-[18px] text-[#666666] dark:text-[#999999] max-w-[72ch]">
          {t.subtitle}
        </p>
      </div>

      {/* Featured Hero Post Section */}
      {featuredPost && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t.featuredArticle}</span>
          </div>

          <article
            onClick={() => onSelectPost(featuredPost)}
            className="group relative cursor-pointer rounded-[16px] bg-[#FAF9F5] dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] overflow-hidden hover:border-[#1E3E62] dark:hover:border-blue-500/50 transition-all duration-300 shadow-xs hover:shadow-md grid grid-cols-1 lg:grid-cols-12"
          >
            {/* Image Column */}
            {featuredPost.coverImage && (
              <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-[#ECECE9] dark:bg-[#242422]">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.coverImageAlt || featuredPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                />
                <div className="absolute top-4 left-4">
                  <Badge variant="primary">{featuredPost.category}</Badge>
                </div>
              </div>
            )}

            {/* Content Column */}
            <div
              className={`${
                featuredPost.coverImage ? 'lg:col-span-5' : 'lg:col-span-12'
              } p-6 md:p-8 flex flex-col justify-between gap-6`}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-[13px] text-[#666666] dark:text-[#999999]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatUzbekDate(featuredPost.publishedAt)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatUzbekReadingTime(featuredPost.readingTimeMinutes)}
                  </span>
                  {featuredPost.viewsCount !== undefined && featuredPost.viewsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {featuredPost.viewsCount} {t.viewsCount}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="font-serif text-[26px] md:text-[32px] font-semibold text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors leading-tight">
                  {featuredPost.title}
                </h2>

                <p className="font-serif-reading text-[16px] text-[#666666] dark:text-[#999999] line-clamp-4 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8] dark:border-[#2A2A28] mt-auto">
                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap max-w-[70%]">
                  {featuredPost.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EAEAE8] dark:bg-[#2A2A28] text-[#555555] dark:text-[#AAAAAA]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[14px] font-medium text-[#1E3E62] dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                  <span>{t.readArticle}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Filter, Search & Layout Control Bar */}
      <div className="flex flex-col gap-4 bg-[#FAF9F5] dark:bg-[#1A1A18] p-5 rounded-[14px] border border-[#E8E8E8] dark:border-[#2A2A28]">
        {/* Top Row: Category Tabs & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => onSelectCategory(null)}
              className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] transition-all whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-[#1E3E62] text-white dark:bg-blue-600 shadow-xs'
                  : 'bg-white dark:bg-[#242422] text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC] border border-[#E8E8E8] dark:border-[#2A2A28]'
              }`}
            >
              {t.allArticles} ({posts.filter((p) => p.status === 'published').length})
            </button>

            {categories.map((cat) => {
              const catPostCount = posts.filter(
                (p) => p.status === 'published' && p.category.toLowerCase() === cat.name.toLowerCase()
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.name)}
                  className={`px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] transition-all whitespace-nowrap ${
                    selectedCategory?.toLowerCase() === cat.name.toLowerCase()
                      ? 'bg-[#1E3E62] text-white dark:bg-blue-600 shadow-xs'
                      : 'bg-white dark:bg-[#242422] text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC] border border-[#E8E8E8] dark:border-[#2A2A28]'
                  }`}
                >
                  {cat.name} ({catPostCount})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-full lg:max-w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
            <input
              type="text"
              placeholder={t.filterPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-[14px] bg-white dark:bg-[#242422] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[10px] focus:outline-none focus:border-[#1E3E62] dark:focus:border-blue-500 text-[#111111] dark:text-[#ECECEC] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Popular Tag Pills, View Mode & Sorting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-[#E8E8E8]/70 dark:border-[#2A2A28]/70">
          {/* Tag Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap text-[13px]">
            <span className="text-[#666666] dark:text-[#999999] flex items-center gap-1 font-medium text-[12px]">
              <TagIcon className="w-3.5 h-3.5" />
              {t.popularTags}
            </span>

            {allTags.map((tag) => {
              const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-2.5 py-0.5 text-[12px] font-medium rounded-full transition-colors ${
                    isSelected
                      ? 'bg-[#1E3E62] text-white dark:bg-blue-600'
                      : 'bg-white dark:bg-[#242422] text-[#666666] dark:text-[#999999] hover:bg-[#EAEAE8] dark:hover:bg-[#2A2A28] border border-[#E8E8E8] dark:border-[#2A2A28]'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}

            {(selectedCategory || selectedTag || searchQuery) && (
              <button
                onClick={clearAllFilters}
                className="text-[12px] font-medium text-[#1E3E62] dark:text-blue-400 hover:underline flex items-center gap-1 ml-1"
              >
                <X className="w-3 h-3" />
                {t.clearFilters}
              </button>
            )}
          </div>

          {/* Controls: View Mode & Sort */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-[13px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#666666] dark:text-[#999999]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white dark:bg-[#242422] border border-[#E8E8E8] dark:border-[#2A2A28] text-[#111111] dark:text-[#ECECEC] text-[13px] rounded-[8px] px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="newest">{t.newest}</option>
                <option value="oldest">{t.oldest}</option>
                <option value="readingTime">{t.readingTime}</option>
                <option value="popular">Eng ko'p o'qilgan</option>
              </select>
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-white dark:bg-[#242422] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title={t.viewGrid}
                className={`p-1.5 rounded-[6px] transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#1E3E62] text-white dark:bg-blue-600'
                    : 'text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title={t.viewList}
                className={`p-1.5 rounded-[6px] transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#1E3E62] text-white dark:bg-blue-600'
                    : 'text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#ECECEC]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {regularPosts.length === 0 && !featuredPost ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#FAF9F5] dark:bg-[#1A1A18] rounded-[16px] border border-[#E8E8E8] dark:border-[#2A2A28]">
          <p className="text-[18px] font-serif font-medium text-[#111111] dark:text-[#ECECEC]">
            {t.noArticlesFound}
          </p>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Boshqa kalit so'zlar yoki filtrlarni sinab ko'ring.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-2 px-4 py-2 text-[14px] font-medium bg-[#1E3E62] dark:bg-blue-600 text-white rounded-[8px] hover:opacity-90 transition-opacity"
          >
            {t.clearFilters}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {featuredPost && (
            <h3 className="font-serif text-[22px] font-semibold text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
              Barcha maqolalar
            </h3>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {regularPosts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="group cursor-pointer flex flex-col rounded-[14px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] overflow-hidden hover:border-[#1E3E62] dark:hover:border-blue-500/50 transition-all duration-300 shadow-xs hover:shadow-md"
                >
                  {/* Card Image */}
                  {post.coverImage ? (
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#ECECE9] dark:bg-[#242422]">
                      <img
                        src={post.coverImage}
                        alt={post.coverImageAlt || post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="primary">{post.category}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pt-5 pb-0">
                      <Badge variant="neutral">{post.category}</Badge>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-[12px] text-[#666666] dark:text-[#999999]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatUzbekDate(post.publishedAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatUzbekReadingTime(post.readingTimeMinutes)}
                        </span>
                      </div>

                      <h2 className="font-serif text-[20px] font-semibold text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                        {post.title}
                      </h2>

                      <p className="font-serif-reading text-[15px] text-[#666666] dark:text-[#999999] line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    {/* Footer / Tags */}
                    <div className="pt-3 border-t border-[#E8E8E8] dark:border-[#2A2A28] flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-1 flex-wrap max-w-[80%]">
                        {post.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F4F4F2] dark:bg-[#262624] text-[#666666] dark:text-[#999999]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <ArrowUpRight className="w-4 h-4 text-[#1E3E62] dark:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="flex flex-col divide-y divide-[#E8E8E8] dark:divide-[#2A2A28]">
              {regularPosts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 cursor-pointer group"
                >
                  <div className="flex-1 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 text-[12px] text-[#666666] dark:text-[#999999]">
                      <Badge variant="neutral">{post.category}</Badge>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatUzbekDate(post.publishedAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatUzbekReadingTime(post.readingTimeMinutes)}
                      </span>
                    </div>

                    <h2 className="font-serif text-[22px] md:text-[24px] font-semibold text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {post.title}
                    </h2>

                    <p className="font-serif-reading text-[15px] text-[#666666] dark:text-[#999999] line-clamp-2 max-w-[72ch]">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      {post.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F4F4F2] dark:bg-[#262624] text-[#666666] dark:text-[#999999]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {post.coverImage && (
                    <div className="w-full sm:w-[160px] h-[100px] shrink-0 rounded-[10px] overflow-hidden bg-[#ECECE9] dark:bg-[#242422]">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
