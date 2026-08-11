import React, { useState, useMemo } from 'react';
import { Post, Category } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';

interface AdminPostsListViewProps {
  posts: Post[];
  categories: Category[];
  initialStatusFilter?: string;
  onNewPost: () => void;
  onEditPost: (post: Post) => void;
  onDeletePost: (postId: string) => Promise<void>;
  onPreviewPost: (post: Post) => void;
}

export const AdminPostsListView: React.FC<AdminPostsListViewProps> = ({
  posts,
  categories,
  initialStatusFilter = 'all',
  onNewPost,
  onEditPost,
  onDeletePost,
  onPreviewPost,
}) => {
  const { toast } = useToast();
  const [statusTab, setStatusTab] = useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredPosts = useMemo(() => {
    let list = [...posts];

    if (statusTab !== 'all') {
      list = list.filter((p) => p.status === statusTab);
    }

    if (categoryFilter) {
      list = list.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [posts, statusTab, categoryFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPosts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPosts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} post(s)?`)) {
      try {
        for (const id of selectedIds) {
          await onDeletePost(id);
        }
        toast('Posts deleted', `Successfully deleted ${selectedIds.length} post(s)`, 'success');
        setSelectedIds([]);
      } catch (err: any) {
        toast('Deletion error', err.message, 'error');
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">Posts Library</h1>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Organize, edit, publish, or schedule your writing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleBatchDelete} className="gap-1.5">
              <Trash2 className="w-4 h-4" />
              <span>Delete ({selectedIds.length})</span>
            </Button>
          )}
          <Button variant="primary" onClick={onNewPost} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </Button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {['all', 'published', 'draft', 'scheduled', 'archived'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusTab(status)}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-[8px] capitalize transition-colors ${
                statusTab === status
                  ? 'bg-[#1E3E62] text-white dark:bg-blue-600'
                  : 'text-[#666666] dark:text-[#999999] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {status} (
              {status === 'all' ? posts.length : posts.filter((p) => p.status === status).length})
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-[13px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[#111111] dark:text-[#ECECEC]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[#111111] dark:text-[#ECECEC]"
            />
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <Card elevation="sm" className="p-0 overflow-hidden">
        {filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-[#666666] dark:text-[#999999]">
            <p className="text-[15px]">No posts found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#F4F4F2] dark:bg-[#262624] text-[#666666] dark:text-[#999999] text-[12px] font-semibold border-b border-[#E8E8E8] dark:border-[#2A2A28]">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <button onClick={toggleSelectAll} className="focus:outline-none">
                      {selectedIds.length === filteredPosts.length ? (
                        <CheckSquare className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#999999]" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Title & Excerpt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Reading Time</th>
                  <th className="p-4">Updated / Published</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8] dark:divide-[#2A2A28]">
                {filteredPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-[#FAFAF8] dark:hover:bg-[#222220] transition-colors group"
                  >
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelectOne(post.id)} className="focus:outline-none">
                        {selectedIds.includes(post.id) ? (
                          <CheckSquare className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-[#999999]" />
                        )}
                      </button>
                    </td>

                    <td className="p-4 max-w-xs md:max-w-sm">
                      <button
                        onClick={() => onEditPost(post)}
                        className="font-medium text-[15px] text-[#111111] dark:text-[#ECECEC] hover:text-[#1E3E62] dark:hover:text-blue-400 transition-colors text-left line-clamp-1 block"
                      >
                        {post.title}
                      </button>
                      <p className="text-[12px] text-[#666666] dark:text-[#999999] line-clamp-1 font-serif-reading mt-0.5">
                        {post.excerpt}
                      </p>
                    </td>

                    <td className="p-4">
                      <Badge
                        variant={
                          post.status === 'published'
                            ? 'success'
                            : post.status === 'draft'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {post.status}
                      </Badge>
                    </td>

                    <td className="p-4 text-[13px] text-[#666666] dark:text-[#999999]">{post.category}</td>

                    <td className="p-4 text-[13px] text-[#666666] dark:text-[#999999]">
                      {post.readingTimeMinutes} min ({post.wordCount} w)
                    </td>

                    <td className="p-4 text-[13px] text-[#666666] dark:text-[#999999]">
                      {formatDate(post.publishedAt || post.updatedAt || post.createdAt)}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreviewPost(post)}
                          title="Preview public article"
                          className="p-1.5"
                        >
                          <Eye className="w-4 h-4 text-[#666666]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditPost(post)}
                          title="Edit post"
                          className="p-1.5"
                        >
                          <Edit className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete post "${post.title}"?`)) onDeletePost(post.id);
                          }}
                          title="Delete post"
                          className="p-1.5 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
