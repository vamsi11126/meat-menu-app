import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerNav from '../../components/OwnerNav';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMyShop,
  fetchShopPrices,
  formatPrice,
  getErrorMessage,
  type PricedItem,
  type Shop,
} from '../../api/menu';

const UNCATEGORIZED = 'Uncategorized';

// Group resolved items by category, preserving the API's ordering
// (items already arrive ordered by category then item display_order).
const groupByCategory = (items: PricedItem[]) => {
  const groups: { category: string; items: PricedItem[] }[] = [];
  const index = new Map<string, number>();

  for (const item of items) {
    const key = item.category_name || UNCATEGORIZED;
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({ category: key, items: [] });
    }
    groups[index.get(key)!].items.push(item);
  }

  return groups;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<PricedItem[]>([]);
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
        const shopData = await fetchMyShop();
        const prices = await fetchShopPrices(shopData.id);
        setShop(shopData);
        setItems(prices.items);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load dashboard.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [user?.shop_id]);

  const isDaily = shop?.business_type === 'daily_menu';
  const groups = groupByCategory(items);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <OwnerNav />

        <header className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Shop Owner</p>
          <h1 className="mt-2 text-3xl font-bold">{shop?.name || 'Owner Dashboard'}</h1>
          <p className="mt-2 text-slate-300">
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}
            {shop ? (
              <span className="ml-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                {isDaily ? 'Daily Menu' : 'Static Menu'}
              </span>
            ) : null}
          </p>
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
                <h2 className="text-2xl font-bold">{isDaily ? "Today's Prices" : 'Menu Prices'}</h2>
                <p className="mt-1 text-slate-600">
                  {items.length} item{items.length === 1 ? '' : 's'} on your menu
                </p>
              </div>
              <button
                className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                onClick={() => navigate('/owner/menu')}
                type="button"
              >
                Manage Menu
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-3xl bg-white p-8 text-center text-slate-600">
                No items yet. Use{' '}
                <button
                  className="font-bold text-amber-600 underline"
                  onClick={() => navigate('/owner/menu')}
                  type="button"
                >
                  Manage Menu
                </button>{' '}
                to add your first items.
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group.category}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      {group.category}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item) => {
                        const price = formatPrice(item.price);
                        return (
                          <div
                            className={`rounded-3xl bg-white p-5 shadow ${
                              item.is_available ? '' : 'opacity-60'
                            }`}
                            key={item.item_id}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-lg font-bold">{item.name}</p>
                              {!item.is_available ? (
                                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                                  Unavailable
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-3xl font-black">
                              {price === null ? (
                                <span className="text-xl font-bold text-slate-400">Not set</span>
                              ) : (
                                `₹${price}`
                              )}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{item.unit}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
