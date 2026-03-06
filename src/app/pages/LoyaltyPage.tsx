import { useState, useEffect } from 'react';
import { useTenant } from '@/app/context/TenantContext';
import { publicLoyaltyApi } from '@/app/services/api';
import type { CheckInResult, PublicLoyaltyProgram } from '@/app/types/loyalty';

const t = {
  en: {
    loading: 'Loading...',
    paused: 'This program is currently paused.',
    notAvailable: 'Loyalty program is not available.',
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
    backToMenu: 'Back to Menu',
  },
  ar: {
    loading: 'جاري التحميل...',
    paused: 'هذا البرنامج متوقف حالياً.',
    notAvailable: 'برنامج الولاء غير متاح.',
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
    backToMenu: 'العودة للقائمة',
  },
};

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

function replaceVars(str: string, vars: Record<string, string | number>): string {
  let s = str;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

export default function LoyaltyPage() {
  const { tenantSlug, basePath } = useTenant();
  const [program, setProgram] = useState<PublicLoyaltyProgram | null | undefined>(undefined);
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState('');
  const [showStamp, setShowStamp] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('ar');

  const s = t[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    publicLoyaltyApi.getProgram(tenantSlug).then((p) => {
      setProgram(p);
      setIsLoading(false);
    }).catch(() => {
      setProgram(null);
      setIsLoading(false);
    });
  }, [tenantSlug]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (program === null || program === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-6 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="text-gray-500 text-lg">{s.notAvailable}</p>
        <a href={`${basePath}/menu`} className="mt-4 text-sm text-blue-600 underline">{s.backToMenu}</a>
      </div>
    );
  }

  if (!program.active) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-6 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-5xl mb-4">⏸️</div>
        <p className="text-gray-600 text-lg font-medium">{s.paused}</p>
        <a href={`${basePath}/menu`} className="mt-4 text-sm text-blue-600 underline">{s.backToMenu}</a>
      </div>
    );
  }

  // Reward unlocked screen
  if (result?.rewardUnlocked && result.stampSvg) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 flex flex-col items-center justify-center px-6 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-sm w-full text-center space-y-6">
          {/* Stamp with animation */}
          <div
            className={`transition-all duration-700 ease-out ${showStamp ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          >
            <div
              className="w-56 h-56 mx-auto drop-shadow-lg"
              dangerouslySetInnerHTML={{ __html: result.stampSvg }}
            />
          </div>

          {/* Timestamp */}
          {result.rewardUnlockedAt && (
            <p className="text-sm text-gray-500">
              {s.unlockedOn}: {formatTimestamp(result.rewardUnlockedAt, lang)}
            </p>
          )}

          {/* Reward */}
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-amber-700 font-medium mb-1">🎁 {s.rewardEarned}</p>
            <p className="text-lg font-bold text-gray-900">{result.rewardDescription}</p>
          </div>

          {/* Show to waiter */}
          <div className="bg-amber-100 rounded-xl p-4">
            <p className="text-amber-800 font-semibold text-sm">{s.showToWaiter}</p>
          </div>

          <a href={`${basePath}/menu`} className="inline-block text-sm text-blue-600 underline">{s.backToMenu}</a>
        </div>
      </div>
    );
  }

  // Progress / check-in screen
  const progressPct = result ? Math.min(100, Math.round((result.visitCount / result.visitsNeeded) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Language toggle */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="text-xs px-3 py-1 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50"
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>

      <div className="max-w-sm mx-auto px-6 pb-12 space-y-6">
        {/* Program header */}
        <div className="text-center space-y-2 pt-4">
          <div className="text-4xl">🎁</div>
          <h1 className="text-xl font-bold text-gray-900">{program.name}</h1>
          <p className="text-sm text-gray-600">
            {replaceVars(s.collect, { goal: program.visitsNeeded })}
          </p>
          <p className="text-base font-semibold text-amber-700">{program.rewardDescription}</p>
        </div>

        {/* Phone input & check-in */}
        {!result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              placeholder={s.phonePlaceholder}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              dir="ltr"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleCheckIn}
              disabled={isCheckingIn || !phone.trim()}
              className="w-full py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
            >
              {isCheckingIn ? s.checkingIn : s.checkIn}
            </button>
          </div>
        )}

        {/* Progress display */}
        {result && !result.rewardUnlocked && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-center text-sm font-medium text-gray-700">
                {replaceVars(s.outOf, { current: result.visitCount, goal: result.visitsNeeded })}
              </p>
            </div>

            {/* Visit dots */}
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: result.visitsNeeded }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < result.visitCount
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {i < result.visitCount ? '✓' : i + 1}
                </div>
              ))}
            </div>

            {/* Message */}
            {message && (
              <div className={`text-center p-3 rounded-xl text-sm ${
                result.alreadyCheckedInToday
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {message}
              </div>
            )}

            {/* Check in again (different number) */}
            <button
              onClick={() => { setResult(null); setPhone(''); setMessage(''); }}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 pt-2"
            >
              {lang === 'ar' ? 'استخدم رقم مختلف' : 'Use a different number'}
            </button>
          </div>
        )}

        <div className="text-center">
          <a href={`${basePath}/menu`} className="text-sm text-gray-400 hover:text-gray-600 underline">{s.backToMenu}</a>
        </div>
      </div>
    </div>
  );
}
