import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

type BusinessType = 'daily_menu' | 'static_menu';

type ShopWithOwner = {
  id: number;
  name: string;
  address: string;
  business_type: BusinessType;
  description: string | null;
  owner_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
};

type FormState = {
  name: string;
  address: string;
  businessType: BusinessType;
  description: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const getErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallback;
  }
  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || fallback;
};

const EditShop = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<FormState | null>(null);
  const [hasOwner, setHasOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<ShopWithOwner>(`/api/shops/${id}`);
        setHasOwner(Boolean(data.owner_id));
        setForm({
          name: data.name ?? '',
          address: data.address ?? '',
          businessType: data.business_type ?? 'daily_menu',
          description: data.description ?? '',
          ownerName: data.owner_name ?? '',
          ownerEmail: data.owner_email ?? '',
          ownerPassword: '',
        });
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load shop.'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setSuccess('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Shop name is required.');
      return;
    }
    if (!form.address.trim()) {
      setError('Address is required.');
      return;
    }

    type Payload = Record<string, string | null>;
    const payload: Payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      business_type: form.businessType,
      description: form.description.trim() === '' ? null : form.description.trim(),
    };

    if (hasOwner) {
      if (!form.ownerName.trim() || !form.ownerEmail.trim()) {
        setError('Owner name and email are required.');
        return;
      }
      payload.owner_name = form.ownerName.trim();
      payload.owner_email = form.ownerEmail.trim();
      // Only change the password when a new one is entered.
      if (form.ownerPassword.trim() !== '') {
        if (form.ownerPassword.length < 6) {
          setError('New owner password must be at least 6 characters.');
          return;
        }
        payload.owner_password = form.ownerPassword;
      }
    }

    setIsSaving(true);
    try {
      await api.put(`/api/shops/${id}`, payload);
      setSuccess('Shop updated successfully.');
      setForm((current) => (current ? { ...current, ownerPassword: '' } : current));
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update shop.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    const confirmed = window.confirm(
      `Delete "${form.name}"?\n\nThis permanently removes the shop, its owner login, and all its categories, items and prices. This cannot be undone.`,
    );
    if (!confirmed) return;

    setError('');
    setIsDeleting(true);
    try {
      await api.delete(`/api/shops/${id}`);
      navigate('/super-admin/dashboard', { replace: true });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete shop.'));
      setIsDeleting(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200';

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <button
          className="mb-6 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-white"
          onClick={() => navigate('/super-admin/dashboard')}
          type="button"
        >
          Back to Dashboard
        </button>

        <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">Edit Shop</p>
            <h1 className="mt-2 text-3xl font-bold">Shop &amp; Owner Details</h1>
          </div>

          {isLoading ? <div className="rounded-2xl bg-slate-100 p-4">Loading shop...</div> : null}

          {!isLoading && form ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block font-medium">Shop Name</span>
                <input
                  className={inputClass}
                  onChange={(e) => updateField('name', e.target.value)}
                  value={form.name}
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-medium">Address</span>
                <textarea
                  className={`min-h-24 ${inputClass}`}
                  onChange={(e) => updateField('address', e.target.value)}
                  value={form.address}
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-medium">Business Type</span>
                <select
                  className={inputClass}
                  onChange={(e) => updateField('businessType', e.target.value)}
                  value={form.businessType}
                >
                  <option value="daily_menu">Daily Menu (e.g. Meat Shop)</option>
                  <option value="static_menu">Static Menu (e.g. Juice Bar, Restaurant)</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block font-medium">Description</span>
                <textarea
                  className={`min-h-20 ${inputClass}`}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Optional"
                  value={form.description}
                />
              </label>

              <div className="border-t border-slate-200 pt-5">
                <h2 className="mb-4 text-lg font-bold">Owner login</h2>
                {hasOwner ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block font-medium">Owner Name</span>
                        <input
                          className={inputClass}
                          onChange={(e) => updateField('ownerName', e.target.value)}
                          value={form.ownerName}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block font-medium">Owner Email</span>
                        <input
                          className={inputClass}
                          onChange={(e) => updateField('ownerEmail', e.target.value)}
                          type="email"
                          value={form.ownerEmail}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-2 block font-medium">New Password</span>
                      <input
                        autoComplete="new-password"
                        className={inputClass}
                        onChange={(e) => updateField('ownerPassword', e.target.value)}
                        placeholder="Leave blank to keep current password"
                        type="password"
                        value={form.ownerPassword}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    This shop has no owner account. Owner details can&apos;t be edited here.
                  </p>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              ) : null}
              {success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSaving || isDeleting}
                  type="submit"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="rounded-2xl border border-red-300 bg-red-50 px-5 py-3 font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSaving || isDeleting}
                  onClick={handleDelete}
                  type="button"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Shop'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default EditShop;
