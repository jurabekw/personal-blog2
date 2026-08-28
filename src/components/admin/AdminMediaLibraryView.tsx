import React, { useState, useRef } from 'react';
import { MediaItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { processLocalImageFile } from '../../lib/imageUtils';
import {
  Image as ImageIcon,
  Plus,
  Copy,
  Check,
  Trash2,
  Search,
  Upload,
  HardDrive,
  Globe,
  Loader2,
  FileImage,
} from 'lucide-react';

interface AdminMediaLibraryViewProps {
  mediaItems: MediaItem[];
  onAddMedia: (media: Partial<MediaItem>) => Promise<MediaItem>;
  onDeleteMedia: (id: string) => Promise<void>;
  onSelectMediaForEditor?: (url: string) => void;
}

export const AdminMediaLibraryView: React.FC<AdminMediaLibraryViewProps> = ({
  mediaItems,
  onAddMedia,
  onDeleteMedia,
  onSelectMediaForEditor,
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tab mode in Add Modal: 'local' (device file upload) vs 'url' (external web link)
  const [uploadMode, setUploadMode] = useState<'local' | 'url'>('local');

  // URL state
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local file state
  const [isDragging, setIsDragging] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState('');
  const [localFileSize, setLocalFileSize] = useState<number>(0);
  const [localMimeType, setLocalMimeType] = useState('image/webp');
  const [localAlt, setLocalAlt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = mediaItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.altText && item.altText.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCopyUrl = (url: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast('Nusxalandi', 'Rasm havolasi buferga nusxalandi', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Noto‘g‘ri format', 'Iltimos faqat rasm fayllarini yuklang (PNG, JPG, WebP, SVG)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const processed = await processLocalImageFile(file);
      setLocalPreviewUrl(processed.dataUrl);
      setLocalFileName(processed.name);
      setLocalFileSize(processed.size);
      setLocalMimeType(processed.mimeType);
      if (!localAlt) {
        setLocalAlt(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    } catch (err: any) {
      toast('Xatolik', err.message || 'Rasmni qayta ishlashda xatolik', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFile(e.target.files[0]);
    }
  };

  const handleSaveLocalImage = async () => {
    if (!localPreviewUrl) {
      toast('Rasm tanlanmagan', 'Iltimos qurilmangizdan rasm tanlang', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddMedia({
        name: localFileName || 'qurilma-rasmi.webp',
        url: localPreviewUrl,
        altText: localAlt,
        mimeType: localMimeType,
        sizeBytes: localFileSize,
      });
      toast('Rasm yuklandi', 'Rasm muvaffaqiyatli media kutubxonaga qo‘shildi', 'success');
      resetAndCloseModal();
    } catch (err: any) {
      toast('Xatolik', err.message || 'Rasmni saqlashda xatolik', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast('URL talab qilinadi', 'Iltimos yaroqli rasm havolasini kiriting', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddMedia({
        name: newName || 'internet-rasmi.jpg',
        url: newUrl.trim(),
        altText: newAlt,
        mimeType: 'image/jpeg',
        sizeBytes: 350000,
      });
      toast('Rasm qo‘shildi', 'Yangi rasm kutubxonaga qo‘shildi', 'success');
      resetAndCloseModal();
    } catch (err: any) {
      toast('Xatolik', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndCloseModal = () => {
    setIsUploadModalOpen(false);
    setLocalPreviewUrl(null);
    setLocalFileName('');
    setLocalFileSize(0);
    setLocalAlt('');
    setNewUrl('');
    setNewName('');
    setNewAlt('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ushbu rasmni media kutubxonadan o‘chirishni tasdiqlaysizmi?')) {
      try {
        await onDeleteMedia(id);
        setSelectedItem(null);
        toast('O‘chirildi', 'Rasm media kutubxonadan olib tashlandi', 'success');
      } catch (err: any) {
        toast('Xatolik', err.message, 'error');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">Media Kutubxonasi</h1>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Qurilmangizdan yoki internetdan rasmlar va grafikalar yuklang hamda boshqaring.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          <span>Rasm Yuklash / Qo‘shish</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
          <input
            type="text"
            placeholder="Nomi yoki tavsifi bo‘yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[14px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[#111111] dark:text-[#ECECEC] focus:outline-none focus:border-[#1E3E62] dark:focus:border-blue-500"
          />
        </div>

        <span className="text-[13px] text-[#666666] dark:text-[#999999]">
          {filteredMedia.length} ta rasm
        </span>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-[#E8E8E8] dark:border-[#2A2A28] rounded-[12px] p-8">
          <ImageIcon className="w-12 h-12 text-[#999999] mb-3 stroke-[1.5]" />
          <h3 className="text-[16px] font-semibold text-[#111111] dark:text-[#ECECEC]">Rasmlar mavjud emas</h3>
          <p className="text-[14px] text-[#666666] dark:text-[#999999] max-w-md mt-1 mb-4">
            Qurilmangizdan rasm yuklang yoki maqolalaringiz uchun rasmlar to‘plamini yarating.
          </p>
          <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            <span>Qurilmadan rasm tanlash</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <Card
              key={item.id}
              elevation="sm"
              onClick={() => setSelectedItem(item)}
              className={`p-2 cursor-pointer group flex flex-col gap-2 transition-all ${
                selectedItem?.id === item.id ? 'border-[#1E3E62] dark:border-blue-500 ring-2 ring-[#1E3E62]/20' : ''
              }`}
            >
              <div className="w-full aspect-video rounded-[8px] overflow-hidden bg-[#F4F4F2] dark:bg-[#262624] relative">
                <img
                  src={item.url}
                  alt={item.altText || item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                {item.url.startsWith('data:') && (
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white font-mono">
                    Lokal
                  </span>
                )}
              </div>
              <div className="px-1 flex items-center justify-between text-[12px]">
                <span className="font-medium text-[#111111] dark:text-[#ECECEC] truncate max-w-[120px]" title={item.name}>
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl(item.url, item.id);
                  }}
                  className="text-[#666666] hover:text-[#111111] dark:hover:text-white p-1 transition-colors"
                  title="Havolani nusxalash"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Rasm ma'lumotlari" maxWidth="lg">
          <div className="flex flex-col gap-4">
            <div className="w-full max-h-[320px] rounded-[10px] overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center p-2">
              <img
                src={selectedItem.url}
                alt={selectedItem.name}
                referrerPolicy="no-referrer"
                className="max-h-[300px] max-w-full object-contain rounded-[6px]"
              />
            </div>

            <div className="flex flex-col gap-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#111111] dark:text-[#ECECEC] truncate max-w-[70%]">{selectedItem.name}</span>
                <span className="text-[12px] text-[#999999]">
                  {selectedItem.sizeBytes ? `${(selectedItem.sizeBytes / 1024).toFixed(0)} KB` : 'Optimallashtirilgan'}
                </span>
              </div>
              <p className="text-[13px] text-[#666666] dark:text-[#999999]">
                <strong>Tavsif (Alt text):</strong> {selectedItem.altText || 'Belgilanmagan'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  readOnly
                  value={selectedItem.url}
                  className="flex-1 px-3 py-1.5 text-[12px] bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] font-mono text-[#444444] dark:text-[#CCCCCC]"
                />
                <Button variant="secondary" size="sm" onClick={() => handleCopyUrl(selectedItem.url, selectedItem.id)}>
                  Nusxalash
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#E8E8E8] dark:border-[#2A2A28] pt-4 mt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedItem.id)}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>O‘chirish</span>
              </Button>

              {onSelectMediaForEditor && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onSelectMediaForEditor(selectedItem.url);
                    setSelectedItem(null);
                  }}
                >
                  Maqolaga kiritish
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Upload / Add Media Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={resetAndCloseModal} title="Rasm Qo‘shish" maxWidth="md">
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#F4F4F2] dark:bg-[#242422] rounded-[8px]">
            <button
              type="button"
              onClick={() => setUploadMode('local')}
              className={`flex items-center justify-center gap-2 py-2 text-[13px] font-medium rounded-[6px] transition-all ${
                uploadMode === 'local'
                  ? 'bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] shadow-sm'
                  : 'text-[#666666] dark:text-[#888888] hover:text-[#111111]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Qurilmadan yuklash</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`flex items-center justify-center gap-2 py-2 text-[13px] font-medium rounded-[6px] transition-all ${
                uploadMode === 'url'
                  ? 'bg-white dark:bg-[#1A1A18] text-[#111111] dark:text-[#ECECEC] shadow-sm'
                  : 'text-[#666666] dark:text-[#888888] hover:text-[#111111]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Internet havolasi (URL)</span>
            </button>
          </div>

          {/* Local Device Upload Mode */}
          {uploadMode === 'local' ? (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!localPreviewUrl ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[12px] p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-[#1E3E62] dark:border-blue-500 bg-[#1E3E62]/5 dark:bg-blue-500/10'
                      : 'border-[#D0D0D0] dark:border-[#333330] hover:border-[#1E3E62] dark:hover:border-blue-400 bg-[#FAFAFA] dark:bg-[#181816]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#EAEAEA] dark:bg-[#282826] flex items-center justify-center text-[#1E3E62] dark:text-blue-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#111111] dark:text-[#ECECEC]">
                      Rasmni bu yerga tashlang yoki <span className="text-[#1E3E62] dark:text-blue-400 underline">tanlang</span>
                    </p>
                    <p className="text-[12px] text-[#888888] dark:text-[#777777] mt-1">
                      PNG, JPG, WebP, GIF, SVG (avtomatik ravishda blog uchun optimallashtiriladi)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="relative w-full h-[180px] rounded-[10px] overflow-hidden bg-black/5 dark:bg-black/30 flex items-center justify-center border border-[#E8E8E8] dark:border-[#2A2A28]">
                    <img
                      src={localPreviewUrl}
                      alt={localFileName}
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLocalPreviewUrl(null);
                        setLocalFileName('');
                        setLocalFileSize(0);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                      title="Rasmni almashtirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-[#666666] dark:text-[#999999] px-1">
                    <span className="truncate max-w-[200px] font-medium">{localFileName}</span>
                    <span>{(localFileSize / 1024).toFixed(0)} KB</span>
                  </div>

                  <Input
                    label="Rasm Tavsifi (Alt text)"
                    placeholder="Masalan: Arxitektura loyihasi eskizi"
                    value={localAlt}
                    onChange={(e) => setLocalAlt(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E8E8] dark:border-[#2A2A28]">
                <Button type="button" variant="ghost" onClick={resetAndCloseModal}>
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!localPreviewUrl || isSubmitting}
                  onClick={handleSaveLocalImage}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Kutubxonaga saqlash</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* External URL Mode */
            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
              <Input
                label="Rasm URL manzili *"
                placeholder="https://images.unsplash.com/photo-..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />

              <Input
                label="Fayl nomi"
                placeholder="insho-rasmi.jpg"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />

              <Input
                label="Tavsif (Alt text)"
                placeholder="Minimalistik rasm tavsifi"
                value={newAlt}
                onChange={(e) => setNewAlt(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E8E8] dark:border-[#2A2A28]">
                <Button type="button" variant="ghost" onClick={resetAndCloseModal}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Qo‘shilmoqda...' : 'Qo‘shish'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
