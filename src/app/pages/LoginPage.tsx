import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';
import { superAdminApi } from '../services/api';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const tenant = tenantSlug ?? 'default';

  useEffect(() => {
    if (!tenant) return;
    superAdminApi.getTenantInfo(tenant).then((info) => {
      setTenantName(info.name ?? null);
    });
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('من فضلك أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin(email, password);
      if (success) {
        toast.success('تم تسجيل الدخول بنجاح!');
        navigate(`/t/${tenant}/admin`);
      } else {
        toast.error('بيانات الدخول غير صحيحة أو مطعم غير صحيح');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9faf3] to-stone-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Logo height={40} className="text-gray-800" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {tenantName ? `${tenantName} - لوحة التحكم` : 'لوحة التحكم'}
          </h1>
          <p className="text-gray-600">سجّل الدخول لإدارة المنيو</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[10px] border border-[#101010] shadow-[0_6px_0_0_#101010] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <button
              type="button"
              className="w-full bg-white text-[#101010] py-3 rounded-lg font-medium border border-stone-300 hover:bg-stone-50 transition-colors flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z" />
                <path fill="#34A853" d="M2.8 11.4c0 1.6.4 3.1 1.2 4.4l3.3-2.6c-.2-.5-.3-1.1-.3-1.8s.1-1.2.3-1.8L4 7C3.2 8.3 2.8 9.8 2.8 11.4Z" />
                <path fill="#FBBC05" d="M12 20.6c2.7 0 4.9-.9 6.5-2.5l-3.2-2.6c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-4l-3.3 2.6c1.6 3.2 4.9 5.6 8.7 5.6Z" />
                <path fill="#4285F4" d="M18.5 18.1c1.9-1.8 2.6-4.4 2.6-6.8 0-.5-.1-.9-.1-1.3H12v3.9h5.5c-.2 1.1-.9 2.7-2.2 3.6l3.2 2.6Z" />
              </svg>
              <span>أو سجل بـ Google</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-[#52525c]">أو</span>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="admin@restaurant.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="أدخل كلمة المرور"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#101010] text-[#cfff5e] py-3 rounded-lg font-medium hover:bg-[#cfff5e] hover:text-[#101010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
