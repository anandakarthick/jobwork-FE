import axios from 'axios';

export const TOKEN_KEY = 'jobwork.token';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // For file uploads (FormData), drop the default JSON content-type so the
  // browser sets multipart/form-data with the correct boundary. Otherwise
  // axios serialises the FormData to JSON and the files are lost.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Any 401 means the stored token is gone or stale: drop it and bounce to login.
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Pulls the human-readable message out of an axios error. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; details?: { message: string }[] } | undefined;
    if (data?.details?.length) return data.details.map((d) => d.message).join(', ');
    return data?.message ?? error.message;
  }
  return fallback;
}
