import { apiRequest } from './client';
import type { AuthMeResponse, AuthResponse, OwnerTodayPrices, ShopDetails } from '../types';

export function loginRequest(email: string, password: string) {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function fetchCurrentUser(token: string) {
  return apiRequest<AuthMeResponse>('/api/auth/me', { token });
}

export function fetchTodayPrices(token: string) {
  return apiRequest<OwnerTodayPrices>('/api/prices/me/today', { token });
}

export function updateTodayPrices(
  token: string,
  prices: {
    chicken_kg: number;
    mutton_kg: number;
    fish_kg: number;
    eggs_kg: number;
  }
) {
  return apiRequest<OwnerTodayPrices>('/api/prices/me/today', {
    method: 'PUT',
    token,
    body: prices,
  });
}

export function fetchOwnerShop(token: string) {
  return apiRequest<ShopDetails>('/api/shops/me', { token });
}
