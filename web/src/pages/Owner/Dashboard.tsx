import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

type PriceRecord = {
  shop_id: number;
  shop_name?: string | null;
  date: string;
  chicken_kg: number | string;
  mutton_kg: number | string;
  fish_kg: number | string;
  eggs_kg: number | string;
  updated_at: string | null;
};

type Shop = {
  id: number;
  name: string;
};

const priceItems = [
  { label: 'Chicken', key: 'chicken_kg' },
  { label: 'Mutton', key: 'mutton_kg' },
  { label: 'Fish', key: 'fish_kg' },
  { label: 'Eggs', key: 'eggs_kg' },
] as const;

const getTodayKey = () => new Date().toISOString().split('T')[0];

const formatPrice = (value: number | string) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return 'Not updated yet';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return 'Unable to load dashboard.';
  }

  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || 'Unable to load dashboard.';
};

const normalizePriceRecord = (data: PriceRecord | PriceRecord[]) => {
  if (Array.isArray(data)) {
    const today = getTodayKey();
    return data.find((record) => String(record.date).slice(0, 10) === today) || null;
  }

  return data;
};

const fetchTodayPrices = async (shopId: number) => {
  try {
    const response = await api.get<PriceRecord | PriceRecord[]>(`/api/shops/${shopId}/prices`);
    return normalizePriceRecord(response.data);
  } catch {
    const response = await api.get<PriceRecord>('/api/prices/me/today');
    return response.data;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [prices, setPrices] = useState<PriceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.shop_id) {
        setError('No shop is assigned to this owner account.');
        setIsLoading(false);
        return;
      }

      try {
        const [shopResponse, priceRecord] = await Promise.all([
          api.get<Shop>('/api/shops/me'),
          fetchTodayPrices(user.shop_id),
        ]);
        setShop(shopResponse.data);
        setPrices(priceRecord);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [user?.shop_id]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Shop Owner</p>
            <h1 className="mt-2 text-3xl font-bold">{shop?.name || prices?.shop_name || 'Owner Dashboard'}</h1>
            <p className="mt-2 text-slate-300">
              Today is{' '}
              {new Intl.DateTimeFormat('en-IN', {
                dateStyle: 'full',
              }).format(new Date())}
            </p>
          </div>
          <button
            className="rounded-2xl border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </header>

        {isLoading ? (
          <div className="rounded-3xl bg-white/10 p-8 text-center text-slate-200">Loading dashboard...</div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">{error}</div>
        ) : null}

        {!isLoading && !error ? (
          <section className="rounded-3xl bg-stone-100 p-6 text-slate-950 shadow-2xl">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Current Prices</h2>
                <p className="mt-1 text-slate-600">Last updated: {formatTimestamp(prices?.updated_at || null)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {priceItems.map((item) => (
                <div className="rounded-3xl bg-white p-5 shadow" key={item.key}>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-black">₹{formatPrice(prices?.[item.key] || 0)}</p>
                  <p className="mt-1 text-sm text-slate-500">per kg</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                onClick={() => navigate('/owner/prices')}
                type="button"
              >
                Update Prices
              </button>
              <button
                className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 transition hover:bg-white"
                onClick={() => navigate('/owner/qr')}
                type="button"
              >
                View QR Code
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default Dashboard;
