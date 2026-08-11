import React, { useState } from 'react';
import { Category, Post } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { FolderPlus, Edit3, Trash2, Tag, Check, X, AlertTriangle } from 'lucide-react';

interface AdminCategoriesViewProps {
  categories: Category[];
  posts: Post[];
  onCreateCategory: (cat: { name: string; description?: string }) => Promise<void>;
  onUpdateCategory: (id: string, cat: { name: string; description?: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const AdminCategoriesView: React.FC<AdminCategoriesViewProps> = ({
  categories,
  posts,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const { toast } = useToast();

  // Create form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit form state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast('Name required', 'Please enter a category name', 'error');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateCategory({ name: newCatName.trim(), description: newCatDesc.trim() || undefined });
      toast('Category added', `Category "${newCatName}" created successfully`, 'success');
      setNewCatName('');
      setNewCatDesc('');
    } catch (err: any) {
      toast('Failed to create', err.message || 'Error creating category', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || '');
  };

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setEditCatName('');
    setEditCatDesc('');
  };

  const handleUpdateSubmit = async (e: React.FormEvent, catId: string) => {
    e.preventDefault();
    if (!editCatName.trim()) {
      toast('Name required', 'Please enter a category name', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateCategory(catId, { name: editCatName.trim(), description: editCatDesc.trim() || undefined });
      toast('Category updated', `Category updated successfully`, 'success');
      setEditingCatId(null);
    } catch (err: any) {
      toast('Failed to update', err.message || 'Error updating category', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCat) return;
    setIsDeleting(true);
    try {
      await onDeleteCategory(deletingCat.id);
      toast('Category deleted', `Category "${deletingCat.name}" deleted`, 'success');
      setDeletingCat(null);
    } catch (err: any) {
      toast('Failed to delete', err.message || 'Error deleting category', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1000px]">
      {/* Header */}
      <div className="border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">Categories Studio</h1>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Add, edit, and organize publication categories and their descriptions.
          </p>
        </div>
        <Badge variant="neutral">{categories.length} Categories Total</Badge>
      </div>

      {/* Grid: Create Form + Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Create Category Card */}
        <Card elevation="sm" className="lg:col-span-5 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
            <FolderPlus className="w-5 h-5 text-[#1E3E62] dark:text-blue-400" />
            <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC]">Add New Category</h3>
          </div>

          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            <Input
              label="Category Name"
              placeholder="e.g. Texnologiya, Dizayn"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Brief summary of articles in this category..."
              rows={3}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
            />

            <Button type="submit" variant="primary" disabled={isCreating} className="w-full gap-2 mt-1">
              <FolderPlus className="w-4 h-4" />
              <span>{isCreating ? 'Adding...' : 'Add Category'}</span>
            </Button>
          </form>
        </Card>

        {/* Right Column: Existing Categories List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
            <span>Existing Categories</span>
          </h3>

          <div className="flex flex-col gap-4">
            {categories.map((cat) => {
              const postCount = posts.filter(
                (p) => p.category.toLowerCase() === cat.name.toLowerCase()
              ).length;
              const isEditing = editingCatId === cat.id;

              return (
                <Card key={cat.id} elevation="sm" className="p-5 flex flex-col gap-3 transition-all">
                  {isEditing ? (
                    <form onSubmit={(e) => handleUpdateSubmit(e, cat.id)} className="flex flex-col gap-3">
                      <Input
                        label="Category Name"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        required
                      />
                      <Textarea
                        label="Description"
                        rows={2}
                        value={editCatDesc}
                        onChange={(e) => setEditCatDesc(e.target.value)}
                      />
                      <div className="flex items-center gap-2 justify-end pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={isUpdating}>
                          <Check className="w-4 h-4 mr-1" />
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-serif font-bold text-[18px] text-[#111111] dark:text-[#ECECEC]">
                            {cat.name}
                          </h4>
                          <span className="text-[12px] font-mono px-2 py-0.5 rounded bg-[#F4F4F2] dark:bg-[#262624] text-[#666666] dark:text-[#999999]">
                            slug: {cat.slug}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-[#666666] hover:text-[#111111] dark:hover:text-white"
                            title="Edit Category"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCat(cat)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {cat.description && (
                        <p className="text-[14px] text-[#666666] dark:text-[#999999] leading-relaxed">
                          {cat.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-[#E8E8E8] dark:border-[#2A2A28]/60 flex items-center justify-between text-[13px]">
                        <span className="text-[#666666] dark:text-[#999999]">Associated Posts:</span>
                        <span className="font-semibold text-[#1E3E62] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full text-[12px]">
                          {postCount} {postCount === 1 ? 'post' : 'posts'}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <Card elevation="lg" className="max-w-md w-full p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-[18px]">Delete Category</h3>
            </div>

            <p className="text-[14px] text-[#666666] dark:text-[#999999] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#111111] dark:text-white">{deletingCat.name}</strong>?
            </p>

            {posts.filter((p) => p.category.toLowerCase() === deletingCat.name.toLowerCase()).length > 0 && (
              <div className="p-3 rounded-[8px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[13px] text-amber-800 dark:text-amber-200">
                ⚠️ Warning: {posts.filter((p) => p.category.toLowerCase() === deletingCat.name.toLowerCase()).length} post(s) currently use this category. Deleting it will reassign those posts to another active category.
              </div>
            )}

            <div className="flex items-center gap-3 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingCat(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" disabled={isDeleting} onClick={handleConfirmDelete}>
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
