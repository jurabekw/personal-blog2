import React, { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api';
import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog, UserSession } from './types';
import { initialPosts, initialCategories, initialTags, initialMedia, initialSettings } from './data/seedData';
import { ToastProvider, useToast } from './components/ui/Toast';

import { SEOHead } from './components/SEOHead';

// Public Header & Footer
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Public Views
import { HomeView } from './components/views/HomeView';
import { BlogIndexView } from './components/views/BlogIndexView';
import { ArticleView } from './components/views/ArticleView';
import { ContactView } from './components/views/ContactView';

// Modals
import { SearchModal } from './components/modals/SearchModal';

// Admin Components
import { AdminLoginView } from './components/admin/AdminLoginView';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminPostsListView } from './components/admin/AdminPostsListView';
import { AdminCategoriesView } from './components/admin/AdminCategoriesView';
import { AdminPostEditorView } from './components/admin/AdminPostEditorView';
import { AdminMediaLibraryView } from './components/admin/AdminMediaLibraryView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';

export function JurabekApp() {
  const { toast } = useToast();

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('jurabek_theme');
    if (saved) return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Public Navigation state
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals state
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);

  // Admin state
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      return localStorage.getItem('jurabek_in_admin') === 'true' && (path.startsWith('/admin') || hash === '#admin');
    }
    return false;
  });
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      return path === '/admin' || path.startsWith('/admin') || hash === '#admin';
    }
    return false;
  });
  const [session, setSession] = useState<UserSession>({ isAuthenticated: false, user: null });
  const [adminTab, setAdminTab] = useState<'dashboard' | 'posts' | 'categories' | 'editor' | 'media' | 'settings'>('dashboard');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [initialPostStatusFilter, setInitialPostStatusFilter] = useState<string>('all');

  // Application Data
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    title: 'Jurabek',
    description: 'A quiet personal journal on typography, software craftsmanship, and quiet digital interfaces.',
    authorName: 'Jurabek',
    authorBio: 'Software architect and essayist exploring quiet digital tools, typography, and enduring personal software.',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    email: 'shokirovj35@gmail.com',
    postsPerPage: 10,
    showReadingTime: true,
    showProgress: true,
    analyticsEnabled: true,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Handle dark mode class on <html> and <body>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('jurabek_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('jurabek_theme', 'light');
    }
  }, [darkMode]);

  // Load initial backend data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPosts, fetchedCats, fetchedTags, fetchedMedia, fetchedSettings] = await Promise.all([
        api.getPosts(),
        api.getCategories(),
        api.getTags(),
        api.getMedia(),
        api.getSettings(),
      ]);
      setPosts(fetchedPosts);
      setCategories(fetchedCats);
      setTags(fetchedTags);
      setMediaItems(fetchedMedia);
      setSettings(fetchedSettings);

      // Check admin session
      const userSess = await api.checkSession();
      setSession(userSess);

      const path = window.location.pathname;
      const hash = window.location.hash;
      const isAdminUrl = path === '/admin' || path.startsWith('/admin') || hash === '#admin';

      if (isAdminUrl) {
        if (userSess.isAuthenticated) {
          setIsAdminMode(true);
          setShowAdminLogin(false);
        } else {
          setShowAdminLogin(true);
        }
      } else if (userSess.isAuthenticated && localStorage.getItem('jurabek_in_admin') === 'true') {
        setIsAdminMode(true);
      } else if (path.startsWith('/blog/') || hash.startsWith('#blog/')) {
        const slug = path.replace('/blog/', '').replace('#blog/', '');
        const found = fetchedPosts.find((p) => p.slug === slug || p.id === slug);
        if (found) {
          setSelectedPost(found);
          setActiveTab('article');
        }
      }
    } catch (err) {
      console.warn('Backend API unavailable, loading offline seed data:', err);
      setPosts(initialPosts);
      setCategories(initialCategories);
      setTags(initialTags);
      setMediaItems(initialMedia);
      setSettings(initialSettings);

      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || path.startsWith('/admin') || hash === '#admin') {
        setShowAdminLogin(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL changes for /admin and /blog/ routes
  useEffect(() => {
    const handleLocationCheck = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const isAdminUrl = path === '/admin' || path.startsWith('/admin') || hash === '#admin';
      if (isAdminUrl) {
        if (session.isAuthenticated) {
          setIsAdminMode(true);
          setShowAdminLogin(false);
        } else {
          setShowAdminLogin(true);
        }
      } else if (path.startsWith('/blog/') || hash.startsWith('#blog/')) {
        const slug = path.replace('/blog/', '').replace('#blog/', '');
        const found = posts.find((p) => p.slug === slug || p.id === slug);
        if (found) {
          setSelectedPost(found);
          setActiveTab('article');
        }
      }
    };

    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, [session.isAuthenticated, posts]);

  // Load activity logs when admin mode opens
  const refreshActivityLogs = useCallback(async () => {
    if (session.isAuthenticated) {
      try {
        const logs = await api.getActivityLogs();
        setActivityLogs(logs);
      } catch (e) {
        console.error('Failed to load activity logs:', e);
      }
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    if (isAdminMode && session.isAuthenticated) {
      refreshActivityLogs();
    }
  }, [isAdminMode, session.isAuthenticated, refreshActivityLogs]);

  // Public Handlers
  const handleSelectPost = async (post: Post) => {
    setSelectedPost(post);
    setActiveTab('article');
    if (window.location.pathname !== `/blog/${post.slug}`) {
      window.history.pushState({}, '', `/blog/${post.slug}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await api.getPostBySlugOrId(post.id, true);
    } catch (e) {
      // ignore
    }
  };

  const handleSelectCategory = (catName: string | null) => {
    setSelectedCategory(catName);
    setActiveTab('writing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Auth Handlers
  const handleAdminLoginSuccess = (token: string) => {
    setSession({
      isAuthenticated: true,
      user: { username: 'Jurabek', role: 'Admin', lastLogin: new Date().toISOString() },
    });
    setShowAdminLogin(false);
    setIsAdminMode(true);
    localStorage.setItem('jurabek_in_admin', 'true');
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    refreshActivityLogs();
  };

  const handleLogout = async () => {
    await api.logout();
    setSession({ isAuthenticated: false, user: null });
    setIsAdminMode(false);
    setShowAdminLogin(false);
    localStorage.removeItem('jurabek_in_admin');
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      window.history.pushState({}, '', '/');
    }
    toast('Logged out', 'Admin session ended', 'info');
  };

  // Admin Post Handlers
  const handleSavePost = async (postData: Partial<Post>): Promise<Post> => {
    let saved: Post;
    if (postData.id) {
      saved = await api.updatePost(postData.id, postData);
    } else {
      saved = await api.createPost(postData);
    }
    // Refresh local posts list
    const updatedList = await api.getPosts();
    setPosts(updatedList);
    refreshActivityLogs();
    return saved;
  };

  const handleDeletePost = async (postId: string) => {
    await api.deletePost(postId);
    const updatedList = await api.getPosts();
    setPosts(updatedList);
    refreshActivityLogs();
  };

  const handleCreateQuickDraft = async (title: string, content: string) => {
    await api.createPost({
      title,
      content,
      status: 'draft',
      category: 'Essays',
    });
    const updatedList = await api.getPosts();
    setPosts(updatedList);
    refreshActivityLogs();
  };

  // Admin Media Handlers
  const handleAddMedia = async (media: Partial<MediaItem>): Promise<MediaItem> => {
    const newMedia = await api.addMedia(media);
    const updatedMedia = await api.getMedia();
    setMediaItems(updatedMedia);
    refreshActivityLogs();
    return newMedia;
  };

  const handleDeleteMedia = async (id: string) => {
    await api.deleteMedia(id);
    const updatedMedia = await api.getMedia();
    setMediaItems(updatedMedia);
  };

  // Admin Category Handlers
  const handleCreateCategory = async (cat: { name: string; description?: string }) => {
    await api.createCategory(cat);
    const updatedCats = await api.getCategories();
    setCategories(updatedCats);
    refreshActivityLogs();
  };

  const handleUpdateCategory = async (id: string, cat: { name: string; description?: string }) => {
    await api.updateCategory(id, cat);
    const updatedCats = await api.getCategories();
    setCategories(updatedCats);
    const updatedPosts = await api.getPosts();
    setPosts(updatedPosts);
    refreshActivityLogs();
  };

  const handleDeleteCategory = async (id: string) => {
    await api.deleteCategory(id);
    const updatedCats = await api.getCategories();
    setCategories(updatedCats);
    const updatedPosts = await api.getPosts();
    setPosts(updatedPosts);
    refreshActivityLogs();
  };

  // Admin Settings Handlers
  const handleSaveSettings = async (newSettings: Partial<SiteSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
    refreshActivityLogs();
  };

  const handleChangePassword = async (currPass: string, newPass: string) => {
    await api.changePassword(currPass, newPass);
  };

  // Render Admin Studio Interface
  if (isAdminMode && session.isAuthenticated) {
    return (
      <>
        <SEOHead title="Boshqaruv Paneli — Admin" noindex settings={settings} />
        <AdminLayout
          currentTab={adminTab}
          setCurrentTab={setAdminTab}
          onExitAdmin={() => {
            setIsAdminMode(false);
            if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
              window.history.pushState({}, '', '/');
            }
          }}
          onLogout={handleLogout}
          onNewPost={() => {
            setEditingPost(null);
            setAdminTab('editor');
          }}
        >
        {adminTab === 'dashboard' && (
          <AdminDashboardView
            posts={posts}
            activityLogs={activityLogs}
            mediaItems={mediaItems}
            onNewPost={() => {
              setEditingPost(null);
              setAdminTab('editor');
            }}
            onEditPost={(post) => {
              setEditingPost(post);
              setAdminTab('editor');
            }}
            onViewPosts={(status) => {
              setInitialPostStatusFilter(status || 'all');
              setAdminTab('posts');
            }}
            onViewMedia={() => setAdminTab('media')}
            onCreateQuickDraft={handleCreateQuickDraft}
          />
        )}

        {adminTab === 'posts' && (
          <AdminPostsListView
            posts={posts}
            categories={categories}
            initialStatusFilter={initialPostStatusFilter}
            onNewPost={() => {
              setEditingPost(null);
              setAdminTab('editor');
            }}
            onEditPost={(post) => {
              setEditingPost(post);
              setAdminTab('editor');
            }}
            onDeletePost={handleDeletePost}
            onPreviewPost={(post) => {
              setSelectedPost(post);
              setActiveTab('article');
              setIsAdminMode(false);
            }}
          />
        )}

        {adminTab === 'categories' && (
          <AdminCategoriesView
            categories={categories}
            posts={posts}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {adminTab === 'editor' && (
          <AdminPostEditorView
            post={editingPost}
            categories={categories}
            tagsList={tags}
            mediaItems={mediaItems}
            onSave={handleSavePost}
            onCancel={() => setAdminTab('posts')}
            onOpenMediaLibrary={() => setAdminTab('media')}
          />
        )}

        {adminTab === 'media' && (
          <AdminMediaLibraryView
            mediaItems={mediaItems}
            onAddMedia={handleAddMedia}
            onDeleteMedia={handleDeleteMedia}
          />
        )}

        {adminTab === 'settings' && (
          <AdminSettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onChangePassword={handleChangePassword}
          />
        )}
      </AdminLayout>
      </>
    );
  }

  // Render Admin Login Modal / View
  if (showAdminLogin) {
    return (
      <>
        <SEOHead title="Tizimga kirish — Admin" noindex settings={settings} />
        <AdminLoginView
          onLoginSuccess={handleAdminLoginSuccess}
          onCancel={() => {
            setShowAdminLogin(false);
            if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
              window.history.pushState({}, '', '/');
            }
          }}
          apiLogin={api.login}
        />
      </>
    );
  }

  // Render Public Reader Website
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAF8] dark:bg-[#121211] text-[#111111] dark:text-[#ECECEC]">
      {activeTab === 'home' && (
        <SEOHead
          title="Bosh sahifa"
          description={settings.description}
          settings={settings}
          type="website"
        />
      )}
      {activeTab === 'writing' && (
        <SEOHead
          title={selectedCategory ? `${selectedCategory} — Maqolalar` : 'Maqolalar va Insholar'}
          description="Marketing, Sun'iy Intellekt va vebsaytlar haqidagi barcha maqolalar va insholar to'plami."
          settings={settings}
          type="website"
        />
      )}
      {activeTab === 'article' && selectedPost && (
        <SEOHead
          title={selectedPost.title}
          description={selectedPost.excerpt}
          image={selectedPost.coverImage}
          post={selectedPost}
          settings={settings}
          type="article"
        />
      )}
      {activeTab === 'contact' && (
        <SEOHead
          title="Bog'lanish"
          description="Savollar va takliflar uchun elektron pochta orqali bog'laning."
          settings={settings}
          type="website"
        />
      )}

      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        siteTitle={settings.title}
        onOpenSearch={() => setSearchModalOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            posts={posts}
            settings={settings}
            onSelectPost={handleSelectPost}
            onSelectCategory={handleSelectCategory}
            onViewAllPosts={() => {
              setSelectedCategory(null);
              setActiveTab('writing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'writing' && (
          <BlogIndexView
            posts={posts}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectPost={handleSelectPost}
          />
        )}

        {activeTab === 'article' && selectedPost && (
          <ArticleView
            post={selectedPost}
            allPosts={posts}
            settings={settings}
            onSelectPost={handleSelectPost}
            onBackToWriting={() => setActiveTab('writing')}
          />
        )}

        {activeTab === 'contact' && (
          <ContactView
            settings={settings}
          />
        )}
      </main>

      <Footer
        siteTitle={settings.title}
        authorName={settings.authorName}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Global Modals */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        posts={posts}
        onSelectPost={handleSelectPost}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <JurabekApp />
    </ToastProvider>
  );
}
