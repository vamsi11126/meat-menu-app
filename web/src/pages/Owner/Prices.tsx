import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

type PriceForm = {
  chicken_kg: string;
  mutton_kg: string;
  fish_kg: string;
  eggs_kg: string;
};

type PriceRecord = {
  date: string;
  chicken_kg: number | string;
  mutton_kg: number | string;
  fish_kg: number | string;
  eggs_kg: number | string;
};

const fields = [
  { label: 'Chicken (₹/kg)', key: 'chicken_kg' },
  { label: 'Mutton (₹/kg)', key: 'mutton_kg' },
  { label: 'Fish (₹/kg)', key: 'fish_kg' },
  { label: 'Eggs (₹/kg)', key: 'eggs_kg' },
] as const;

const initialForm: PriceForm = {
  chicken_kg: '',
  mutton_kg: '',
  fish_kg: '',
  eggs_kg: '',
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const getErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return 'Unable to save prices.';
  }

  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || 'Unable to save prices.';
};

const normalizePriceRecord = (data: PriceRecord | PriceRecord[]) => {
  if (Array.isArray(data)) {
    const today = getTodayKey();
    return data.find((record) => String(record.date).slice(0, 10) === today) || null;
  }

  return data;
};

const fetchExistingPrices = async (shopId: number) => {
  try {
    const response = await api.get<PriceRecord | PriceRecord[]>(`/api/shops/${shopId}/prices`);
    return normalizePriceRecord(response.data);
  } catch {
    const response = await api.get<PriceRecord>('/api/prices/me/today');
    return response.data;
  }
};

const savePrices = async (shopId: number, form: PriceForm) => {
  const payload = {
    chicken_kg: Number(form.chicken_kg),
    mutton_kg: Number(form.mutton_kg),
    fish_kg: Number(form.fish_kg),
    eggs_kg: Number(form.eggs_kg),
  };

  try {
    return await api.post(`/api/shops/${shopId}/prices`, payload);
  } catch {
    return api.put('/api/prices/me/today', payload);
  }
};

const Prices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<PriceForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadPrices = async () => {
      if (!user?.shop_id) {
        setError('No shop is assigned to this owner account.');
        setIsLoading(false);
        return;
      }

      try {
        const existingPrices = await fetchExistingPrices(user.shop_id);

        if (existingPrices) {
          setForm({
            chicken_kg: Number(existingPrices.chicken_kg) > 0 ? String(existingPrices.chicken_kg) : '',
            mutton_kg: Number(existingPrices.mutton_kg) > 0 ? String(existingPrices.mutton_kg) : '',
            fish_kg: Number(existingPrices.fish_kg) > 0 ? String(existingPrices.fish_kg) : '',
            eggs_kg: Number(existingPrices.eggs_kg) > 0 ? String(existingPrices.eggs_kg) : '',
          });
        }
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    loadPrices();
  }, [user?.shop_id]);

  const updateField = (field: keyof PriceForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user?.shop_id) {
      setError('No shop is assigned to this owner account.');
      return;
    }

    const hasInvalidValue = Object.values(form).some((value) => value.trim() === '' || Number(value) <= 0);

    if (hasInvalidValue) {
      setError('Please enter a valid price for all items');
      return;
    }

    setIsSaving(true);

    try {
      await savePrices(user.shop_id, form);
      setSuccess('Prices saved successfully.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <button
          className="mb-6 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-white"
          onClick={() => navigate('/owner/dashboard')}
          type="button"
        >
          Back to Dashboard
        </button>

        <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">Today&apos;s Menu</p>
            <h1 className="mt-2 text-3xl font-bold">Update Prices</h1>
            <p className="mt-2 text-slate-600">Set all prices per kg for today.</p>
          </div>

          {isLoading ? <div className="rounded-2xl bg-slate-100 p-4">Loading prices...</div> : null}

          {!isLoading ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => (
                  <label className="block" key={field.key}>
                    <span className="mb-2 block font-medium">{field.label}</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                      min="0"
                      onChange={(event) => updateField(field.key, event.target.value)}
                      placeholder=""
                      step="0.01"
                      type="number"
                      value={form[field.key]}
                    />
                  </label>
                ))}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? 'Saving...' : 'Save Prices'}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default Prices;
