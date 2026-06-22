import api from './axios';

export type BusinessType = 'daily_menu' | 'static_menu';

export type Shop = {
  id: number;
  name: string;
  address: string;
  business_type: BusinessType;
  description: string | null;
  qr_code_url: string;
  qr_target_url?: string;
  created_at?: string;
};

export type Category = {
  id: number;
  shop_id: number;
  name: string;
  display_order: number;
  created_at?: string;
};

export type Item = {
  id: number;
  shop_id: number;
  category_id: number | null;
  category_name: string | null;
  category_display_order?: number | null;
  name: string;
  price: number | string;
  unit: string;
  is_available: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

// One resolved item from GET /api/shops/:id/prices. `price` is null when no
// price has been set (daily_menu item with no entry today or ever).
export type PricedItem = {
  item_id: number;
  name: string;
  unit: string;
  is_available: boolean;
  category_id: number | null;
  category_name: string | null;
  display_order: number;
  price: number | string | null;
  price_date?: string | null;
  updated_at?: string | null;
};

export type ShopPrices = {
  shop_id: number;
  shop_name: string;
  business_type: BusinessType;
  items: PricedItem[];
};

// Units offered when creating/editing an item.
export const UNIT_OPTIONS = [
  'per glass',
  'per piece',
  'per kg',
  'per plate',
  'per litre',
  'per dozen',
] as const;

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallback;
  }

  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || fallback;
};

// "Not set" prices come back as null; treat that distinctly from a real 0.
export const formatPrice = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value));
};

// --- Fetch helpers ---

export const fetchMyShop = async () => {
  const response = await api.get<Shop>('/api/shops/me');
  return response.data;
};

export const fetchShopPrices = async (shopId: number) => {
  const response = await api.get<ShopPrices>(`/api/shops/${shopId}/prices`);
  return response.data;
};

export const fetchCategories = async (shopId: number) => {
  const response = await api.get<Category[]>(`/api/shops/${shopId}/categories`);
  return response.data;
};

export const fetchItems = async (shopId: number) => {
  const response = await api.get<Item[]>(`/api/shops/${shopId}/items`);
  return response.data;
};

// --- Owner mutations ---

export const updateShopName = (name: string) =>
  api.put('/api/shops/me/name', { name });

export const createCategory = (name: string, display_order: number) =>
  api.post<Category>('/api/shops/me/categories', { name, display_order });

export const updateCategory = (
  id: number,
  patch: Partial<Pick<Category, 'name' | 'display_order'>>,
) => api.put<Category>(`/api/shops/me/categories/${id}`, patch);

export const deleteCategory = (id: number) =>
  api.delete(`/api/shops/me/categories/${id}`);

export type ItemInput = {
  name: string;
  price: number;
  unit: string;
  category_id: number | null;
  display_order?: number;
};

export const createItem = (input: ItemInput) =>
  api.post<Item>('/api/shops/me/items', input);

export const updateItem = (id: number, patch: Partial<ItemInput>) =>
  api.put<Item>(`/api/shops/me/items/${id}`, patch);

export const deleteItem = (id: number) =>
  api.delete(`/api/shops/me/items/${id}`);

export const setItemAvailability = (id: number, is_available: boolean) =>
  api.patch<Item>(`/api/shops/me/items/${id}/availability`, { is_available });

export const savePrices = (prices: { item_id: number; price: number }[]) =>
  api.post<ShopPrices>('/api/shops/me/prices', { prices });
