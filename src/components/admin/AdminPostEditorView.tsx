import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { Post, Category, Tag, MediaItem, FAQItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';
import { FormattedTable } from '../ui/FormattedTable';
import { parseMarkdownTable, renderInlineMarkdown } from '../ui/MarkdownTable';
import { MarkdownContent } from '../ui/MarkdownContent';
import { processLocalImageFile } from '../../lib/imageUtils';
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
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon,
  Check,
  Clock,
  Sparkles,
  Settings,
  Plus,
  X,
  Search,
  Globe,
  FileText,
  HelpCircle,
  Trash2,
  Upload,
  HardDrive,
  Loader2,
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
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

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
  const [faqs, setFaqs] = useState<FAQItem[]>(post?.faqs || []);

  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);

  const deferredContent = useDeferredValue(content);

  // Auto slug generation if empty
  useEffect(() => {
    if (!post && title && !slug) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [title, post, slug]);

  // Autosave status tracking
  useEffect(() => {
    if (!post && !title && !content) return;
    setIsDirty(true);
  }, [title, slug, excerpt, content, category, tags, status, isFeatured, coverImage, seoTitle, seoDescription, faqs]);

  // Real-time word count & reading time (calculated on deferred content for 60fps typing)
  const { wordCount, readingTimeMinutes } = useMemo(() => {
    const match = deferredContent.match(/\S+/g);
    const words = match ? match.length : 0;
    const time = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingTimeMinutes: time };
  }, [deferredContent]);

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

  // Direct image insertion helper
  const insertImageAtCursor = (imageUrl: string, altText: string = 'Rasm') => {
    const textarea = textareaRef.current;
    const mdImage = `\n\n![${altText}](${imageUrl})\n\n`;

    if (!textarea) {
      setContent((prev) => prev + mdImage);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + mdImage + content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + mdImage.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Handle local image file selected from editor toolbar
  const handleEditorImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast('Noto‘g‘ri format', 'Iltimos faqat rasm fayllarini tanlang', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const processed = await processLocalImageFile(file);
      const cleanAlt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      insertImageAtCursor(processed.dataUrl, cleanAlt);
      toast('Rasm joylandi', 'Qurilmadagi rasm maqolaga muvaffaqiyatli kiritildi', 'success');
    } catch (err: any) {
      toast('Yuklashda xatolik', err.message || 'Rasmni qayta ishlashda xatolik yuz berdi', 'error');
    } finally {
      setIsUploadingImage(false);
      if (editorFileInputRef.current) {
        editorFileInputRef.current.value = '';
      }
    }
  };

  // Handle clipboard paste of images directly into the textarea (e.g. screenshot paste)
  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setIsUploadingImage(true);
          try {
            const processed = await processLocalImageFile(file);
            insertImageAtCursor(processed.dataUrl, 'Clipboard rasm');
            toast('Rasm joylandi', 'Buferdagi rasm maqolaga kiritildi', 'success');
          } catch (err: any) {
            toast('Xatolik', 'Buferdagi rasmni yuklab bo‘lmadi', 'error');
          } finally {
            setIsUploadingImage(false);
          }
          break;
        }
      }
    }
  };

  // Handle cover image upload from local device
  const handleCoverImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast('Noto‘g‘ri format', 'Iltimos faqat rasm fayllarini tanlang', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const processed = await processLocalImageFile(file, 2400, 1600, 0.88);
      setCoverImage(processed.dataUrl);
      if (!coverImageAlt) {
        setCoverImageAlt(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
      toast('Muqova rasmi yuklandi', 'Muqova rasmi muvaffaqiyatli o‘rnatildi', 'success');
    } catch (err: any) {
      toast('Xatolik', err.message || 'Rasmni yuklashda xatolik', 'error');
    } finally {
      setIsUploadingImage(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
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

  const handleAddFaq = () => {
    setFaqs([
      ...faqs,
      {
        id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: '',
        answer: '',
      },
    ]);
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqs(
      faqs.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, idx) => idx !== index));
  };

  const handleSaveSubmit = async (overrideStatus?: 'draft' | 'published') => {
    if (!title.trim()) {
      toast('Sarlavha talab qilinadi', 'Iltimos maqola sarlavhasini kiriting', 'error');
      return;
    }
    if (!content.trim()) {
      toast('Matn talab qilinadi', 'Iltimos maqola matnini yozing', 'error');
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
        faqs: faqs.filter((f) => f.question?.trim() || f.answer?.trim()),
      });

      setStatus(targetStatus);
      setIsDirty(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast('Saqlandi', `Maqola ${targetStatus === 'published' ? 'chop etildi' : 'saqlandi'}`, 'success');
    } catch (err: any) {
      toast('Saqlashda xatolik', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden file inputs for local image pickers */}
      <input
        ref={editorFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        onChange={handleEditorImageFileChange}
        className="hidden"
      />
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        onChange={handleCoverImageFileChange}
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 text-[#666666]">
            <ArrowLeft className="w-4 h-4" />
            <span>Barcha maqolalar</span>
          </Button>

          <div className="flex items-center gap-2 text-[13px] text-[#666666] dark:text-[#999999]">
            <span>{isDirty ? 'Saqlanmagan o‘zgarishlar' : `Saqlangan ${lastSavedTime || ''}`}</span>
            <span>•</span>
            <span>{wordCount} ta so‘z</span>
            <span>•</span>
            <span>{readingTimeMinutes} daqiqa mutolaa</span>
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
              Yozish
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
              Ko‘rish
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Sozlamalar</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSaveSubmit('draft')}
            disabled={isSaving}
          >
            Qoralama
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSaveSubmit('published')}
            disabled={isSaving}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saqlanmoqda...' : 'Chop etish'}</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center Content Column */}
        <div className={`${showSettingsDrawer ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4`}>
          {/* Post Title Field */}
          <input
            type="text"
            placeholder="Maqola sarlavhasi..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full font-serif text-[30px] md:text-[38px] font-bold bg-transparent text-[#111111] dark:text-[#ECECEC] placeholder:text-[#999999] focus:outline-none border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3"
          />

          {/* Markdown Formatting Toolbar */}
          {viewMode !== 'preview' && (
            <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[13px] text-[#666666] dark:text-[#999999]">
              <button
                type="button"
                onClick={() => insertFormatting('## ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Heading 2 (## )"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Heading 3 (### )"
              >
                <Heading3 className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Qalin (Bold)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Kursiv (Italic)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('- ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Belgili ro‘yxat (- )"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Raqamli ro‘yxat (1. )"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Iqtibos (> )"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```typescript\n', '\n```')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Dasturiy kod bloki"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](https://example.com)')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Havola qo‘shish"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n| Ustun 1 | Ustun 2 | Ustun 3 |\n| :--- | :---: | :---: |\n| Ma\'lumot A | Qiymat 1 | Natija |\n| Ma\'lumot B | Qiymat 2 | Natija |\n')}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5"
                title="Jadval kiritish"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-[#E8E8E8] dark:bg-[#333330] mx-1" />

              {/* Upload image directly from local device */}
              <button
                type="button"
                onClick={() => editorFileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="p-1.5 hover:text-[#1E3E62] dark:hover:text-blue-400 rounded hover:bg-black/5 flex items-center gap-1.5 text-[12px] font-semibold text-[#1E3E62] dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 px-2.5 transition-colors cursor-pointer"
                title="Qurilmadan rasm yuklash"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>Qurilmadan rasm</span>
              </button>

              {/* Select from media library */}
              <button
                type="button"
                onClick={onOpenMediaLibrary}
                className="p-1.5 hover:text-[#111111] dark:hover:text-white rounded hover:bg-black/5 flex items-center gap-1 text-[12px] font-medium text-[#666666] dark:text-[#999999]"
                title="Media kutubxonasidan tanlash"
              >
                <ImageIcon className="w-4 h-4 text-[#888888]" />
                <span>Kutubxona</span>
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
                  onPaste={handleTextareaPaste}
                  placeholder="Maqolani Markdown formatida yozing... (Rasmlarni to'g'ridan-to'g'ri Ctrl+V bilan joylashingiz mumkin)"
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
                    <h1 className="font-serif text-[30px] font-bold text-[#111111] dark:text-[#ECECEC] mt-2">
                      {title || 'Sarlavhasiz maqola'}
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

                  <MarkdownContent
                    content={deferredContent}
                    isEditorPreview={true}
                  />

                  {/* FAQ Preview */}
                  {faqs.length > 0 && (
                    <div className="border-t border-[#E8E8E8] dark:border-[#2A2A28] pt-6 mt-4">
                      <h3 className="font-serif text-[20px] font-bold text-[#111111] dark:text-[#ECECEC] mb-4">
                        Ko‘p so‘raladigan savollar (FAQ)
                      </h3>
                      <div className="flex flex-col gap-3">
                        {faqs.map((f, i) => (
                          <div key={i} className="p-3.5 rounded-[8px] bg-[#F9F9F8] dark:bg-[#222220] border border-[#EAEAEA] dark:border-[#2E2E2C]">
                            <h4 className="font-medium text-[15px] text-[#111111] dark:text-[#ECECEC] mb-1">
                              {f.question || 'Savol matni'}
                            </h4>
                            <p className="text-[14px] text-[#555555] dark:text-[#AAAAAA]">
                              {f.answer || 'Javob matni'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FAQ Editor Section */}
          <div className="border-t border-[#E8E8E8] dark:border-[#2A2A28] pt-6 mt-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#1E3E62] dark:text-blue-400" />
                <div>
                  <h3 className="font-semibold text-[16px] text-[#111111] dark:text-[#ECECEC]">
                    Ko'p beriladigan savollar (FAQ)
                  </h3>
                  <p className="text-[12px] text-[#777777] dark:text-[#999999]">
                    Maqola oxirida interaktiv FAQ blokini shakllantiring.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFaq}
                className="gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Savol qo'shish</span>
              </Button>
            </div>

            {faqs.length === 0 ? (
              <div className="p-6 rounded-[10px] bg-[#FAFAFA] dark:bg-[#1C1C1A] border border-dashed border-[#DCDCDA] dark:border-[#333330] text-center flex flex-col items-center justify-center gap-2">
                <HelpCircle className="w-7 h-7 text-[#999999]" />
                <p className="text-[13px] text-[#666666] dark:text-[#999999]">
                  Ushbu maqola uchun FAQ savollari hali qo'shilmagan.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFaq}
                  className="gap-1 mt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Birinchi savolni qo'shish</span>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {faqs.map((faq, idx) => (
                  <div
                    key={faq.id || `faq-${idx}`}
                    className="p-4 rounded-[10px] bg-[#FBFBFA] dark:bg-[#20201E] border border-[#E8E8E8] dark:border-[#2E2E2C] flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#1E3E62] dark:text-blue-400 uppercase tracking-wide">
                        #{idx + 1}-savol
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(idx)}
                        className="text-[#999999] hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-500/10 cursor-pointer"
                        title="Savolni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-medium text-[#555555] dark:text-[#AAAAAA]">
                        Savol:
                      </label>
                      <Input
                        placeholder="Masalan: Ushbu usulning asosiy afzalligi nimada?"
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-medium text-[#555555] dark:text-[#AAAAAA]">
                        Javob:
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="Batafsil va tushunarli javob matni..."
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Drawer Sidebar */}
        {showSettingsDrawer && (
          <aside className="lg:col-span-4 flex flex-col gap-6 p-5 rounded-[12px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28]">
            <h3 className="font-semibold text-[16px] text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
              Maqola Sozlamalari
            </h3>

            {/* Status Dropdown */}
            <Select
              label="Chop etish holati"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'draft', label: 'Qoralama (Draft)' },
                { value: 'published', label: 'Chop etilgan (Published)' },
                { value: 'scheduled', label: 'Rejalashtirilgan (Scheduled)' },
                { value: 'archived', label: 'Arxivlangan (Archived)' },
              ]}
            />

            {/* Scheduled Date picker if scheduled */}
            {status === 'scheduled' && (
              <Input
                label="Rejalashtirilgan sana va vaqt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            )}

            {/* Category */}
            <Select
              label="Kategoriya"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
            />

            {/* Tags Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">Teglar (Teg qo‘shish)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Yangi teg..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-1.5 text-[14px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[#111111] dark:text-[#ECECEC] focus:outline-none focus:border-[#1E3E62]"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                  Qo‘shish
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
              label="URL Slug (Manzil)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              helperText={`Maqola manzili: /blog/${slug || 'maqola-nomi'}`}
            />

            {/* Excerpt */}
            <Textarea
              label="Maqola qisqacha tavsifi (Excerpt)"
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              helperText="Bosh sahifada va qidiruv natijalarida ko‘rinadigan tavsif."
            />

            {/* Featured Cover Image */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
                Asosiy Muqova Rasmi (Cover Image)
              </label>
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://... yoki qurilmadan yuklang"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="text-[13px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenMediaLibrary}
                    className="shrink-0"
                    title="Media kutubxonadan tanlash"
                  >
                    Kutubxona
                  </Button>
                </div>

                {/* Upload Cover from Local Device Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full gap-2 justify-center border-dashed border-[#1E3E62]/40 dark:border-blue-400/40 text-[#1E3E62] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>Qurilmadan muqova rasmini yuklash</span>
                </Button>
              </div>

              {coverImage && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="relative rounded-[8px] overflow-hidden border border-[#E8E8E8] dark:border-[#2A2A28] max-h-36 bg-black/5 flex items-center justify-center">
                    <img
                      src={coverImage}
                      alt="Muqova prevyusi"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage('');
                        setCoverImageAlt('');
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      title="Muqovani olib tashlash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    label="Rasm Tavsifi (Alt text — SEO uchun)"
                    placeholder="Rasmning qisqacha ma'nosi..."
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
                  <span>SEO va Meta Teglar</span>
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
                  <span>Maqoladan to‘ldirish</span>
                </button>
              </div>

              {/* SEO Meta Title */}
              <Input
                label="SEO Title (Qidiruv sarlavhasi)"
                placeholder="Google qidiruvida ko'rinadigan sarlavha..."
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                helperText={`${seoTitle.length}/60 belgi tavsiya etiladi`}
              />

              {/* SEO Meta Description */}
              <Textarea
                label="SEO Meta Description (Qidiruv tavsifi)"
                rows={2}
                placeholder="Google qidiruvida chiqadigan qisqacha tavsif..."
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                helperText={`${seoDescription.length}/160 belgi tavsiya etiladi`}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
