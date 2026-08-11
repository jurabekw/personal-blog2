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

async function handleResponse<T>(res: Response, defaultError = 'Request failed'): Promise<T> {
  if (!res.ok) {
    let message = defaultError;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const err = await res.json();
        message = err.error || err.message || defaultError;
      } else {
        const text = await res.text();
        if (text && text.length > 0 && text.length < 200) {
          message = text;
        } else {
          message = `Server error (${res.status}). Please try again.`;
        }
      }
    } catch {
      message = `Server error (${res.status}). Please try again.`;
    }
    throw new Error(message);
  }
  return res.json();
}

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
    return handleResponse<Post[]>(res, 'Failed to fetch posts');
  },

  async getPostBySlugOrId(idOrSlug: string, incrementView = false): Promise<Post> {
    const res = await fetch(`/api/posts/${idOrSlug}?incrementView=${incrementView}`);
    return handleResponse<Post>(res, 'Post not found');
  },

  async createPost(post: Partial<Post>): Promise<Post> {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(post),
    });
    return handleResponse<Post>(res, 'Failed to create post');
  },

  async updatePost(id: string, post: Partial<Post>): Promise<Post> {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(post),
    });
    return handleResponse<Post>(res, 'Failed to update post');
  },

  async deletePost(id: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    await handleResponse<{ success: boolean }>(res, 'Failed to delete post');
  },

  // Categories & Tags
  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    return handleResponse<Category[]>(res, 'Failed to fetch categories');
  },

  async createCategory(category: { name: string; description?: string }): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(category),
    });
    return handleResponse<Category>(res, 'Failed to create category');
  },

  async updateCategory(id: string, category: { name: string; description?: string }): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(category),
    });
    return handleResponse<Category>(res, 'Failed to update category');
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    await handleResponse<{ success: boolean }>(res, 'Failed to delete category');
  },

  async getTags(): Promise<Tag[]> {
    const res = await fetch('/api/tags');
    return handleResponse<Tag[]>(res, 'Failed to fetch tags');
  },

  // Media
  async getMedia(): Promise<MediaItem[]> {
    const res = await fetch('/api/media');
    return handleResponse<MediaItem[]>(res, 'Failed to fetch media');
  },

  async addMedia(media: Partial<MediaItem>): Promise<MediaItem> {
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(media),
    });
    return handleResponse<MediaItem>(res, 'Failed to add media');
  },

  async deleteMedia(id: string): Promise<void> {
    const res = await fetch(`/api/media/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    await handleResponse<{ success: boolean }>(res, 'Failed to delete media');
  },

  // Settings
  async getSettings(): Promise<SiteSettings> {
    const res = await fetch('/api/settings');
    return handleResponse<SiteSettings>(res, 'Failed to fetch settings');
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(settings),
    });
    return handleResponse<SiteSettings>(res, 'Failed to update settings');
  },

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await fetch('/api/activity', {
      headers: getHeaders(true),
    });
    return handleResponse<ActivityLog[]>(res, 'Failed to fetch activity logs');
  },

  // Auth
  async login(password: string): Promise<{ token: string; user: { username: string; role: string; lastLogin: string } }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await handleResponse<{ token: string; user: { username: string; role: string; lastLogin: string } }>(res, 'Invalid credentials');
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
      return await res.json();
    } catch {
      return { isAuthenticated: false, user: null };
    }
  },

  async logout(): Promise<void> {
    const token = getAuthToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore logout network errors
      }
      localStorage.removeItem('jurabek_admin_token');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    await handleResponse<{ success: boolean; message: string }>(res, 'Failed to change password');
  }
};

