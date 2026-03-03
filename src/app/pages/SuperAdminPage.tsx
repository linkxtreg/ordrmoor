import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, ExternalLink, LogOut, Building2, Pencil, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { superAdminApi, type TenantRecord } from '../services/api';
import { FEATURE_DEFINITIONS, getDefaultFeatureFlags, resolveFeatureFlags, type FeatureFlagKey, type FeatureFlags } from '../types/features';

interface SuperAdminPageProps {
  token: string;
  onLogout: () => void;
}

export default function SuperAdminPage({ token, onLogout }: SuperAdminPageProps) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [newFeatureFlags, setNewFeatureFlags] = useState<FeatureFlags>(() => getDefaultFeatureFlags());
  const [isCreating, setIsCreating] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editFeatureFlags, setEditFeatureFlags] = useState<FeatureFlags>(() => getDefaultFeatureFlags());
  const [isSaving, setIsSaving] = useState(false);
  const [togglingActiveSlug, setTogglingActiveSlug] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

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

  useEffect(() => {
    loadTenants();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || newName.trim().toLowerCase().replace(/\s+/g, '-');
    const name = newName.trim() || slug;
    const adminEmail = newAdminEmail.trim();
    const adminPassword = newAdminPassword;
    if (!slug) {
      toast.error('Enter a slug or name');
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
    try {
      setIsCreating(true);
      await superAdminApi.createTenant(token, slug, name, adminEmail, adminPassword, newActive, newFeatureFlags);
      toast.success(`Tenant "${name}" created`);
      setNewSlug('');
      setNewName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewActive(true);
      setNewFeatureFlags(getDefaultFeatureFlags());
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
    setEditSlug(t.slug);
    setEditAdminEmail(t.adminEmail || '');
    setEditAdminPassword('');
    setEditActive(t.active !== false);
    setEditFeatureFlags(resolveFeatureFlags(t.featureFlags));
  };

  const handleSaveEdit = async () => {
    if (!editingSlug) return;
    const slug = editSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    const name = editName.trim() || slug;
    const adminEmail = editAdminEmail.trim();
    if (!slug) {
      toast.error('URL (slug) is required');
      return;
    }
    if (editAdminPassword && editAdminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setIsSaving(true);
      await superAdminApi.updateTenant(token, editingSlug, {
        slug,
        name,
        adminEmail: adminEmail || undefined,
        adminPassword: editAdminPassword || undefined,
        active: editActive,
        featureFlags: editFeatureFlags,
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

  const toggleNewFeatureFlag = (featureKey: FeatureFlagKey) => {
    setNewFeatureFlags((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }));
  };

  const toggleEditFeatureFlag = (featureKey: FeatureFlagKey) => {
    setEditFeatureFlags((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }));
  };

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

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-[#f9faf3]">
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-[#52525c]" size={28} />
            <div>
              <h1 className="text-xl font-bold text-[#101010]">Super Admin</h1>
              <p className="text-sm text-[#52525c]">Manage tenants</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-[#52525c] hover:bg-stone-100 rounded-lg transition-colors font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Create Tenant */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#101010] mb-4">Create Tenant</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#52525c] mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="restaurant-2"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525c] mb-1">Display Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Second Restaurant"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#cfff5e] focus:border-[#cfff5e] text-sm"
                />
              </div>
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
            <div className="p-4 bg-[#f9faf3] rounded-lg border border-stone-200">
              <h3 className="text-sm font-semibold text-[#101010] mb-1">Feature Flags</h3>
              <p className="text-xs text-[#52525c] mb-3">Enable or disable platform features for this tenant.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURE_DEFINITIONS.map((feature) => (
                  <label key={feature.key} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFeatureFlags[feature.key]}
                      onChange={() => toggleNewFeatureFlag(feature.key)}
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
                          <label className="block text-xs font-medium text-[#52525c] mb-1">URL (slug)</label>
                          <input
                            type="text"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono"
                            placeholder="restaurant-slug"
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
                        <p className="text-xs font-semibold text-[#101010] mb-2">Feature Flags</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {FEATURE_DEFINITIONS.map((feature) => (
                            <label key={feature.key} className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editFeatureFlags[feature.key]}
                                onChange={() => toggleEditFeatureFlag(feature.key)}
                                className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#52525c] focus:ring-[#cfff5e]"
                              />
                              <span>
                                <span className="block text-xs font-medium text-[#101010]">{feature.label}</span>
                                {feature.description && (
                                  <span className="block text-[11px] text-[#52525c]">{feature.description}</span>
                                )}
                              </span>
                            </label>
                          ))}
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
                          {FEATURE_DEFINITIONS.filter((feature) => t.featureFlags?.[feature.key]).length > 0 ? (
                            FEATURE_DEFINITIONS.filter((feature) => t.featureFlags?.[feature.key]).map((feature) => (
                              <span
                                key={feature.key}
                                className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-[#52525c]"
                              >
                                {feature.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-stone-400">No feature flags enabled</span>
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

      </main>
    </div>
  );
}
