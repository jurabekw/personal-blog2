import React, { useState } from 'react';
import { MediaItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Image as ImageIcon, Plus, Copy, Check, Trash2, Search, ExternalLink } from 'lucide-react';

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

  // New Upload Form state
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMedia = mediaItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.altText.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyUrl = (url: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast('URL copied', 'Media URL copied to clipboard', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast('URL required', 'Please enter a valid image URL', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddMedia({
        name: newName || 'editorial-image.jpg',
        url: newUrl,
        altText: newAlt,
        mimeType: 'image/jpeg',
        sizeBytes: 400000,
      });
      toast('Media added', 'New image added to library', 'success');
      setIsUploadModalOpen(false);
      setNewUrl('');
      setNewName('');
      setNewAlt('');
    } catch (err: any) {
      toast('Failed to add media', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this media asset from library?')) {
      try {
        await onDeleteMedia(id);
        setSelectedItem(null);
        toast('Media deleted', 'Asset removed', 'success');
      } catch (err: any) {
        toast('Delete failed', err.message, 'error');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">Media Library</h1>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Store and manage high-quality photography and graphics.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Upload / Add Image</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
          <input
            type="text"
            placeholder="Search media by name or alt text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[14px] bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] text-[#111111] dark:text-[#ECECEC]"
          />
        </div>

        <span className="text-[13px] text-[#666666] dark:text-[#999999]">
          {filteredMedia.length} assets
        </span>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredMedia.map((item) => (
          <Card
            key={item.id}
            elevation="sm"
            onClick={() => setSelectedItem(item)}
            className={`p-2 cursor-pointer group flex flex-col gap-2 transition-all ${
              selectedItem?.id === item.id ? 'border-[#1E3E62] dark:border-blue-500 ring-2 ring-[#1E3E62]/20' : ''
            }`}
          >
            <div className="w-full aspect-video rounded-[8px] overflow-hidden bg-[#F4F4F2] dark:bg-[#262624]">
              <img
                src={item.url}
                alt={item.altText || item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="px-1 flex items-center justify-between text-[12px]">
              <span className="font-medium text-[#111111] dark:text-[#ECECEC] truncate max-w-[120px]">
                {item.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl(item.url, item.id);
                }}
                className="text-[#666666] hover:text-[#111111] p-1"
                title="Copy Image URL"
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

      {/* Detail Modal / Drawer */}
      {selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Media Item Details" maxWidth="lg">
          <div className="flex flex-col gap-4">
            <div className="w-full max-h-[300px] rounded-[10px] overflow-hidden bg-black/5 flex items-center justify-center">
              <img src={selectedItem.url} alt={selectedItem.name} referrerPolicy="no-referrer" className="max-h-[300px] object-contain" />
            </div>

            <div className="flex flex-col gap-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#111111] dark:text-[#ECECEC]">{selectedItem.name}</span>
                <span className="text-[12px] text-[#999999]">{(selectedItem.sizeBytes / 1024).toFixed(0)} KB</span>
              </div>
              <p className="text-[13px] text-[#666666] dark:text-[#999999]">
                <strong>Alt text:</strong> {selectedItem.altText || 'None defined'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  readOnly
                  value={selectedItem.url}
                  className="flex-1 px-3 py-1.5 text-[13px] bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] rounded-[8px] font-mono"
                />
                <Button variant="secondary" size="sm" onClick={() => handleCopyUrl(selectedItem.url, selectedItem.id)}>
                  Copy URL
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
                <span>Delete Asset</span>
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
                  Insert into Post
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Upload / Add Media Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Add Image to Media Library" maxWidth="md">
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
          <Input
            label="Image URL *"
            placeholder="https://images.unsplash.com/photo-..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />

          <Input
            label="File Name"
            placeholder="architecture-study.jpg"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Input
            label="Alt Description"
            placeholder="Minimalist line art illustration"
            value={newAlt}
            onChange={(e) => setNewAlt(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Image'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
