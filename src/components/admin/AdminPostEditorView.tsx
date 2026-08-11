import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Post, Category, Tag, MediaItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';
import {
  ArrowLeft,
  Save,
  Eye,
  Edit3,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  Code,
  List,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  Clock,
  Sparkles,
  Settings,
  Plus,
  X,
  Search,
  Globe,
  FileText
} from 'lucide-react';

interface AdminPostEditorViewProps {
  post: Post | null;
  categories: Category[];
  tagsList: Tag[];
  mediaItems: MediaItem[];
  onSave: (postData: Partial<Post>) => Promise<Post>;
  onCancel: () => void;
  onOpenMediaLibrary: () => void;
}

export const AdminPostEditorView: React.FC<AdminPostEditorViewProps> = ({
  post,
  categories,
  tagsList,
  mediaItems,
  onSave,
  onCancel,
  onOpenMediaLibrary,
}) => {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [content, setContent] = useState(post?.content || '');
  const [category, setCategory] = useState(post?.category || 'Essays');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled' | 'archived'>(post?.status || 'draft');
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured || false);
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [coverImageAlt, setCoverImageAlt] = useState(post?.coverImageAlt || '');
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt || '');

  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(post ? 'Loaded' : null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);

  // Auto slug generation if empty
  useEffect(() => {
    if (!post && title && !slug) {
      const generated = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  }, [title, post, slug]);

  // Autosave status tracking
  useEffect(() => {
    setIsDirty(true);
  }, [title, slug, excerpt, content, category, tags, status, isFeatured, coverImage, seoTitle, seoDescription]);

  // Real-time word count & reading time
  const { wordCount, readingTimeMinutes } = useMemo(() => {
    const words = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
    const time = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingTimeMinutes: time };
  }, [content]);

  // Formatting helpers for Markdown toolbar
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 50);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSaveSubmit = async (overrideStatus?: 'draft' | 'published') => {
    if (!title.trim()) {
      toast('Title required', 'Please enter a title before saving', 'error');
      return;
    }
    if (!content.trim()) {
      toast('Content required', 'Please add essay content', 'error');
      return;
    }

    const targetStatus = overrideStatus || status;

    setIsSaving(true);
    try {
      const saved = await onSave({
        id: post?.id,
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        excerpt: excerpt || content.slice(0, 160) + '...',
        content,
        category,
        tags,
        status: targetStatus,
        isFeatured,
        coverImage,
        coverImageAlt,
        seoTitle,
        seoDescription,
        scheduledAt,
      });

      setStatus(targetStatus);
      setIsDirty(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast('Saved successfully', `Post ${targetStatus === 'published' ? 'published' : 'saved'}`, 'success');
    } catch (err: any) {
      toast('Save failed', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 text-[#666666]">
            <ArrowLeft className="w-4 h-4" />
            <span>All Posts</span>
          </Button>

          <div className="flex items-center gap-2 text-[13px] text-[#666666] dark:text-[#999999]">
            <span>{isDirty ? 'Unsaved changes' : `Saved ${lastSavedTime || ''}`}</span>
            <span>•</span>
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{readingTimeMinutes} min read</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#F4F4F2] dark:bg-[#262624] p-1 rounded-[8px] text-[13px]">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 rounded-[6px] font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] shadow-xs'
                  : 'text-[#666666] dark:text-[#999999]'
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden md:block px-3 py-1 rounded-[6px] font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] shadow-xs'
                  : 'text-[#666666] dark:text-[#999999]'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-[6px] font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] shadow-xs'
                  : 'text-[#666666] dark:text-[#999999]'
              }`}
            >
              Preview
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="p-2"
            title="Toggle post settings drawer"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSaveSubmit('draft')}
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSaveSubmit('published')}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Publish Now</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace (Editor + Settings Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Main Canvas */}
        <div className={`flex flex-col gap-4 ${showSettingsDrawer ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* Title Input */}
          <input
            type="text"
            placeholder="Title of your essay..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full font-serif text-[32px] md:text-[40px] font-bold bg-transparent text-[#111111] dark:text-[#ECECEC] placeholder:text-[#999999] focus:outline-none border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3"
          />

          {/* Markdown Formatting Toolbar */}
          {viewMode !== 'preview' && (
            <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[13px] text-[#666666] dark:text-[#999999]">
              <button
                type="button"
                onClick={() => insertFormatting('## ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```typescript\n', '\n```')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](https://example.com)')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Hyperlink"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />
              <button
                type="button"
                onClick={onOpenMediaLibrary}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5 flex items-center gap-1 text-[12px] font-medium"
                title="Insert Media"
              >
                <ImageIcon className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                <span>Media</span>
              </button>
            </div>
          )}

          {/* Editor Body or Split View */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
            {/* Write Textarea */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className={viewMode === 'split' ? 'md:col-span-6' : 'md:col-span-12'}>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your article in Markdown..."
                  className="w-full h-[600px] p-4 bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[10px] text-[16px] font-mono leading-relaxed text-[#111111] dark:text-[#ECECEC] focus:outline-none focus:border-[#1E3E62] dark:focus:border-blue-500 resize-y"
                />
              </div>
            )}

            {/* Preview Box */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`p-6 rounded-[10px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] h-[600px] overflow-y-auto ${
                  viewMode === 'split' ? 'md:col-span-6' : 'md:col-span-12'
                }`}
              >
                <div className="max-w-[72ch] mx-auto flex flex-col gap-6">
                  <div className="border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
                    <Badge variant="accent">{category}</Badge>
                    <h1 className="font-serif text-[32px] font-bold text-[#111111] dark:text-[#ECECEC] mt-2">
                      {title || 'Untitled Post'}
                    </h1>
                    {excerpt && (
                      <p className="font-serif-reading text-[18px] text-[#666666] dark:text-[#999999] mt-2 italic">
                        {excerpt}
                      </p>
                    )}
                  </div>

                  {coverImage && (
                    <img
                      src={coverImage}
                      alt={coverImageAlt || title}
                      referrerPolicy="no-referrer"
                      className="w-full rounded-[10px] max-h-[300px] object-cover"
                    />
                  )}

                  <div className="font-serif-reading text-[18px] leading-[1.8] text-[#111111] dark:text-[#ECECEC] whitespace-pre-wrap">
                    {content || 'Start typing in the write panel to see live preview.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings Drawer Sidebar */}
        {showSettingsDrawer && (
          <aside className="lg:col-span-4 flex flex-col gap-6 p-5 rounded-[12px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28]">
            <h3 className="font-semibold text-[16px] text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
              Post Settings & Metadata
            </h3>

            {/* Status Dropdown */}
            <Select
              label="Publish Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'archived', label: 'Archived' },
              ]}
            />

            {/* Scheduled Date picker if scheduled */}
            {status === 'scheduled' && (
              <Input
                label="Scheduled Release Date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            )}

            {/* Category */}
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
            />

            {/* Tags Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-1.5 text-[14px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[#111111] dark:text-[#ECECEC]"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#F4F4F2] dark:bg-[#262624] text-[12px] font-medium text-[#111111] dark:text-[#ECECEC]"
                  >
                    <span>{t}</span>
                    <button onClick={() => handleRemoveTag(t)} className="text-[#999999] hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* URL Slug */}
            <Input
              label="URL Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              helperText={`URL path: /blog/${slug || 'your-slug'}`}
            />

            {/* Excerpt */}
            <Textarea
              label="Article Summary / Excerpt"
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              helperText="Summary shown in index listings and social previews."
            />

            {/* Featured Cover Image */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">Cover Image URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={onOpenMediaLibrary} className="shrink-0">
                  Select
                </Button>
              </div>
              {coverImage && (
                <div className="flex flex-col gap-2 mt-1">
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-24 rounded-[8px] object-cover"
                  />
                  <Input
                    label="Image Alt Text (for Screen Readers & SEO)"
                    placeholder="Describe image for search engines..."
                    value={coverImageAlt}
                    onChange={(e) => setCoverImageAlt(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* SEO Optimization & Meta Tags Section */}
            <div className="border-t border-[#E8E8E8] dark:border-[#2A2A28] pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[14px] text-[#111111] dark:text-[#ECECEC]">
                  <Search className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                  <span>SEO & Meta Tags</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!seoTitle && title) setSeoTitle(title.slice(0, 60));
                    if (!seoDescription && excerpt) setSeoDescription(excerpt.slice(0, 160));
                  }}
                  className="text-[11px] text-[#1E3E62] dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-fill from Post</span>
                </button>
              </div>

              {/* SEO Meta Title */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="font-medium text-[#111111] dark:text-[#ECECEC]">SEO Meta Title</label>
                  <span className={`text-[11px] ${seoTitle.length > 60 ? 'text-amber-500 font-medium' : 'text-[#888888]'}`}>
                    {seoTitle.length}/60 chars
                  </span>
                </div>
                <Input
                  placeholder={title || 'Custom title for Google search results...'}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
                <p className="text-[11px] text-[#888888] dark:text-[#777777]">
                  If left empty, post title will be used automatically.
                </p>
              </div>

              {/* SEO Meta Description */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="font-medium text-[#111111] dark:text-[#ECECEC]">SEO Meta Description</label>
                  <span className={`text-[11px] ${seoDescription.length > 160 ? 'text-amber-500 font-medium' : 'text-[#888888]'}`}>
                    {seoDescription.length}/160 chars
                  </span>
                </div>
                <Textarea
                  rows={2}
                  placeholder={excerpt || 'Custom description snippet for Google search results...'}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
                <p className="text-[11px] text-[#888888] dark:text-[#777777]">
                  If left empty, article summary will be used automatically.
                </p>
              </div>

              {/* Live Google SERP Preview Card */}
              <div className="p-3.5 rounded-[10px] bg-[#F8F9FA] dark:bg-[#1E1E1C] border border-[#E1E3E6] dark:border-[#2C2C2A] flex flex-col gap-1 text-[13px]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Google Search Result Preview</span>
                </div>
                <div className="font-normal text-[16px] text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer truncate line-clamp-1">
                  {seoTitle || title || 'Untitled Article'} — Jurabek
                </div>
                <div className="text-[12px] text-[#202124] dark:text-[#bdc1c6] truncate">
                  https://jurabek.dev/blog/{slug || 'post-slug'}
                </div>
                <div className="text-[12px] text-[#4d5156] dark:text-[#9aa0a6] line-clamp-2 leading-snug">
                  {seoDescription || excerpt || content.substring(0, 150) || 'No meta description provided yet.'}
                </div>
              </div>
            </div>

            {/* Featured Flag */}
            <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-[#E8E8E8] dark:border-[#2A2A28]">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-[#1E3E62]"
              />
              <span className="text-[14px] font-medium text-[#111111] dark:text-[#ECECEC]">Feature on Homepage</span>
            </label>
          </aside>
        )}
      </div>
    </div>
  );
};
