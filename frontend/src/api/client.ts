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
  register: async (
    username: string,
    email: string,
    password: string,
    phone?: string,
    address?: string
  ) => {
    const { data } = await api.post('/auth/registration/', {
      username,
      email,
      password,
      password_confirm: password,
      phone: phone || '',
      address: address || '',
    });
    return data;
  },
  getCurrentUser: async () => {
    const { data } = await api.get('/auth/user/');
    return data;
  },
  requestPasswordReset: async (email: string) => {
    const { data } = await api.post('/auth/password/reset/', { email });
    return data;
  },
  changePassword: async (oldPassword: string, newPassword: string, newPasswordConfirm: string) => {
    const { data } = await api.post('/auth/password/change/', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return data;
  },

  // Google OAuth
  getGoogleAuthUrl: async () => {
    const { data } = await api.get('/auth/google/url/');
    return data;
  },
  googleCallback: async (code: string) => {
    const { data } = await api.post('/auth/google/callback/', { code });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },
  googleLogin: async (idToken: string) => {
    const { data } = await api.post('/auth/google/login/', { id_token: idToken });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  // Facebook OAuth
  getFacebookAuthUrl: async () => {
    const { data } = await api.get('/auth/facebook/url/');
    return data;
  },
  facebookCallback: async (code: string) => {
    const { data } = await api.post('/auth/facebook/callback/', { code });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },
  facebookLogin: async (accessToken: string) => {
    const { data } = await api.post('/auth/facebook/login/', { access_token: accessToken });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
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

export const colors = {
  list: () => api.get('/products/colors/'),
  get: (id: number) => api.get(`/products/colors/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/products/colors/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/colors/${id}/`, data),
  delete: (id: number) => api.delete(`/products/colors/${id}/`),
};

export const sizes = {
  list: () => api.get('/products/sizes/'),
  get: (id: number) => api.get(`/products/sizes/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/products/sizes/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/sizes/${id}/`, data),
  delete: (id: number) => api.delete(`/products/sizes/${id}/`),
};

export const variants = {
  list: (params?: Record<string, unknown>) => api.get('/products/variants/', { params }),
  get: (id: number) => api.get(`/products/variants/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/products/variants/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/variants/${id}/`, data),
  delete: (id: number) => api.delete(`/products/variants/${id}/`),
};

export const categories = {
  list: () => api.get('/products/categories/'),
  get: (id: number) => api.get(`/products/categories/${id}/`),
  products: (id: number) => api.get(`/products/categories/${id}/products/`),
};

export const promotions = {
  list: () => api.get('/products/promotions/'),
  get: (id: number) => api.get(`/products/promotions/${id}/`),
  active: () => api.get('/products/promotions/active/'),
};

export const cart = {
  get: () =>
    api.get('/cart/carts/').then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      const first = list[0] as { items?: unknown[] } | undefined;
      return { data: { items: first?.items ?? [] } };
    }),
  addItem: (payload: { product_id?: number; product_variant_id?: number; quantity: number }) =>
    api.post('/cart/cart-items/', payload),
  updateItem: (id: number, quantity: number) =>
    api.patch(`/cart/cart-items/${id}/`, { quantity }),
  removeItem: (id: number) => api.delete(`/cart/cart-items/${id}/`),
};

export const orders = {
  list: () => api.get('/orders/orders/'),
  get: (id: number) => api.get(`/orders/orders/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/orders/orders/', data),
  /** Tạo đơn từ giỏ: total_price, name, phone, address */
  checkout: (data: {
    total_price: string | number;
    name: string;
    phone: string;
    address: string;
  }) => api.post('/orders/orders/checkout/', data),
};

export const reviews = {
  list: (productId?: number) => api.get('/reviews/', { params: { product: productId } }),
  create: (productId: number, rating: number) =>
    api.post('/reviews/', { product: productId, rating }),
};

/** Profile của user đăng nhập (backend trả về list chỉ có 1 phần tử) */
export const profiles = {
  getMe: () => api.get('/accounts/profiles/'),
  updateMe: (id: number, data: Record<string, unknown>) =>
    api.patch(`/accounts/profiles/${id}/`, data),
};

export const admin = {
  // Products - support FormData for image upload
  products: {
    list: (params?: Record<string, unknown>) => api.get('/products/', { params }),
    get: (id: number) => api.get(`/products/${id}/`),
    create: (data: Record<string, unknown> | FormData) => api.post('/products/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    update: (id: number, data: Record<string, unknown> | FormData) => api.put(`/products/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    delete: (id: number) => api.delete(`/products/${id}/`),
  },
  // Categories
  categories: {
    list: () => api.get('/products/categories/'),
    get: (id: number) => api.get(`/products/categories/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/products/categories/', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/products/categories/${id}/`, data),
    delete: (id: number) => api.delete(`/products/categories/${id}/`),
  },
  // Promotions
  promotions: {
    list: () => api.get('/products/promotions/'),
    get: (id: number) => api.get(`/products/promotions/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/products/promotions/', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/products/promotions/${id}/`, data),
    delete: (id: number) => api.delete(`/products/promotions/${id}/`),
  },
  // Colors
  colors: {
    list: () => api.get('/products/colors/'),
    get: (id: number) => api.get(`/products/colors/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/products/colors/', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/products/colors/${id}/`, data),
    delete: (id: number) => api.delete(`/products/colors/${id}/`),
  },
  // Sizes
  sizes: {
    list: () => api.get('/products/sizes/'),
    get: (id: number) => api.get(`/products/sizes/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/products/sizes/', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/products/sizes/${id}/`, data),
    delete: (id: number) => api.delete(`/products/sizes/${id}/`),
  },
  // Product Variants
  variants: {
    list: (params?: Record<string, unknown>) => api.get('/products/variants/', { params }),
    get: (id: number) => api.get(`/products/variants/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/products/variants/', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/products/variants/${id}/`, data),
    delete: (id: number) => api.delete(`/products/variants/${id}/`),
  },
  // Orders (backend: api/orders/ + router 'orders' => /orders/orders/)
  orders: {
    list: () => api.get('/orders/orders/'),
    get: (id: number) => api.get(`/orders/orders/${id}/`),
    update: (id: number, data: Record<string, unknown>) => api.patch(`/orders/orders/${id}/`, data),
  },
  // Users/Profiles
  users: {
    list: () => api.get('/accounts/profiles/'),
    get: (id: number) => api.get(`/accounts/profiles/${id}/`),
    update: (id: number, data: Record<string, unknown>) => api.patch(`/accounts/profiles/${id}/`, data),
  },
  // Reviews (backend: api/reviews/ + router 'reviews' => /reviews/reviews/)
  reviews: {
    list: (params?: Record<string, unknown>) => api.get('/reviews/reviews/', { params }),
    delete: (id: number) => api.delete(`/reviews/reviews/${id}/`),
  },
  // Contacts (backend: api/contact/ + router 'contacts' => /contact/contacts/)
  contacts: {
    list: () => api.get('/contact/contacts/'),
    delete: (id: number) => api.delete(`/contact/contacts/${id}/`),
  },
  // Feedbacks (backend: api/contact/ + router 'feedbacks' => /contact/feedbacks/)
  feedbacks: {
    list: () => api.get('/contact/feedbacks/'),
    delete: (id: number) => api.delete(`/contact/feedbacks/${id}/`),
  },
};
