import React, { useState, useEffect } from 'react';
import { Post } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Search } from 'lucide-react';
import { uzbekTranslations, formatUzbekReadingTime } from '../../lib/i18n';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  onSelectPost: (post: Post) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  posts,
  onSelectPost,
}) => {
  const [query, setQuery] = useState('');
  const t = uzbekTranslations.searchModal;

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const publishedPosts = posts.filter((p) => p.status === 'published');

  const searchResults = query.trim()
    ? publishedPosts.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.excerpt.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : publishedPosts.slice(0, 4);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999]" />
          <input
            type="text"
            autoFocus
            placeholder={t.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[10px] text-[16px] text-[#111111] dark:text-[#ECECEC] focus:outline-none focus:border-[#1E3E62] dark:focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between text-[12px] text-[#666666] dark:text-[#999999] px-1">
          <span>{query ? `${searchResults.length} ${t.foundArticles}` : t.recentEssays}</span>
          <span>{t.pressEscToClose}</span>
        </div>

        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
          {searchResults.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#666666] dark:text-[#999999]">
              "{query}" {t.noMatching}
            </p>
          ) : (
            searchResults.map((post) => (
              <div
                key={post.id}
                onClick={() => {
                  onSelectPost(post);
                  onClose();
                }}
                className="p-3.5 rounded-[10px] border border-transparent hover:border-[#E8E8E8] dark:hover:border-[#2A2A28] hover:bg-[#FAFAF8] dark:hover:bg-[#222220] cursor-pointer flex flex-col gap-1.5 transition-colors group"
              >
                <div className="flex items-center gap-2 text-[12px] text-[#666666] dark:text-[#999999]">
                  <Badge variant="neutral">{post.category}</Badge>
                  <span>•</span>
                  <span>{formatUzbekReadingTime(post.readingTimeMinutes)}</span>
                </div>
                <h4 className="font-serif font-semibold text-[16px] text-[#111111] dark:text-[#ECECEC] group-hover:text-[#1E3E62] dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h4>
                <p className="text-[13px] text-[#666666] dark:text-[#999999] line-clamp-1 font-serif-reading">
                  {post.excerpt}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

