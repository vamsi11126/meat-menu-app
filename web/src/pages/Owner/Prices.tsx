import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerNav from '../../components/OwnerNav';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMyShop,
  fetchShopPrices,
  getErrorMessage,
  savePrices,
  type PricedItem,
  type Shop,
} from '../../api/menu';

const UNCATEGORIZED = 'Uncategorized';

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

const Prices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<PricedItem[]>([]);
  const [form, setForm] = useState<Record<number, string>>({});
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
        const shopData = await fetchMyShop();
        const prices = await fetchShopPrices(shopData.id);
        setShop(shopData);
        setItems(prices.items);
        const initial: Record<number, string> = {};
        for (const item of prices.items) {
          initial[item.item_id] = item.price === null || item.price === undefined ? '' : String(item.price);
        }
        setForm(initial);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load prices.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPrices();
  }, [user?.shop_id]);

  const isDaily = shop?.business_type === 'daily_menu';
  const groups = useMemo(() => groupByCategory(items), [items]);

  const updateField = (itemId: number, value: string) => {
    setForm((current) => ({ ...current, [itemId]: value }));
    setSuccess('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (items.length === 0) {
      setError('No items to price. Add items from Manage Menu first.');
      return;
    }

    // Validate: every item must have a non-empty, non-negative price.
    for (const item of items) {
      const raw = form[item.item_id];
      if (raw === undefined || raw.trim() === '') {
        setError(`Please enter a price for "${item.name}".`);
        return;
      }
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0) {
        setError(`"${item.name}" must have a valid non-negative price.`);
        return;
      }
    }

    const prices = items.map((item) => ({
      item_id: item.item_id,
      price: Number(form[item.item_id]),
    }));

    setIsSaving(true);

    try {
      const response = await savePrices(prices);
      // Refresh from the server's resolved prices.
      setItems(response.data.items);
      setSuccess('Prices saved successfully.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save prices.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <OwnerNav />

        <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
              {isDaily ? "Today's Menu" : 'Menu Prices'}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{isDaily ? "Set today's prices" : 'Update menu prices'}</h1>
            <p className="mt-2 text-slate-600">
              {isDaily
                ? 'Enter the prices customers should see for today.'
                : 'Update prices whenever they change. These stay live until you change them.'}
            </p>
          </div>

          {isLoading ? <div className="rounded-2xl bg-slate-100 p-4">Loading prices...</div> : null}

          {!isLoading && items.length === 0 ? (
            <div className="rounded-2xl bg-slate-100 p-6 text-center text-slate-600">
              You have no menu items yet.{' '}
              <button
                className="font-bold text-amber-600 underline"
                onClick={() => navigate('/owner/menu')}
                type="button"
              >
                Add items
              </button>{' '}
              to start setting prices.
            </div>
          ) : null}

          {!isLoading && items.length > 0 ? (
            <form className="space-y-8" onSubmit={handleSubmit}>
              {groups.map((group) => (
                <div key={group.category}>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                    {group.category}
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <label className="block" key={item.item_id}>
                        <span className="mb-2 flex items-center justify-between font-medium">
                          <span>{item.name}</span>
                          <span className="text-xs text-slate-400">{item.unit}</span>
                        </span>
                        <div className="flex items-center rounded-2xl border border-slate-200 px-4 transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200">
                          <span className="mr-1 text-slate-500">₹</span>
                          <input
                            className="w-full bg-transparent py-3 outline-none"
                            min="0"
                            onChange={(event) => updateField(item.item_id, event.target.value)}
                            placeholder="0"
                            step="0.01"
                            type="number"
                            value={form[item.item_id] ?? ''}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
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
