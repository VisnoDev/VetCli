import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiBaseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response?.status === 401;
    const isRefreshRoute = original?.url === '/auth/refresh';
    const isLoginRoute = original?.url === '/auth/login';

    if (is401 && !original?._retry && !isRefreshRoute && !isLoginRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((e) => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('usuario');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status ?? 0;
    const message =
      (error.response?.data as any)?.message ||
      (status === 403 ? 'Sem permissão para esta ação.' :
       status === 404 ? 'Registro não encontrado.' :
       status >= 500 ? 'Erro no servidor. Tente novamente.' :
       error.message || 'Erro inesperado.');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('clinicao:toast', { detail: { message, type: 'error' } }),
      );
    }

    return Promise.reject(error);
  },
);

export default api;
