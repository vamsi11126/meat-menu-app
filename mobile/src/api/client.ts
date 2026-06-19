const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://meat-menu-app.onrender.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  token?: string | null;
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const raw = await response.text();

  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    console.log('Non-JSON response from', `${API_BASE_URL}${path}`, `(status ${response.status}):`, raw.slice(0, 300));
    throw new Error(
      `Server returned non-JSON (status ${response.status}). The backend may be down or unreachable through the tunnel.`
    );
  }

  if (!response.ok) {
    throw new Error((data as { error?: string })?.error || 'Request failed');
  }

  return data as T;
}

export { API_BASE_URL };
