import { useState } from 'react';
import { publicLoyaltyApi } from '@/app/services/api';
import type { CheckInResult, PublicLoyaltyProgram } from '@/app/types/loyalty';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/app/components/ui/drawer';

const strings = {
  en: {
    collect: 'Collect {goal} visits to earn',
    phonePlaceholder: 'Enter your phone number',
    checkIn: 'Check In',
    checkingIn: 'Checking in...',
    welcome: 'Welcome! Visit logged. Come back tomorrow to keep filling your card!',
    visitLogged: 'Visit logged! You\'re at {current}/{goal} visits',
    alreadyToday: 'You already checked in today! Come back tomorrow for your next stamp.',
    outOf: '{current} out of {goal} visits',
    rewardEarned: 'You\'ve earned:',
    showToWaiter: 'Show this screen to your waiter to claim your reward',
    unlockedOn: 'Unlocked on',
    invalidPhone: 'Please enter a valid phone number.',
    errorGeneric: 'Something went wrong. Please try again.',
    useAnother: 'Use a different number',
  },
  ar: {
    collect: 'اجمع {goal} زيارة للحصول على',
    phonePlaceholder: 'أدخل رقم هاتفك',
    checkIn: 'تسجيل الحضور',
    checkingIn: 'جاري التسجيل...',
    welcome: 'أهلاً بك! تم تسجيل زيارتك. عُد غداً لتكمل بطاقتك!',
    visitLogged: 'تم تسجيل الزيارة! أنت في {current}/{goal} زيارة',
    alreadyToday: 'لقد سجلت حضورك اليوم! عُد غداً للطابع التالي.',
    outOf: '{current} من {goal} زيارة',
    rewardEarned: 'حصلت على:',
    showToWaiter: 'أظهر هذه الشاشة للنادل للحصول على مكافأتك',
    unlockedOn: 'تم الفتح في',
    invalidPhone: 'أدخل رقم هاتف صحيح.',
    errorGeneric: 'حدث خطأ. حاول مرة أخرى.',
    useAnother: 'استخدم رقم مختلف',
  },
};

function replaceVars(str: string, vars: Record<string, string | number>): string {
  let s = str;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

function formatTimestamp(iso: string, lang: 'en' | 'ar'): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' · ' + d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

interface LoyaltyBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: PublicLoyaltyProgram;
  tenantSlug: string;
  language: 'ar' | 'en';
  brandColor: string;
}

export function LoyaltyBottomSheet({
  open,
  onOpenChange,
  program,
  tenantSlug,
  language,
  brandColor,
}: LoyaltyBottomSheetProps) {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [message, setMessage] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState('');
  const [showStamp, setShowStamp] = useState(false);

  const s = strings[language];
  const isRtl = language === 'ar';

  const handleCheckIn = async () => {
    const normalized = phone.replace(/[^\d+]/g, '');
    if (normalized.length < 6) {
      setError(s.invalidPhone);
      return;
    }
    setError('');
    setMessage('');
    setIsCheckingIn(true);
    try {
      const res = await publicLoyaltyApi.checkIn(tenantSlug, phone);
      setResult(res);
      if (res.rewardUnlocked) {
        setTimeout(() => setShowStamp(true), 100);
      } else if (res.alreadyCheckedInToday) {
        setMessage(s.alreadyToday);
      } else if (res.isNewCustomer) {
        setMessage(s.welcome);
      } else {
        setMessage(replaceVars(s.visitLogged, { current: res.visitCount, goal: res.visitsNeeded }));
      }
    } catch {
      setError(s.errorGeneric);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPhone('');
    setMessage('');
    setError('');
    setShowStamp(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !result?.rewardUnlocked) {
      handleReset();
    }
    onOpenChange(next);
  };

  const progressPct = result ? Math.min(100, Math.round((result.visitCount / result.visitsNeeded) * 100)) : 0;

  // Reward unlocked view
  if (result?.rewardUnlocked && result.stampSvg) {
    const rewardDescription = (result.rewardDescription || '').trim() || program.rewardDescription;
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[92vh] bg-white rounded-t-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="overflow-y-auto px-6 pt-1 pb-8">
            <div className="text-center space-y-6">
              {/* Stamp */}
              <div className={`transition-all duration-700 ease-out ${showStamp ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                <div
                  className="w-48 h-48 mx-auto drop-shadow-lg flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: result.stampSvg }}
                />
              </div>

              {/* Timestamp */}
              {result.rewardUnlockedAt && (
                <p className="text-sm text-[#52525c] tracking-tight">
                  {s.unlockedOn} {formatTimestamp(result.rewardUnlockedAt, language)}
                </p>
              )}

              {/* Reward card - light pink/red tint, full description */}
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: `${brandColor}33`, backgroundColor: `${brandColor}14` }}
              >
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: brandColor }}>
                  🎁 {s.rewardEarned}
                </p>
                <p className="font-bold text-xl text-[#18181b] tracking-tight break-words">
                  {rewardDescription}
                </p>
              </div>

              {/* Show to waiter CTA - same light tint, darker text */}
              <div
                className="rounded-2xl p-5 text-center"
                style={{ backgroundColor: `${brandColor}1A` }}
              >
                <p className="font-bold text-sm tracking-tight break-words" style={{ color: brandColor }}>
                  {s.showToWaiter}
                </p>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
        <DrawerHeader className="text-center pb-0 pt-2">
          <DrawerTitle className="font-semibold text-xl text-[#18181b] uppercase tracking-tight">
            {program.name}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-[#52525c] tracking-tight">
            {replaceVars(s.collect, { goal: program.visitsNeeded })}
          </DrawerDescription>
          <p className="font-bold text-xs uppercase tracking-wider mt-1" style={{ color: brandColor }}>
            {program.rewardDescription}
          </p>
        </DrawerHeader>

        <div className="overflow-y-auto px-6 pb-6 pt-4">
          {/* Phone input & check-in */}
          {!result && (
            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(''); }}
                placeholder={s.phonePlaceholder}
                className="w-full border border-gray-200 rounded-full px-6 py-3 text-center text-base focus:ring-2 focus:border-transparent outline-none transition-all"
                style={{ '--tw-ring-color': `${brandColor}66` } as React.CSSProperties}
                onFocus={(e) => { e.target.style.borderColor = brandColor; }}
                onBlur={(e) => { e.target.style.borderColor = ''; }}
                dir="ltr"
              />
              {error && <p className="text-red-500 text-xs text-center font-bold uppercase tracking-wider">{error}</p>}
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn || !phone.trim()}
                className="w-full py-3 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
                style={{ backgroundColor: brandColor }}
              >
                {isCheckingIn ? s.checkingIn : s.checkIn}
              </button>
            </div>
          )}

          {/* Progress display */}
          {result && !result.rewardUnlocked && (
            <div className="space-y-5">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPct}%`, backgroundColor: brandColor }}
                  />
                </div>
                <p className="text-center text-xs font-bold uppercase tracking-wider text-[#3f3f46]">
                  {replaceVars(s.outOf, { current: result.visitCount, goal: result.visitsNeeded })}
                </p>
              </div>

              {/* Visit dots */}
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: result.visitsNeeded }, (_, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      i < result.visitCount
                        ? 'text-white shadow-sm'
                        : 'bg-[#f4f4f5] text-[#3f3f46] border border-gray-200'
                    }`}
                    style={i < result.visitCount ? { backgroundColor: brandColor } : undefined}
                  >
                    {i < result.visitCount ? '✓' : i + 1}
                  </div>
                ))}
              </div>

              {/* Message */}
              {message && (
                <div className={`text-center p-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
                  result.alreadyCheckedInToday
                    ? 'bg-[#f4f4f5] text-[#3f3f46]'
                    : ''
                }`} style={!result.alreadyCheckedInToday ? { backgroundColor: `${brandColor}1A`, color: brandColor } : undefined}>
                  {message}
                </div>
              )}

              {/* Use different number */}
              <button
                onClick={handleReset}
                className="w-full text-center text-xs text-[#52525c] hover:text-[#18181b] tracking-tight pt-1"
              >
                {s.useAnother}
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
