import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';
import { supabase } from '/utils/supabase/client';
import { useAuth } from '../context/AuthContext';

export default function UniversalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('من فضلك أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message || 'بيانات الدخول غير صحيحة');
        return;
      }
      const slug = data.user?.user_metadata?.tenant_slug;
      if (slug) {
        login(slug);
        toast.success('تم تسجيل الدخول بنجاح!');
        navigate(`/t/${slug}/admin`);
      } else {
        await supabase.auth.signOut();
        toast.error('هذا الحساب ليس مدير مطعم. جرّب Super Admin إن كنت تدير المنصة.');
        navigate('/super-admin');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const benefitCards = [
    { icon: 'https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/arrow-path.svg', title: 'تحديث الأسعار', text: 'عدل الأسعار لحظياً في كل الفروع بضغطة زرار.' },
    { icon: 'https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/eye.svg', title: 'إدارة النواقص', text: 'الصنف خلص؟ اخفيه فوراً من المنيو بتكة واحدة.' },
    { icon: 'https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/percent-badge.svg', title: 'إدارة العروض', text: 'زل عروض جديدة وكومبوهات في ثواني.' },
    { icon: 'https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/language.svg', title: 'لغتين (عربي/إنجليزي)', text: 'السيستم بيحول بين العربي والإنجليزي بسلاسة.' },
  ];
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % benefitCards.length), 4000);
    return () => clearInterval(t);
  }, [benefitCards.length]);

  const controlContent = (
    <div className="flex flex-col justify-center p-6 lg:p-10 max-w-xl mx-auto w-full">
      <h2 className="text-2xl lg:text-3xl font-bold text-[#101010] mb-2">
        تحكم <span className="text-[#52525c]">كامل</span> وبدون تاخير
      </h2>
      <p className="text-[#52525c] mb-6">وداعاً لانتظار الديزاينر. أنت المتحكم في كل تفصيلة.</p>
      <div className="relative min-h-[160px] w-full overflow-hidden">
        {benefitCards.map((card, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all duration-500 ease-out transform ${
              i === slideIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none'
            }`}
          >
            <div className="bg-white border border-[#101010] rounded-[10px] p-4 shadow-[0_6px_0_0_#101010]">
              <img src={card.icon} alt="" className="w-10 h-10 text-[#52525c] mb-3" />
              <h3 className="font-semibold text-[#101010] mb-1">{card.title}</h3>
              <p className="text-sm text-[#52525c]">{card.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {benefitCards.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setSlideIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === slideIndex ? 'bg-[#101010]' : 'bg-stone-300 hover:bg-stone-400'}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-3 lg:items-stretch" dir="rtl">
      {/* Right column: Form (2/3) */}
      <div className="flex items-center justify-center p-4 lg:p-8 lg:col-span-2 bg-[#fff]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <Link to="/" className="inline-block">
                <Logo height={40} className="text-[#101010]" />
              </Link>
            </div>
            <p className="text-[#52525c]">سجّل الدخول لإدارة مطعمك</p>
          </div>

          <div className="bg-white border border-[#101010] rounded-[10px] shadow-[0_6px_0_0_#101010] p-8">
            <h2 className="text-xl font-semibold text-[#101010] mb-6">تسجيل الدخول</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#52525c] mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="text-stone-400" size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="admin@restaurant.com"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#52525c] mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="text-stone-400" size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-10 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="أدخل كلمة المرور"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 hover:text-[#52525c] transition-colors"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
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
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#52525c]">
            معندكش حساب؟{' '}
            <Link to="/signup" className="text-[#52525c] font-medium hover:underline">
              سجل مطعمك دلوقتي
            </Link>
          </p>
        </div>
      </div>
    </div>

      {/* Left column: Benefits (1/3) */}
      <div className="bg-[#f9faf3] flex items-center border-t lg:border-t-0 lg:border-s border-stone-200 lg:col-span-1">
        {controlContent}
      </div>
    </div>
  );
}
