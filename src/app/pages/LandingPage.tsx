import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Building2, Mail, Lock, Eye, EyeOff, Link2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';
import { tenantSignupApi } from '../services/api';
import { trackLandingCtaClick } from '../lib/analytics';

export default function LandingPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackLandingCtaClick({
      ctaName: 'signup_submit',
      ctaLocation: 'signup_form',
      targetPath: '/login',
      language: 'ar',
    });
    if (!name.trim()) {
      toast.error('اسم المطعم مطلوب');
      return;
    }
    if (!normalizedSlug) {
      toast.error('الرابط (Slug) مطلوب');
      return;
    }
    if (normalizedSlug.length < 2) {
      toast.error('الرابط يجب أن يكون حرفين على الأقل');
      return;
    }
    if (!adminEmail.trim()) {
      toast.error('البريد الإلكتروني للمدير مطلوب');
      return;
    }
    if (!adminPassword || adminPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    try {
      setIsLoading(true);
      const result = await tenantSignupApi.signup({
        name: name.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
        slug: normalizedSlug,
      });
      toast.success(`تم إنشاء مطعم "${result.name}". سجّل الدخول باستخدام البريد الإلكتروني وكلمة المرور.`);
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
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
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <Link to="/" className="inline-block">
                <Logo height={40} className="text-[#101010]" />
              </Link>
            </div>
            <p className="text-[#52525c]">أنشئ منيو مطعمك في دقائق</p>
          </div>

          {/* Signup Card */}
          <div className="bg-white border border-[#101010] rounded-[10px] shadow-[0_6px_0_0_#101010] p-8">
            <h2 className="text-xl font-semibold text-[#101010] mb-6">إنشاء حساب مطعم</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
            {/* Restaurant Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#52525c] mb-2">
                اسم المطعم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Building2 className="text-stone-400" size={20} />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="مثال: Burger Republic"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Slug (URL) */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-[#52525c] mb-2">
                الرابط (Slug)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Link2 className="text-stone-400" size={20} />
                </div>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all lowercase"
                  placeholder="my-restaurant"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-xs text-[#52525c]">رابط المنيو: /t/{normalizedSlug || '...'}</p>
            </div>

            {/* Admin Email */}
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-[#52525c] mb-2">
                البريد الإلكتروني للمدير
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="text-stone-400" size={20} />
                </div>
                <input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="admin@restaurant.com"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-[#52525c] mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="text-stone-400" size={20} />
                </div>
                <input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="block w-full pr-10 pl-10 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] outline-none transition-all"
                  placeholder="6 أحرف على الأقل"
                  disabled={isLoading}
                  minLength={6}
                  autoComplete="new-password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#101010] text-[#cfff5e] py-3 rounded-lg font-medium hover:bg-[#cfff5e] hover:text-[#101010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                'إنشاء المطعم'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#52525c]">
            عندك حساب بالفعل؟{' '}
            <Link
              to="/login"
              onClick={() =>
                trackLandingCtaClick({
                  ctaName: 'login_link',
                  ctaLocation: 'signup_form_footer',
                  targetPath: '/login',
                  language: 'ar',
                })
              }
              className="text-[#52525c] font-medium hover:underline"
            >
              تسجيل الدخول
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
