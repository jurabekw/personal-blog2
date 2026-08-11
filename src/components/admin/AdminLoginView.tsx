import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Lock, Feather, ShieldCheck } from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: (token: string) => void;
  onCancel: () => void;
  apiLogin: (pass: string) => Promise<any>;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess, onCancel, apiLogin }) => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the admin password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiLogin(password);
      toast('Welcome back', 'Admin session authenticated successfully', 'success');
      onLoginSuccess(res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid admin password');
      toast('Authentication failed', err.message || 'Invalid password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-16 px-4 flex flex-col items-center">
      <Card elevation="md" className="w-full p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-[12px] bg-[#1E3E62] dark:bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Feather className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-[24px] font-bold text-[#111111] dark:text-[#ECECEC] mt-2">
            Jurabek Studio Login
          </h2>
          <p className="text-[14px] text-[#666666] dark:text-[#999999]">
            Secure publishing control panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Admin Security Password"
            type="password"
            autoFocus
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel} className="w-1/3">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading} className="w-2/3 gap-2">
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Sign In'}</span>
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#999999] border-t border-[#E8E8E8] dark:border-[#2A2A28] pt-4">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Protected Session Token Storage</span>
        </div>
      </Card>
    </div>
  );
};
