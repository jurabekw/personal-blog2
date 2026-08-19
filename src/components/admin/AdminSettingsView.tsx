import React, { useState, useRef } from 'react';
import { SiteSettings } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { Settings, Save, Lock, Download, RotateCcw, ShieldCheck, Upload, User, Trash2, Search, Globe, Rss, ExternalLink, CheckCircle2, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface AdminSettingsViewProps {
  settings: SiteSettings;
  onSaveSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  onChangePassword: (currentPass: string, newPass: string) => Promise<void>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  onSaveSettings,
  onChangePassword,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(settings.title || 'Jurabek');
  const [description, setDescription] = useState(settings.description || '');
  const [authorName, setAuthorName] = useState(settings.authorName || '');
  const [authorBio, setAuthorBio] = useState(settings.authorBio || '');
  const [authorAvatar, setAuthorAvatar] = useState(settings.authorAvatar || '');
  const [email, setEmail] = useState(settings.email || '');
  const [twitter, setTwitter] = useState(settings.twitter || '');
  const [github, setGithub] = useState(settings.github || '');
  const [linkedin, setLinkedin] = useState(settings.linkedin || '');
  const [showReadingTime, setShowReadingTime] = useState(settings.showReadingTime ?? true);
  const [showProgress, setShowProgress] = useState(settings.showProgress ?? true);

  const [isSaving, setIsSaving] = useState(false);

  // Database diagnostic status
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; provider: string; message: string } | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  React.useEffect(() => {
    checkDb();
  }, []);

  const checkDb = async () => {
    setIsCheckingDb(true);
    try {
      const st = await api.getDbStatus();
      setDbStatus(st);
    } catch {
      setDbStatus({ connected: false, provider: 'local_file', message: 'Failed to connect to database API' });
    } finally {
      setIsCheckingDb(false);
    }
  };

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Invalid file type', 'Please select an image file (PNG, JPG, WEBP, etc.)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('File too large', 'Please select an image smaller than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAuthorAvatar(result);
        toast('Avatar selected', 'Avatar image loaded. Click "Save Settings" to persist changes.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        title,
        description,
        authorName,
        authorBio,
        authorAvatar,
        email,
        twitter,
        github,
        linkedin,
        showReadingTime,
        showProgress,
      });
      toast('Settings saved', 'Site metadata and configurations updated', 'success');
    } catch (err: any) {
      toast('Failed to save settings', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast('Fields missing', 'Please enter both current and new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password too short', 'New password must be at least 6 characters', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      toast('Password updated', 'Admin password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast('Password error', err.message, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleExportData = () => {
    fetch('/api/posts')
      .then((res) => res.json())
      .then((data) => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `jurabek-backup-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast('Backup exported', 'Exported JSON backup file', 'success');
      });
  };

  return (
    <div className="flex flex-col gap-8 max-w-[800px]">
      {/* Header */}
      <div className="border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-4">
        <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#ECECEC]">Site Settings & Security</h1>
        <p className="text-[14px] text-[#666666] dark:text-[#999999]">
          Manage publication metadata, author details, and access control.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmitSettings} className="flex flex-col gap-6">
        <Card elevation="sm" className="p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
            General Metadata
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Publication Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Author Name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>

          <Textarea
            label="Site Subtitle / Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Textarea
            label="Author Biography"
            rows={3}
            value={authorBio}
            onChange={(e) => setAuthorBio(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
              Author Avatar
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-[10px] bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28]">
              {/* Avatar Preview */}
              <div className="relative shrink-0">
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={authorName || 'Author avatar'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-[#1A1A18] shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#E8E8E8] dark:bg-[#333330] flex items-center justify-center text-[#666666] dark:text-[#999999] border-2 border-white dark:border-[#1A1A18]">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Upload button and URL field */}
              <div className="flex-1 flex flex-col gap-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <Upload className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                    <span>Upload Image File</span>
                  </Button>

                  {authorAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAuthorAvatar('')}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>

                <Input
                  placeholder="Or paste image URL (e.g., https://...)"
                  value={authorAvatar}
                  onChange={(e) => setAuthorAvatar(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card elevation="sm" className="p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
            Contact & Social Profiles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Public Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Twitter / X URL" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
            <Input label="GitHub Profile URL" value={github} onChange={(e) => setGithub(e.target.value)} />
            <Input label="LinkedIn Profile URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          </div>
        </Card>

        <Card elevation="sm" className="p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC] border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
            Reading Preferences
          </h3>

          <Switch
            label="Show Reading Time"
            description="Display estimated reading minutes on articles"
            checked={showReadingTime}
            onChange={setShowReadingTime}
          />

          <Switch
            label="Show Scroll Progress Bar"
            description="Display thin top progress indicator during article reading"
            checked={showProgress}
            onChange={setShowProgress}
          />
        </Card>

        {/* Technical SEO & Search Engine Indexing Status */}
        <Card elevation="sm" className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-[#1E3E62] dark:text-blue-400" />
              <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC]">
                Search Engine Optimization & Indexing
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SEO Active</span>
            </span>
          </div>

          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            The platform automatically generates dynamic Meta Tags, OpenGraph Cards, JSON-LD Structured Data, XML Sitemaps, and RSS feeds for maximum search visibility on Google and social networks.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[8px] bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] hover:border-[#1E3E62] dark:hover:border-blue-400 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
                <Globe className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                <span>XML Sitemap</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#888888] group-hover:text-[#111111] dark:group-hover:text-white" />
            </a>

            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[8px] bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] hover:border-[#1E3E62] dark:hover:border-blue-400 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
                <Search className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                <span>robots.txt</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#888888] group-hover:text-[#111111] dark:group-hover:text-white" />
            </a>

            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-[8px] bg-[#F4F4F2] dark:bg-[#262624] border border-[#E8E8E8] dark:border-[#2A2A28] hover:border-[#1E3E62] dark:hover:border-blue-400 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#111111] dark:text-[#ECECEC]">
                <Rss className="w-4 h-4 text-[#1E3E62] dark:text-blue-400" />
                <span>RSS Feed</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#888888] group-hover:text-[#111111] dark:group-hover:text-white" />
            </a>
          </div>
        </Card>

        <Button type="submit" variant="primary" size="lg" disabled={isSaving} className="self-start gap-2">
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </Button>
      </form>

      {/* Neon Database Status Section */}
      <Card elevation="sm" className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#1E3E62] dark:text-blue-400" />
            <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC]">Database Connection (Neon PostgreSQL)</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkDb}
            disabled={isCheckingDb}
            className="gap-1.5 text-[12px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
            <span>Check Connection</span>
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {dbStatus?.connected ? (
            <div className="p-4 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[14px] text-emerald-900 dark:text-emerald-200">
                  Neon PostgreSQL Connected & Active
                </span>
                <span className="text-[13px] text-emerald-700 dark:text-emerald-400">
                  {dbStatus.message}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-[8px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[14px] text-amber-900 dark:text-amber-200">
                  Operating in Local Storage Fallback
                </span>
                <span className="text-[13px] text-amber-700 dark:text-amber-400">
                  {dbStatus?.message || 'To persist data permanently across all Vercel serverless deployments, add your DATABASE_URL (Neon pooled connection string) in your Vercel Project Settings > Environment Variables.'}
                </span>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-[8px] bg-[#F4F4F2] dark:bg-[#262624] text-[13px] text-[#666666] dark:text-[#999999] flex flex-col gap-1.5 font-mono">
            <span className="font-sans font-semibold text-[#111111] dark:text-[#ECECEC] text-[13px]">
              Vercel Environment Variable:
            </span>
            <code className="text-[12px] text-[#1E3E62] dark:text-blue-300 break-all select-all">
              DATABASE_URL=postgresql://user:pass@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
            </code>
          </div>
        </div>
      </Card>

      {/* Security Section */}
      <Card elevation="sm" className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[#E8E8E8] dark:border-[#2A2A28] pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC]">Admin Security Password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={isChangingPass} className="self-start gap-2">
            <Lock className="w-4 h-4" />
            <span>Update Password</span>
          </Button>
        </form>
      </Card>

      {/* Backup & Export Section */}
      <Card elevation="sm" className="p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-[18px] text-[#111111] dark:text-[#ECECEC]">Data Backup & Export</h3>
        <p className="text-[14px] text-[#666666] dark:text-[#999999]">
          Download a full JSON backup copy of all articles, categories, and site settings.
        </p>
        <Button variant="outline" onClick={handleExportData} className="self-start gap-2">
          <Download className="w-4 h-4" />
          <span>Export JSON Backup</span>
        </Button>
      </Card>
    </div>
  );
};
