import React, { useState } from 'react';
import { Post, ActivityLog, MediaItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';
import {
  FileText,
  FileEdit,
  Clock,
  Eye,
  Plus,
  ArrowRight,
  Activity,
  Image as ImageIcon,
  Sparkles,
  Zap
} from 'lucide-react';

interface AdminDashboardViewProps {
  posts: Post[];
  activityLogs: ActivityLog[];
  mediaItems: MediaItem[];
  onNewPost: () => void;
  onEditPost: (post: Post) => void;
  onViewPosts: (statusFilter?: string) => void;
  onViewMedia: () => void;
  onCreateQuickDraft: (title: string, content: string) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  posts,
  activityLogs,
  mediaItems,
  onNewPost,
  onEditPost,
  onViewPosts,
  onViewMedia,
  onCreateQuickDraft,
}) => {
  const { toast } = useToast();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const totalWords = posts.reduce((acc, p) => acc + (p.wordCount || 0), 0);
  const totalViews = posts.reduce((acc, p) => acc + (p.viewsCount || 0), 0);

  const recentPosts = posts.slice(0, 5);

  const handleQuickDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) {
      toast('Title required', 'Please enter a title for your quick draft', 'error');
      return;
    }

    setIsCreatingDraft(true);
    try {
      await onCreateQuickDraft(draftTitle, draftContent);
      toast('Draft saved', 'Quick draft added to your drafts folder', 'success');
      setDraftTitle('');
      setDraftContent('');
    } catch (err: any) {
      toast('Failed to save draft', err.message, 'error');
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">Publishing Overview</h1>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Welcome back, Julian. Here is your writing activity and site status.
          </p>
        </div>

        <Button variant="primary" onClick={onNewPost} className="gap-2 self-start md:self-auto">
          <Plus className="w-4 h-4" />
          <span>Write New Essay</span>
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card elevation="sm" className="p-4 flex flex-col gap-1 cursor-pointer hover:border-[#1E3E62]/40" onClick={() => onViewPosts('published')}>
          <div className="flex items-center justify-between text-[#666666] dark:text-[#999999] text-[13px]">
            <span>Published</span>
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">{publishedCount}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#999999]">Live essays</span>
        </Card>

        <Card elevation="sm" className="p-4 flex flex-col gap-1 cursor-pointer hover:border-[#1E3E62]/40" onClick={() => onViewPosts('draft')}>
          <div className="flex items-center justify-between text-[#666666] dark:text-[#999999] text-[13px]">
            <span>Drafts</span>
            <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">{draftCount}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#999999]">In progress</span>
        </Card>

        <Card elevation="sm" className="p-4 flex flex-col gap-1 cursor-pointer hover:border-[#1E3E62]/40" onClick={() => onViewPosts('scheduled')}>
          <div className="flex items-center justify-between text-[#666666] dark:text-[#999999] text-[13px]">
            <span>Scheduled</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">{scheduledCount}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#999999]">Upcoming</span>
        </Card>

        <Card elevation="sm" className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[#666666] dark:text-[#999999] text-[13px]">
            <span>Total Words</span>
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">{totalWords.toLocaleString()}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#999999]">Written content</span>
        </Card>

        <Card elevation="sm" className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[#666666] dark:text-[#999999] text-[13px]">
            <span>Article Views</span>
            <Eye className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
          </div>
          <span className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">{totalViews.toLocaleString()}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#999999]">Total readers</span>
        </Card>
      </div>

      {/* Main Grid: Quick Draft + Recent Posts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Recent Posts & Quick Draft */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Quick Draft Creator Box */}
          <Card elevation="sm" className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[16px] font-semibold text-[#111111] dark:text-[#ECECEC]">
              <Zap className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
              <h3>Quick Memo / Draft</h3>
            </div>

            <form onSubmit={handleQuickDraftSubmit} className="flex flex-col gap-3">
              <Input
                placeholder="Title of new thought..."
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              <Textarea
                rows={3}
                placeholder="Capture initial outline, notes, or ideas..."
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm" disabled={isCreatingDraft} className="self-end gap-1.5">
                <span>Save Draft</span>
              </Button>
            </form>
          </Card>

          {/* Recent Posts Table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111111] dark:text-[#ECECEC]">Recent Posts</h3>
              <Button variant="ghost" size="sm" onClick={() => onViewPosts('all')} className="gap-1 text-[13px]">
                <span>Manage all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Card elevation="sm" className="p-0 overflow-hidden">
              <div className="divide-y divide-[#E8E8E8] dark:divide-[#2A2A28]">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onEditPost(post)}
                    className="p-4 hover:bg-[#FAFAF8] dark:hover:bg-[#222220] cursor-pointer flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                        <span className="text-[12px] text-[#666666] dark:text-[#999999]">{post.category}</span>
                      </div>
                      <h4 className="font-medium text-[15px] text-[#111111] dark:text-[#ECECEC] truncate">
                        {post.title}
                      </h4>
                    </div>

                    <div className="text-right shrink-0 text-[13px] text-[#666666] dark:text-[#999999]">
                      <span>{formatDate(post.updatedAt || post.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column (1 col): Recent Activity Stream */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-[#111111] dark:text-[#ECECEC]">
            <Activity className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
            <h3>Activity Log</h3>
          </div>

          <Card elevation="sm" className="p-4 flex flex-col gap-3">
            {activityLogs.length === 0 ? (
              <p className="text-[13px] text-[#666666] dark:text-[#999999]">No recent activity logged.</p>
            ) : (
              <div className="flex flex-col divide-y divide-[#E8E8E8] dark:divide-[#2A2A28]">
                {activityLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-[#111111] dark:text-[#ECECEC]">{log.action}</span>
                      <span className="text-[#999999]">{formatDate(log.timestamp)}</span>
                    </div>
                    <p className="text-[13px] text-[#666666] dark:text-[#999999] line-clamp-2">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
