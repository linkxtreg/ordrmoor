import { useState, useEffect } from 'react';
import { User, CreditCard, Receipt, Download, Settings, ArrowUp } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAdminLanguage } from '../context/AdminLanguageContext';
import { tenantProfileApi, plansApi, type PlanRecord } from '../services/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

function formatJoinDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function SettingsManagement() {
  const { tenantName } = useTenant();
  const { t } = useAdminLanguage();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; email?: string; createdAt?: string } | null>(null);
  const [invoices] = useState<unknown[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [subscription, setSubscription] = useState<{
    planId: string | null;
    subscriptionInterval: 'monthly' | 'annually' | null;
    subscriptionPeriodEnd: string | null;
    plan: PlanRecord | null;
  }>({ planId: null, subscriptionInterval: null, subscriptionPeriodEnd: null, plan: null });
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    tenantProfileApi.getProfile().then((data) => setProfile(data)).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    setPlansError(null);
    setSubscriptionError(null);
    Promise.allSettled([plansApi.getPlans(), plansApi.getSubscription()]).then(([plansResult, subResult]) => {
      if (cancelled) return;
      if (plansResult.status === 'fulfilled') {
        setPlans(plansResult.value);
      } else {
        setPlans([]);
        setPlansError(plansResult.reason instanceof Error ? plansResult.reason.message : 'Failed to load plans');
      }
      if (subResult.status === 'fulfilled') {
        const sub = subResult.value;
        setSubscription({
          planId: sub.planId ?? null,
          subscriptionInterval: sub.subscriptionInterval ?? null,
          subscriptionPeriodEnd: sub.subscriptionPeriodEnd ?? null,
          plan: sub.plan ?? null,
        });
      } else {
        setSubscriptionError(subResult.reason instanceof Error ? subResult.reason.message : 'Failed to load subscription');
      }
      setPlansLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t('settings.title')}</h2>
      </div>

      {/* 1. Profile & Account */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <User size={20} className="text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">{t('settings.tabProfile')}</h3>
        </div>
        <div className="p-6">
          <dl className="grid gap-4 sm:grid-cols-1">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">
                {t('settings.profileName')}
              </dt>
              <dd className="text-sm font-medium text-gray-900">{(profile?.name ?? tenantName) || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">
                {t('settings.profileEmail')}
              </dt>
              <dd className="text-sm text-gray-700">{profile?.email?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">
                {t('settings.profileJoinDate')}
              </dt>
              <dd className="text-sm text-gray-700">{formatJoinDate(profile?.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 2. Subscription */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <CreditCard size={20} className="text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">{t('settings.tabSubscription')}</h3>
        </div>
        <div className="p-6 space-y-6">
          {plansLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : (plansError || subscriptionError) && plans.length === 0 && !subscription.plan ? (
            <div className="space-y-3">
              {plansError && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  Plans: {plansError}
                </p>
              )}
              {subscriptionError && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  Subscription: {subscriptionError}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Check that the app is using the correct API URL and that the Edge Function is deployed. From localhost, ensure the Supabase project allows requests from your origin.
              </p>
            </div>
          ) : plans.length === 0 && !subscription.plan ? (
            <p className="text-sm text-gray-500">
              No plans available yet. Plans are created and managed by your administrator. If you are the admin, create and activate plans in the Super Admin dashboard, then assign a plan to this tenant.
            </p>
          ) : (
            <>
              {(plansError || subscriptionError) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {plansError && <>Plans: {plansError}</>}
                  {plansError && subscriptionError && ' • '}
                  {subscriptionError && <>Subscription: {subscriptionError}</>}
                </p>
              )}
              {!subscription.plan && !subscription.planId && plans.length > 0 && (
                <p className="text-sm text-gray-500">You don’t have an active plan. Choose one below.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const currentPlan = subscription.plan ?? (subscription.planId ? plans.find((p) => p.id === subscription.planId) : null);
                  const plansToShow =
                    currentPlan == null
                      ? [...plans].sort((a, b) => a.tier - b.tier)
                      : [...plans]
                          .filter((p) => p.id === subscription.planId || p.tier > currentPlan.tier)
                          .sort((a, b) => a.tier - b.tier);
                  return plansToShow.map((plan) => {
                    const isCurrent = plan.id === subscription.planId;
                    const displayPlan = isCurrent && subscription.plan ? subscription.plan : plan;
                    const isHigher = currentPlan != null && plan.tier > currentPlan.tier;
                    const status = isCurrent ? t('settings.subscriptionCurrentPlan') : isHigher ? t('settings.subscriptionStatusUpgradeAvailable') : null;
                    const ctaType = isCurrent ? 'manage' : 'upgrade';
                    const tenantInterval = isCurrent ? subscription.subscriptionInterval : null;
                    const intervalLabel = (tenantInterval ?? displayPlan.interval) === 'annually' ? t('settings.subscriptionIntervalAnnually') : t('settings.subscriptionIntervalMonthly');
                    const monthly = displayPlan.priceMonthly ?? displayPlan.price;
                    const annual = displayPlan.priceAnnual ?? displayPlan.price * 12;
                    const priceLabel = monthly === 0 && annual === 0
                      ? t('settings.subscriptionFree')
                      : isCurrent && tenantInterval
                        ? tenantInterval === 'annually'
                          ? `${displayPlan.currency === 'EGP' ? 'EGP ' : '$'}${annual} / ${t('settings.subscriptionIntervalAnnually')}`
                          : `${displayPlan.currency === 'EGP' ? 'EGP ' : '$'}${monthly} / ${t('settings.subscriptionIntervalMonthly')}`
                        : `${displayPlan.currency === 'EGP' ? 'EGP ' : '$'}${monthly} / ${t('settings.subscriptionIntervalMonthly')} · ${displayPlan.currency === 'EGP' ? 'EGP ' : '$'}${annual} / ${t('settings.subscriptionIntervalAnnually')}`;
                    const benefits = Array.isArray(displayPlan.benefits) ? displayPlan.benefits : [];

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl overflow-hidden ${
                          isCurrent ? 'border-2 border-[#101010] bg-white shadow-sm ring-1 ring-[#101010]/10' : 'border border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="p-5 space-y-4">
                          {status && (
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                              {status}
                            </p>
                          )}
                          <h4 className="text-lg font-semibold text-gray-900">{displayPlan.name}</h4>
                          <p className="text-sm text-gray-700">{priceLabel}</p>
                          {isCurrent && subscription.subscriptionPeriodEnd && (
                            <p className="text-sm text-gray-600">
                              {t('settings.subscriptionRenewalDate')}: {formatJoinDate(subscription.subscriptionPeriodEnd)}
                            </p>
                          )}
                          {benefits.length > 0 && (
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {benefits.map((benefit, i) => (
                                <li key={i}>{benefit}</li>
                              ))}
                            </ul>
                          )}
                          <div className="pt-2">
                            {ctaType === 'manage' && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                              >
                                <Settings size={18} />
                                {t('settings.subscriptionManage')}
                              </button>
                            )}
                            {ctaType === 'upgrade' && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#101010] text-[#cfff5e] rounded-lg text-sm font-medium hover:bg-[#cfff5e] hover:text-[#101010] transition-colors"
                              >
                                <ArrowUp size={18} />
                                {t('settings.subscriptionUpgrade')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 3. Billing */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Receipt size={20} className="text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">{t('settings.tabBilling')}</h3>
        </div>
        <div className="p-6 space-y-4">
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">{t('settings.billingNoInvoices')}</p>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <Download size={18} />
                {t('settings.billingDownload')}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Cancel subscription — retention flow (don't hide it) */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.subscriptionCancelConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">{t('settings.subscriptionCancelConfirmMessage')}</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setCancelDialogOpen(false)}
              className="px-4 py-2 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] text-sm font-medium"
            >
              {t('settings.subscriptionCancelConfirmKeep')}
            </button>
            <button
              type="button"
              onClick={() => setCancelDialogOpen(false)}
              className="px-4 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
            >
              {t('settings.subscriptionCancelConfirmProceed')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
