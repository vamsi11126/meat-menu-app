import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

type FormState = {
  name: string;
  address: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const initialForm: FormState = {
  name: '',
  address: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
};

const getErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return 'Unable to create shop.';
  }

  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || 'Unable to create shop.';
};

const AddShop = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validate = () => {
    const nextErrors: string[] = [];

    if (!form.name.trim()) {
      nextErrors.push('Shop Name is required.');
    }

    if (!form.address.trim()) {
      nextErrors.push('Address is required.');
    }

    if (!form.ownerName.trim()) {
      nextErrors.push('Owner Name is required.');
    }

    if (!form.ownerEmail.trim()) {
      nextErrors.push('Owner Email is required.');
    }

    if (form.ownerPassword.length < 6) {
      nextErrors.push('Owner Password must be at least 6 characters.');
    }

    setValidationErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/api/shops', {
        name: form.name.trim(),
        address: form.address.trim(),
        owner_name: form.ownerName.trim(),
        owner_email: form.ownerEmail.trim(),
        owner_password: form.ownerPassword,
      });
      navigate('/super-admin/dashboard', { replace: true });
    } catch (submitError) {
      setApiError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">New Shop</p>
            <h1 className="mt-2 text-3xl font-bold">Add New Shop</h1>
            <p className="mt-2 text-slate-600">Create a shop and owner login for daily price updates.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block font-medium">Shop Name</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                onChange={(event) => updateField('name', event.target.value)}
                value={form.name}
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-medium">Address</span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                onChange={(event) => updateField('address', event.target.value)}
                value={form.address}
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-medium">Owner Name</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  onChange={(event) => updateField('ownerName', event.target.value)}
                  value={form.ownerName}
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-medium">Owner Email</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  onChange={(event) => updateField('ownerEmail', event.target.value)}
                  type="email"
                  value={form.ownerEmail}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block font-medium">Owner Password</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                onChange={(event) => updateField('ownerPassword', event.target.value)}
                type="password"
                value={form.ownerPassword}
              />
            </label>

            {validationErrors.length > 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {validationErrors.map((validationError) => (
                  <p key={validationError}>{validationError}</p>
                ))}
              </div>
            ) : null}

            {apiError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {apiError}
              </div>
            ) : null}

            <button
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creating...' : 'Create Shop'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default AddShop;
