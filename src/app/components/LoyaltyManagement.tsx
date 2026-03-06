import { useEffect, useState } from 'react';
import { Gift, Users, CalendarCheck, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { loyaltyApi } from '@/app/services/api';
import { useAdminLanguage } from '@/app/context/AdminLanguageContext';
import type { LoyaltyProgram, LoyaltyStats } from '@/app/types/loyalty';

export function LoyaltyManagement() {
  const { t, lang } = useAdminLanguage();
  const isRtl = lang === 'ar';

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [visitsNeeded, setVisitsNeeded] = useState(5);
  const [active, setActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const [prog, st] = await Promise.allSettled([
          loyaltyApi.getProgram(),
          loyaltyApi.getStats(),
        ]);
        if (cancelled) return;
        if (prog.status === 'fulfilled' && prog.value) {
          setProgram(prog.value);
          setName(prog.value.name);
          setRewardDescription(prog.value.rewardDescription);
          setVisitsNeeded(prog.value.visitsNeeded);
          setActive(prog.value.active);
        }
        if (st.status === 'fulfilled') {
          setStats(st.value);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!rewardDescription.trim()) return;
    try {
      setIsSaving(true);
      const saved = await loyaltyApi.saveProgram({
        name: name.trim(),
        rewardDescription: rewardDescription.trim(),
        visitsNeeded,
        active,
      });
      setProgram(saved);
      toast.success(t('loyalty.savedSuccess'));
      const st = await loyaltyApi.getStats();
      setStats(st);
    } catch {
      toast.error(t('loyalty.savedError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('loyalty.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('loyalty.subtitle')}</p>
      </div>

      {/* Setup Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loyalty.programName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('loyalty.programNamePlaceholder')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loyalty.rewardDescription')}
          </label>
          <input
            type="text"
            value={rewardDescription}
            onChange={(e) => setRewardDescription(e.target.value)}
            placeholder={t('loyalty.rewardDescriptionPlaceholder')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loyalty.visitsNeeded')}
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={visitsNeeded}
            onChange={(e) => setVisitsNeeded(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive(!active)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${active ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${active ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`}
            />
          </button>
          <span className="text-sm text-gray-700">{t('loyalty.activeToggle')}</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !rewardDescription.trim()}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? t('loyalty.saving') : t('loyalty.save')}
        </button>
      </div>

      {/* Stats */}
      {program && stats && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('loyalty.statsTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Users size={20} className="text-blue-600" />}
              label={t('loyalty.totalEnrolled')}
              value={stats.totalEnrolled}
            />
            <StatCard
              icon={<CalendarCheck size={20} className="text-green-600" />}
              label={t('loyalty.visitsThisMonth')}
              value={stats.visitsThisMonth}
            />
            <StatCard
              icon={<Trophy size={20} className="text-amber-600" />}
              label={t('loyalty.rewardsThisMonth')}
              value={stats.rewardsThisMonth}
            />
          </div>
        </div>
      )}

      {/* Stamp Preview */}
      {program?.stampSvg && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('loyalty.stampPreview')}</h3>
          <p className="text-xs text-gray-500 mb-4">{t('loyalty.stampHint')}</p>
          <div className="flex justify-center">
            <div
              className="w-48 h-48"
              dangerouslySetInnerHTML={{ __html: program.stampSvg }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border border-gray-100 rounded-lg p-4 flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
