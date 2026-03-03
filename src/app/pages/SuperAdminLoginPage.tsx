import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '/utils/supabase/client';
import { superAdminApi } from '../services/api';

interface SuperAdminLoginPageProps {
  onLogin: (token: string) => void;
}

export default function SuperAdminLoginPage({ onLogin }: SuperAdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.session?.access_token) throw new Error('No session');
      const token = data.session.access_token;
      const isAuthorized = await superAdminApi.verifySuperAdmin(token);
      if (!isAuthorized) {
        await supabase.auth.signOut();
        toast.error('Not authorized for Super Admin. Use your Super Admin account.');
        return;
      }
      onLogin(token);
      toast.success('Login successful!');
      navigate('/super-admin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9faf3] to-stone-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#101010] rounded-full mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-[#101010] mb-2">Super Admin</h1>
          <p className="text-[#52525c]">Manage tenants and restaurants</p>
        </div>

        <div className="bg-white rounded-[10px] border border-[#101010] shadow-[0_6px_0_0_#101010] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#52525c] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#52525c] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#52525c] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#101010] text-[#cfff5e] py-3 rounded-lg font-medium hover:bg-[#cfff5e] hover:text-[#101010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
