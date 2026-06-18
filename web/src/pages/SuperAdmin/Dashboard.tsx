import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

type Shop = {
  id: number;
  name: string;
  address: string;
  owner_name?: string | null;
  owner?: {
    name?: string | null;
  };
  created_at: string;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return 'Unable to load shops.';
  }

  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || 'Unable to load shops.';
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const response = await api.get<Shop[]>('/api/shops');
        setShops(response.data);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
      }
    };

    fetchShops();
  }, []);

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Super Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Shop Dashboard</h1>
            <p className="mt-2 text-slate-300">Manage all shops and owners from one place.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-2xl bg-amber-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-200"
              onClick={() => navigate('/super-admin/add-shop')}
              type="button"
            >
              Add New Shop
            </button>
            <button
              className="rounded-2xl border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              onClick={logout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow">Loading shops...</div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : null}

        {!isLoading && !error ? (
          <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-900 text-sm uppercase tracking-wide text-slate-200">
                  <tr>
                    <th className="px-6 py-4">Shop Name</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4">Owner Name</th>
                    <th className="px-6 py-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shops.map((shop) => (
                    <tr className="transition hover:bg-amber-50" key={shop.id}>
                      <td className="px-6 py-4 font-semibold">{shop.name}</td>
                      <td className="px-6 py-4 text-slate-600">{shop.address}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {shop.owner_name || shop.owner?.name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(shop.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {shops.length === 0 ? (
              <div className="border-t border-slate-100 p-8 text-center text-slate-500">
                No shops found yet. Add the first shop to get started.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default Dashboard;
