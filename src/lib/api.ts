import { Post, Category, Tag, MediaItem, SiteSettings, ActivityLog, UserSession } from '../types';

const getAuthToken = (): string | null => {
  return localStorage.getItem('jurabek_admin_token');
};

const getHeaders = (isProtected = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isProtected) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const api = {
  // Posts
  async getPosts(params?: { status?: string; category?: string; tag?: string; search?: string; featured?: boolean }): Promise<Post[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.tag) query.append('tag', params.tag);
    if (params?.search) query.append('search', params.search);
    if (params?.featured) query.append('featured', 'true');

    const res = await fetch(`/api/posts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  },

  async getPostBySlugOrId(idOrSlug: string, incrementView = false): Promise<Post> {
    const res = await fetch(`/api/posts/${idOrSlug}?incrementView=${incrementView}`);
    if (!res.ok) throw new Error('Post not found');
    return res.json();
  },

  async createPost(post: Partial<Post>): Promise<Post> {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(post),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create post');
    }
    return res.json();
  },

  async updatePost(id: string, post: Partial<Post>): Promise<Post> {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(post),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update post');
    }
    return res.json();
  },

  async deletePost(id: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    if (!res.ok) throw new Error('Failed to delete post');
  },

  // Categories & Tags
  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async createCategory(category: { name: string; description?: string }): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(category),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },

  async updateCategory(id: string, category: { name: string; description?: string }): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(category),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    if (!res.ok) throw new Error('Failed to delete category');
  },

  async getTags(): Promise<Tag[]> {
    const res = await fetch('/api/tags');
    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
  },

  // Media
  async getMedia(): Promise<MediaItem[]> {
    const res = await fetch('/api/media');
    if (!res.ok) throw new Error('Failed to fetch media');
    return res.json();
  },

  async addMedia(media: Partial<MediaItem>): Promise<MediaItem> {
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(media),
    });
    if (!res.ok) throw new Error('Failed to add media');
    return res.json();
  },

  async deleteMedia(id: string): Promise<void> {
    const res = await fetch(`/api/media/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    if (!res.ok) throw new Error('Failed to delete media');
  },

  // Settings
  async getSettings(): Promise<SiteSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await fetch('/api/activity', {
      headers: getHeaders(true),
    });
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json();
  },

  // Auth
  async login(password: string): Promise<{ token: string; user: { username: string; role: string; lastLogin: string } }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid credentials');
    }
    const data = await res.json();
    localStorage.setItem('jurabek_admin_token', data.token);
    return data;
  },

  async checkSession(): Promise<UserSession> {
    const token = getAuthToken();
    if (!token) return { isAuthenticated: false, user: null };

    try {
      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { isAuthenticated: false, user: null };
      return res.json();
    } catch {
      return { isAuthenticated: false, user: null };
    }
  },

  async logout(): Promise<void> {
    const token = getAuthToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem('jurabek_admin_token');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to change password');
    }
  }
};
