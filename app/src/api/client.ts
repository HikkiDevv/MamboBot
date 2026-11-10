const DEFAULT_API_URL = 'http://localhost:4000/api';

export function getApiBaseUrl(): string {
  return localStorage.getItem('mambobot_api_url') || DEFAULT_API_URL;
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem('mambobot_api_url', url.replace(/\/+$/, ''));
}

export function getToken(): string | null {
  return localStorage.getItem('mambobot_token');
}

export function setToken(token: string) {
  localStorage.setItem('mambobot_token', token);
}

export function clearAuth() {
  localStorage.removeItem('mambobot_token');
  localStorage.removeItem('mambobot_user');
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
  }

  return data as T;
}
