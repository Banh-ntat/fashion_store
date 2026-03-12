import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Interceptor for requests khoakhoa
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !(originalRequest as { _retry?: boolean })._retry) {
      (originalRequest as { _retry?: boolean })._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (username: string, password: string) => {
    const { data } = await api.post('/auth/token/', { username, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  register: async (username: string, email: string, password: string) => {
    const { data } = await api.post('/auth/registration/', { username, email, password });
    return data;
  },
  getCurrentUser: async () => {
    const { data } = await api.get('/auth/user/');
    return data;
  },
};

export const products = {
  list: (params?: Record<string, unknown>) => api.get('/products/', { params }),
  get: (id: number) => api.get(`/products/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/products/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  featured: () => api.get('/products/featured/'),
  hotDeals: () => api.get('/products/hot_deals/'),
  newArrivals: () => api.get('/products/new_arrivals/'),
  related: (id: number) => api.get(`/products/${id}/related/`),
};

export const categories = {
  list: () => api.get('/categories/'),
  get: (id: number) => api.get(`/categories/${id}/`),
  products: (id: number) => api.get(`/categories/${id}/products/`),
};

export const promotions = {
  list: () => api.get('/promotions/'),
  get: (id: number) => api.get(`/promotions/${id}/`),
  active: () => api.get('/promotions/active/'),
};

export const cart = {
  get: () => api.get('/cart/'),
  addItem: (productId: number, quantity: number) =>
    api.post('/cart-items/', { product_id: productId, quantity }),
  updateItem: (id: number, quantity: number) =>
    api.patch(`/cart-items/${id}/`, { quantity }),
  removeItem: (id: number) => api.delete(`/cart-items/${id}/`),
};

export const orders = {
  list: () => api.get('/orders/'),
  get: (id: number) => api.get(`/orders/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/orders/', data),
};

export const reviews = {
  list: (productId?: number) => api.get('/reviews/', { params: { product: productId } }),
  create: (productId: number, rating: number) =>
    api.post('/reviews/', { product: productId, rating }),
};
