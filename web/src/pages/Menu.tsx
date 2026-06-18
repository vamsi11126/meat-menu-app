import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

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

type ShopPricesResponse = PriceRecord | PriceRecord[] | {
  shop_name?: string | null;
  prices?: PriceRecord | null;
};

type NormalizedPriceResponse = {
  price: PriceRecord | null;
  shopName: string | null;
};

const menuItems = [
  { english: 'Chicken', telugu: 'చికెన్', key: 'chicken_kg' },
  { english: 'Mutton', telugu: 'మటన్', key: 'mutton_kg' },
  { english: 'Fish', telugu: 'చేప', key: 'fish_kg' },
  { english: 'Eggs', telugu: 'గుడ్లు', key: 'eggs_kg' },
] as const;

const getTodayKey = () => new Date().toISOString().split('T')[0];

const formatPrice = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const isUnavailablePrice = (value: number | string | null | undefined) =>
  value == null || Number(value) <= 0;

const renderMenuPrice = (value: number | string | null | undefined, telugu = false) => {
  if (isUnavailablePrice(value)) {
    return telugu ? 'అందుబాటులో లేదు' : 'Not available';
  }

  return `₹${formatPrice(value)}/kg`;
};

const formatTime = (value: string | null) => {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const normalizePriceResponse = (data: ShopPricesResponse): NormalizedPriceResponse => {
  if (Array.isArray(data)) {
    const today = getTodayKey();
    return {
      price: data.find((record) => String(record.date).slice(0, 10) === today) || null,
      shopName: data[0]?.shop_name || null,
    };
  }

  if ('prices' in data) {
    return {
      price: data.prices || null,
      shopName: data.shop_name || data.prices?.shop_name || null,
    };
  }

  const price = data as PriceRecord;

  return {
    price,
    shopName: price.shop_name || null,
  };
};

const fetchPublicPrices = async (shopId: string) => {
  try {
    const response = await api.get<ShopPricesResponse>(`/api/shops/${shopId}/prices`);
    return normalizePriceResponse(response.data);
  } catch {
    const response = await api.get<PriceRecord[]>(`/api/prices/shop/${shopId}`);
    return normalizePriceResponse(response.data);
  }
};

const Menu = () => {
  const { shopId } = useParams();
  const [shopName, setShopName] = useState('');
  const [prices, setPrices] = useState<PriceRecord | null>(null);
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
        const result = await fetchPublicPrices(shopId);
        setShopName(result.shopName || `Shop #${shopId}`);
        setPrices(result.price);
      } catch {
        setError('Unable to load today&apos;s menu.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMenu();
  }, [shopId]);

  return (
    <main className="min-h-screen bg-[#f8efe3] px-4 py-6 text-stone-950">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="bg-stone-950 px-6 py-8 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">Today&apos;s Meat Menu</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{shopName || 'Meat Menu'}</h1>
          <p className="mt-2 text-stone-300">Fresh prices per kg</p>
        </header>

        <div className="p-5 sm:p-8">
          {isLoading ? (
            <div className="rounded-3xl bg-stone-100 p-8 text-center text-stone-600">Loading menu...</div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && !prices ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center font-semibold text-amber-900">
              Prices not updated yet for today
            </div>
          ) : null}

          {!isLoading && !error && prices ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <h2 className="mb-4 text-center text-lg font-black">English</h2>
                  <div className="space-y-3">
                    {menuItems.map((item) => (
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm" key={item.key}>
                        <span className="font-semibold">{item.english}</span>
                        <span className="font-black">{renderMenuPrice(prices[item.key])}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <h2 className="mb-4 text-center text-lg font-black">తెలుగు</h2>
                  <div className="space-y-3">
                    {menuItems.map((item) => (
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm" key={item.key}>
                        <span className="font-semibold">{item.telugu}</span>
                        <span className="font-black">{renderMenuPrice(prices[item.key], true)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-sm font-medium text-stone-600">
                Prices updated today at {formatTime(prices.updated_at)}
              </p>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default Menu;
