export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: 'shop_owner' | 'super_admin';
  shop_id: number | null;
}

export interface AuthResponse {
  token: string;
  user: AppUser;
}

export interface AuthMeResponse {
  user: AppUser;
}

export interface OwnerTodayPrices {
  shop_id: number;
  shop_name: string;
  address: string;
  date: string;
  chicken_kg: number;
  mutton_kg: number;
  fish_kg: number;
  eggs_kg: number;
  updated_at: string | null;
}

export interface ShopDetails {
  id: number;
  name: string;
  address: string;
  qr_code_url: string;
  qr_target_url?: string;
  created_at: string;
}

export interface PriceFormValues {
  chicken_kg: string;
  mutton_kg: string;
  fish_kg: string;
  eggs_kg: string;
}
