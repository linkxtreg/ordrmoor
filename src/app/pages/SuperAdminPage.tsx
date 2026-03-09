import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, ExternalLink, LogOut, Building2, Pencil, CheckSquare, Square, Eye, EyeOff, CreditCard, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { superAdminApi, type TenantRecord, type PlanRecord } from '../services/api';
import { FEATURE_DEFINITIONS, getDefaultFeatureFlags, resolveFeatureFlags, type FeatureFlagKey, type FeatureFlags } from '../types/features';

interface SuperAdminPageProps {
  token: string;
  onLogout: () => void;
}

export default function SuperAdminPage({ token, onLogout }: SuperAdminPageProps) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [newPlanId, setNewPlanId] = useState('');
  const [newSubscriptionInterval, setNewSubscriptionInterval] = useState<'monthly' | 'annually'>('monthly');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editPlanId, setEditPlanId] = useState('');
  const [editSubscriptionInterval, setEditSubscriptionInterval] = useState<'monthly' | 'annually'>('monthly');
  const [editSubscriptionPeriodEnd, setEditSubscriptionPeriodEnd] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [togglingActiveSlug, setTogglingActiveSlug] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Plans tab
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans'>('tenants');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPriceMonthly, setPlanPriceMonthly] = useState(0);
  const [planPriceAnnual, setPlanPriceAnnual] = useState(0);
  const planCurrency = 'EGP';
  const [planInterval, setPlanInterval] = useState<'monthly' | 'annually'>('monthly');
  const [planDurationMonths, setPlanDurationMonths] = useState(1);
  const [planTier, setPlanTier] = useState(0);
  const [planBenefits, setPlanBenefits] = useState<string[]>(['']);
  const [planActive, setPlanActive] = useState(true);
  const [planFeatureFlags, setPlanFeatureFlags] = useState<FeatureFlags>(() => getDefaultFeatureFlags());
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const data = await superAdminApi.getTenants(token);
      setTenants(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const data = await superAdminApi.getPlans(token);
      setPlans(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'plans') loadPlans();
  }, [token, activeTab]);

  useEffect(() => {
    loadPlans();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || 'tenant';
    const adminEmail = newAdminEmail.trim();
    const adminPassword = newAdminPassword;
    if (!name) {
      toast.error('Enter a name');
      return;
    }
    if (!adminEmail || !adminPassword) {
      toast.error('Admin email and password are required');
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const sortedPlans = plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier);
    const planIdToSend = newPlanId.trim() || sortedPlans[0]?.id || undefined;
    try {
      setIsCreating(true);
      await superAdminApi.createTenant(token, slug, name, adminEmail, adminPassword, newActive, getDefaultFeatureFlags(), planIdToSend, undefined, newSubscriptionInterval);
      toast.success(`Tenant "${name}" created`);
      setNewName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewActive(true);
      setNewPlanId('');
      setNewSubscriptionInterval('monthly');
      loadTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (t: TenantRecord) => {
    setEditingSlug(t.slug);
    setEditName(t.name || t.slug);
    setEditAdminEmail(t.adminEmail || '');
    setEditAdminPassword('');
    setEditActive(t.active !== false);
    setEditPlanId(t.planId ?? '');
    setEditSubscriptionInterval(t.subscriptionInterval === 'annually' ? 'annually' : 'monthly');
    setEditSubscriptionPeriodEnd(t.subscriptionPeriodEnd ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingSlug) return;
    const name = editName.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (editAdminPassword && editAdminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const adminEmail = editAdminEmail.trim();
    const sortedPlansForEdit = plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier);
    const planIdToSend = editPlanId.trim() || sortedPlansForEdit[0]?.id || undefined;
    try {
      setIsSaving(true);
      await superAdminApi.updateTenant(token, editingSlug, {
        name,
        adminEmail: adminEmail || undefined,
        adminPassword: editAdminPassword || undefined,
        active: editActive,
        planId: planIdToSend,
        subscriptionInterval: editSubscriptionInterval,
        // Period end is computed by backend from interval (30 or 365 days from now)
      });
      toast.success('Tenant updated');
      setEditingSlug(null);
      loadTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => setEditingSlug(null);

  const handleToggleActive = async (t: TenantRecord) => {
    const newActive = !(t.active !== false);
    try {
      setTogglingActiveSlug(t.slug);
      await superAdminApi.updateTenant(token, t.slug, { active: newActive });
      toast.success(newActive ? `"${t.name || t.slug}" is now active` : `"${t.name || t.slug}" is now inactive`);
      loadTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setTogglingActiveSlug(null);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Permanently delete tenant "${slug}"? All their data, menus, and credentials will be removed. This cannot be undone.`)) return;
    try {
      await superAdminApi.deleteTenant(token, slug);
      toast.success('Tenant removed');
      loadTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tenant');
    }
  };

  // Plan form helpers
  const resetPlanForm = () => {
    setPlanName('');
    setPlanPriceMonthly(0);
    setPlanPriceAnnual(0);
    setPlanInterval('monthly');
    setPlanDurationMonths(1);
    setPlanTier(0);
    setPlanBenefits(['']);
    setPlanActive(true);
    setPlanFeatureFlags(getDefaultFeatureFlags());
    setEditingPlanId(null);
  };

  const togglePlanFeatureFlag = (featureKey: FeatureFlagKey) => {
    setPlanFeatureFlags((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }));
  };

  const addPlanBenefit = () => setPlanBenefits((b) => [...b, '']);
  const removePlanBenefit = (i: number) => setPlanBenefits((b) => b.filter((_, j) => j !== i));
  const setPlanBenefitAt = (i: number, value: string) => setPlanBenefits((b) => b.map((x, j) => (j === i ? value : x)));

  const handleEditPlan = (p: PlanRecord) => {
    setEditingPlanId(p.id);
    setPlanName(p.name);
    setPlanPriceMonthly(p.priceMonthly ?? p.price);
    setPlanPriceAnnual(p.priceAnnual ?? p.price * 12);
    setPlanInterval(p.interval);
    setPlanDurationMonths(p.durationMonths);
    setPlanTier(p.tier);
    setPlanBenefits(p.benefits.length ? p.benefits : ['']);
    setPlanFeatureFlags(resolveFeatureFlags(p.featureFlags));
    setPlanActive(p.active);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = planName.trim();
    if (!name) {
      toast.error('Plan name is required');
      return;
    }
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || crypto.randomUUID();
    const benefits = planBenefits.map((b) => b.trim()).filter(Boolean);
    if (benefits.length === 0) {
      toast.error('At least one benefit is required');
      return;
    }
    try {
      setIsSavingPlan(true);
      if (editingPlanId) {
        await superAdminApi.updatePlan(token, editingPlanId, {
          name,
          tier: planTier,
          price: planPriceMonthly,
          priceMonthly: planPriceMonthly,
          priceAnnual: planPriceAnnual,
          currency: planCurrency,
          interval: planInterval,
          durationMonths: planDurationMonths,
          benefits,
          featureFlags: planFeatureFlags,
          active: planActive,
        });
        toast.success('Plan updated');
      } else {
        await superAdminApi.createPlan(token, {
          id,
          name,
          tier: planTier,
          price: planPriceMonthly,
          priceMonthly: planPriceMonthly,
          priceAnnual: planPriceAnnual,
          currency: planCurrency,
          interval: planInterval,
          durationMonths: planDurationMonths,
          benefits,
          featureFlags: planFeatureFlags,
          active: planActive,
        });
        toast.success('Plan created');
      }
      resetPlanForm();
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm(`Delete plan "${plans.find((p) => p.id === id)?.name ?? id}"?`)) return;
    try {
      await superAdminApi.deletePlan(token, id);
      toast.success('Plan deleted');
      if (editingPlanId === id) resetPlanForm();
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-[#f9faf3]">
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-[#52525c]" size={28} />
            <div>
              <h1 className="text-xl font-bold text-[#101010]">Super Admin</h1>
              <p className="text-sm text-[#52525c]">{activeTab === 'tenants' ? 'Manage tenants' : 'Manage plans'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('tenants')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'tenants' ? 'bg-[#101010] text-[#cfff5e]' : 'text-[#52525c] hover:bg-stone-100'}`}
            >
              <Building2 size={18} />
              Tenants
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'plans' ? 'bg-[#101010] text-[#cfff5e]' : 'text-[#52525c] hover:bg-stone-100'}`}
            >
              <CreditCard size={18} />
              Plans
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-[#52525c] hover:bg-stone-100 rounded-lg transition-colors font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {activeTab === 'tenants' && (
          <>
        {/* Create Tenant */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#101010] mb-4">Create Tenant</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#52525c] mb-1">Display Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Second Restaurant"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
              />
              <p className="text-xs text-[#52525c] mt-1">URL slug is generated from the name (e.g. &quot;My Restaurant&quot; → my-restaurant).</p>
            </div>
            <div className="p-4 bg-[#f9faf3] rounded-lg border border-stone-200">
              <h3 className="text-sm font-semibold text-[#101010] mb-3">Tenant Admin Login</h3>
              <p className="text-xs text-[#52525c] mb-3">Tenant admins sign in at /login</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#52525c] mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@restaurant.com"
                    autoComplete="off"
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#52525c] mb-1">Admin Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      className="w-full px-4 pr-10 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#52525c] transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={newActive}
                  onChange={(e) => setNewActive(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-[#52525c] focus:ring-[#cfff5e]"
                />
                <span className="text-sm font-medium text-[#52525c]">Active</span>
              </label>
            </div>
            <div className="rounded-lg border border-stone-200 bg-[#f9faf3] p-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#101010] mb-2">Plan</label>
                <select
                  value={newPlanId || (plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier)[0]?.id ?? '')}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm bg-white"
                >
                  {plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (tier {p.tier})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#52525c] mt-1">Features are set by the selected plan. Create plans in the Plans tab.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#101010] mb-2">Interval</label>
                <select
                  value={newSubscriptionInterval}
                  onChange={(e) => setNewSubscriptionInterval(e.target.value as 'monthly' | 'annually')}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm bg-white"
                >
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="annually">Annually (365 days)</option>
                </select>
                {(() => {
                  const planId = newPlanId || plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier)[0]?.id;
                  const plan = planId ? plans.find((p) => p.id === planId) : null;
                  if (!plan) return null;
                  const price = newSubscriptionInterval === 'annually' ? (plan.priceAnnual ?? plan.price * 12) : (plan.priceMonthly ?? plan.price);
                  const label = newSubscriptionInterval === 'annually' ? `EGP ${price} / year` : `EGP ${price} / month`;
                  return <p className="text-xs text-[#52525c] mt-1">Price: {label}</p>;
                })()}
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors font-medium disabled:opacity-50"
              >
                <Plus size={18} />
                Create
              </button>
            </div>
          </form>
        </div>

        {/* Tenants List */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-[#101010]">Tenants</h2>
            <p className="text-sm text-[#52525c] mt-0.5">{tenants.length} tenant(s)</p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-[#101010] rounded-full animate-spin" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12 text-[#52525c]">
              <Building2 size={48} className="mx-auto mb-4 opacity-40" />
              <p>No tenants yet. Create one above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {tenants.map((t) => (
                <li key={t.slug} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[#f9faf3]">
                  {editingSlug === t.slug ? (
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#52525c] mb-1">Display Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                            placeholder="Restaurant Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#52525c] mb-1">Admin Email</label>
                          <input
                            type="email"
                            value={editAdminEmail}
                            onChange={(e) => setEditAdminEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                            placeholder="admin@restaurant.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#52525c] mb-1">Admin Password</label>
                          <div className="relative">
                            <input
                              type={showEditPassword ? 'text' : 'password'}
                              value={editAdminPassword}
                              onChange={(e) => setEditAdminPassword(e.target.value)}
                              className="w-full px-3 pr-9 py-2 border border-stone-300 rounded-lg text-sm"
                              placeholder="Leave blank to keep current"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword((p) => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#52525c] transition-colors"
                              aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                            >
                              {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 text-[#52525c] focus:ring-[#cfff5e]"
                        />
                        <span className="text-sm font-medium text-[#52525c]">Active</span>
                      </label>
                      <div className="rounded-lg border border-stone-200 bg-[#f9faf3] p-3">
                        <p className="text-xs font-semibold text-[#101010] mb-1">Features</p>
                        <p className="text-xs text-[#52525c]">
                          {editPlanId
                            ? `Determined by plan: ${plans.find((p) => p.id === editPlanId)?.name ?? editPlanId}`
                            : 'Assign a plan below to set which features this tenant has (Addresses, Offers, Loyalty).'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-[#f9faf3] p-3">
                        <p className="text-xs font-semibold text-[#101010] mb-2">Subscription</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#52525c] mb-1">Plan</label>
                            <select
                              value={editPlanId || (plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier)[0]?.id ?? '')}
                              onChange={(e) => setEditPlanId(e.target.value)}
                              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                            >
                              {plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier).map((p) => (
                                <option key={p.id} value={p.id}>{p.name} (tier {p.tier})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#52525c] mb-1">Interval</label>
                            <select
                              value={editSubscriptionInterval}
                              onChange={(e) => setEditSubscriptionInterval(e.target.value as 'monthly' | 'annually')}
                              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                            >
                              <option value="monthly">Monthly (30 days)</option>
                              <option value="annually">Annually (365 days)</option>
                            </select>
                            {(() => {
                              const planId = editPlanId || plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier)[0]?.id;
                              const plan = planId ? plans.find((p) => p.id === planId) : null;
                              if (!plan) return null;
                              const price = editSubscriptionInterval === 'annually' ? (plan.priceAnnual ?? plan.price * 12) : (plan.priceMonthly ?? plan.price);
                              const label = editSubscriptionInterval === 'annually' ? `EGP ${price} / year` : `EGP ${price} / month`;
                              return <p className="text-xs text-[#52525c] mt-1">Price: {label}</p>;
                            })()}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-[#52525c] mb-1">Period end (renewal date)</label>
                            <input
                              type="date"
                              readOnly
                              value={editSubscriptionPeriodEnd ? editSubscriptionPeriodEnd.slice(0, 10) : ''}
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-[#52525c]"
                            />
                            <p className="text-xs text-[#52525c] mt-1">Set by interval. Saving will set period end to today + 30 days (monthly) or 365 days (annually).</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                        <Building2 className="text-[#52525c]" size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#101010] truncate">{t.name || t.slug}</p>
                        <p className="text-sm text-[#52525c] font-mono truncate">{t.slug}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {t.planId ? (
                            <>
                              <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-[#52525c]">
                                Plan: {plans.find((p) => p.id === t.planId)?.name ?? t.planId}
                              </span>
                              {t.subscriptionInterval && (
                                <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-[#52525c]">
                                  {t.subscriptionInterval === 'annually' ? 'Annually' : 'Monthly'}
                                </span>
                              )}
                            </>
                          ) : FEATURE_DEFINITIONS.filter((feature) => t.featureFlags?.[feature.key]).length > 0 ? (
                            FEATURE_DEFINITIONS.filter((feature) => t.featureFlags?.[feature.key]).map((feature) => (
                              <span
                                key={feature.key}
                                className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-[#52525c]"
                              >
                                {feature.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-stone-400">No plan assigned</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(t)}
                        disabled={togglingActiveSlug === t.slug}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0 ${
                          t.active !== false
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-stone-400 hover:bg-stone-100'
                        } disabled:opacity-50`}
                        title={t.active !== false ? 'Active – click to deactivate' : 'Inactive – click to activate'}
                      >
                        {t.active !== false ? <CheckSquare size={18} /> : <Square size={18} />}
                        <span className="hidden sm:inline">{t.active !== false ? 'Active' : 'Inactive'}</span>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingSlug === t.slug ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-sm bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm text-[#52525c] hover:bg-stone-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#52525c] hover:bg-stone-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <a
                          href={`${origin}/t/${t.slug}/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#52525c] hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          <ExternalLink size={14} />
                          Admin
                        </a>
                        <a
                          href={`${origin}/t/${t.slug}/menu`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#52525c] hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          <ExternalLink size={14} />
                          Menu
                        </a>
                        <button
                          onClick={() => handleDelete(t.slug)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
          </>
        )}

        {activeTab === 'plans' && (
          <>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#101010] mb-4">{editingPlanId ? 'Edit Plan' : 'Create Plan'}</h2>
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#52525c] mb-1">Plan Name</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Pro"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
              />
              <p className="text-xs text-[#52525c] mt-1">Plan ID is generated from the name (e.g. &quot;Pro&quot; → pro).</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#52525c] mb-1">Monthly Price (EGP)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={planPriceMonthly}
                  onChange={(e) => setPlanPriceMonthly(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525c] mb-1">Annual Price (EGP)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={planPriceAnnual}
                  onChange={(e) => setPlanPriceAnnual(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#52525c] mb-1">Tier (0 = lowest, higher = upgrade)</label>
              <input
                type="number"
                min={0}
                value={planTier}
                onChange={(e) => setPlanTier(Number(e.target.value) || 0)}
                className="w-full max-w-[120px] px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#52525c] mb-2">Benefits</label>
              <div className="space-y-2">
                {planBenefits.map((benefit, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => setPlanBenefitAt(i, e.target.value)}
                      placeholder="e.g. Unlimited menus"
                      className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                    <button type="button" onClick={() => removePlanBenefit(i)} className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm" disabled={planBenefits.length <= 1}>−</button>
                  </div>
                ))}
                <button type="button" onClick={addPlanBenefit} className="text-sm text-[#101010] hover:underline">+ Add benefit</button>
              </div>
            </div>
            <div className="p-4 bg-[#f9faf3] rounded-lg border border-stone-200">
              <h3 className="text-sm font-semibold text-[#101010] mb-1">Feature Flags</h3>
              <p className="text-xs text-[#52525c] mb-3">Tenants on this plan get these features. Enable or disable per plan.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURE_DEFINITIONS.map((feature) => (
                  <label key={feature.key} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planFeatureFlags[feature.key]}
                      onChange={() => togglePlanFeatureFlag(feature.key)}
                      className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#52525c] focus:ring-[#cfff5e]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[#101010]">{feature.label}</span>
                      {feature.description && (
                        <span className="block text-xs text-[#52525c]">{feature.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planActive}
                onChange={(e) => setPlanActive(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-[#52525c] focus:ring-[#cfff5e]"
              />
              <span className="text-sm font-medium text-[#52525c]">Active (visible to tenants)</span>
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={isSavingPlan} className="flex items-center gap-2 px-5 py-2.5 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors font-medium disabled:opacity-50">
                {editingPlanId ? 'Save' : 'Create'}
              </button>
              {editingPlanId && (
                <button type="button" onClick={resetPlanForm} className="px-4 py-2.5 border border-stone-300 text-[#52525c] rounded-lg hover:bg-stone-50 text-sm font-medium">Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-[#101010]">Plans</h2>
            <p className="text-sm text-[#52525c] mt-0.5">{plans.length} plan(s)</p>
          </div>
          {isLoadingPlans ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-[#101010] rounded-full animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-[#52525c]">
              <CreditCard size={48} className="mx-auto mb-4 opacity-40" />
              <p>No plans yet. Create one above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[#f9faf3]">
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical className="text-stone-400 shrink-0" size={18} />
                    <div>
                      <p className="font-medium text-[#101010]">{p.name}</p>
                      <p className="text-sm text-[#52525c] font-mono">{p.id}</p>
                      <p className="text-sm text-[#52525c] mt-0.5">
                        {p.currency} {p.priceMonthly ?? p.price} / month · {p.priceAnnual ?? p.price * 12} / year · Tier {p.tier} {!p.active && <span className="text-amber-600">(inactive)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => handleEditPlan(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#52525c] hover:bg-stone-100 rounded-lg transition-colors">
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" onClick={() => handleDeletePlan(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
