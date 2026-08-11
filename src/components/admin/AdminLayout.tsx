import React from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LayoutDashboard, FileText, FolderKanban, PlusCircle, Image as ImageIcon, Settings, LogOut, Eye } from 'lucide-react';

interface AdminLayoutProps {
  currentTab: 'dashboard' | 'posts' | 'categories' | 'editor' | 'media' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'posts' | 'categories' | 'editor' | 'media' | 'settings') => void;
  onExitAdmin: () => void;
  onLogout: () => void;
  onNewPost: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  setCurrentTab,
  onExitAdmin,
  onLogout,
  onNewPost,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#121211] text-[#111111] dark:text-[#ECECEC]">
      {/* Admin Control Bar */}
      <header className="sticky top-0 z-40 bg-[#1E3E62] text-white shadow-md">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-serif font-bold text-[18px]">
              <span>Jurabek Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-sans uppercase tracking-wider">
                Admin
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${
                  currentTab === 'dashboard' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentTab('posts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${
                  currentTab === 'posts' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Posts</span>
              </button>
              <button
                onClick={() => setCurrentTab('categories')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${
                  currentTab === 'categories' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                <span>Categories</span>
              </button>
              <button
                onClick={onNewPost}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${
                  currentTab === 'editor' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Essay</span>
              </button>
              <button
                onClick={() => setCurrentTab('media')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${
                  currentTab === 'media' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Media</span>
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${
                  currentTab === 'settings' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExitAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-blue-100/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-[8px] transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View Site</span>
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 text-blue-100/80 hover:text-white hover:bg-white/10 rounded-[8px] transition-colors"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1200px] mx-auto px-6 md:px-8 py-8">{children}</main>
    </div>
  );
};
