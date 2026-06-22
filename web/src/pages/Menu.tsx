import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchShopPrices, formatPrice, getErrorMessage, type PricedItem } from '../api/menu';

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

// Most recent per-item update timestamp, used as the menu's "last updated".
const latestUpdate = (items: PricedItem[]) => {
  let latest = 0;
  for (const item of items) {
    if (item.updated_at) {
      const time = new Date(item.updated_at).getTime();
      if (!Number.isNaN(time) && time > latest) {
        latest = time;
      }
    }
  }
  return latest ? new Date(latest) : null;
};

const formatTimestamp = (value: Date) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value);

const Menu = () => {
  const { shopId } = useParams();
  const [shopName, setShopName] = useState('');
  const [items, setItems] = useState<PricedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMenu = async () => {
      if (!shopId) {
        setError('Shop not found.');
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchShopPrices(Number(shopId));
        setShopName(data.shop_name || `Shop #${shopId}`);
        setItems(data.items);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load the menu.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadMenu();
  }, [shopId]);

  const groups = groupByCategory(items);
  const updatedAt = latestUpdate(items);

  return (
    <main className="min-h-screen bg-[#f8efe3] px-4 py-6 text-stone-950">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="bg-stone-950 px-6 py-8 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">Menu</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{shopName || 'Menu'}</h1>
          <p className="mt-2 text-stone-300">Today&apos;s live prices</p>
        </header>

        <div className="p-5 sm:p-8">
          {isLoading ? (
            <div className="rounded-3xl bg-stone-100 p-8 text-center text-stone-600">Loading menu...</div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center font-semibold text-amber-900">
              This menu has no items yet.
            </div>
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group.category}>
                    <h2 className="mb-3 border-b border-stone-200 pb-2 text-lg font-black tracking-wide text-stone-800">
                      {group.category}
                    </h2>
                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const price = formatPrice(item.price);
                        const unavailable = !item.is_available;
                        return (
                          <div
                            className={`flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm ${
                              unavailable ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                            }`}
                            key={item.item_id}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold">
                                {item.name}
                                {unavailable ? (
                                  <span className="ml-2 rounded-full bg-stone-300 px-2 py-0.5 text-xs font-bold text-stone-700">
                                    Unavailable
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-stone-500">{item.unit}</p>
                            </div>
                            <span className="ml-3 shrink-0 font-black">
                              {unavailable || price === null ? (
                                <span className="text-sm font-bold text-stone-400">Not available</span>
                              ) : (
                                `₹${price}`
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {updatedAt ? (
                <p className="mt-6 text-center text-sm font-medium text-stone-600">
                  Last updated {formatTimestamp(updatedAt)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default Menu;
