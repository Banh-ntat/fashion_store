import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from "axios";

const API_BASE = "/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !(originalRequest as { _retry?: boolean })._retry
    ) {
      (originalRequest as { _retry?: boolean })._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem("access_token", data.access);
          if (data.refresh) {
            localStorage.setItem("refresh_token", data.refresh);
          }
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export const auth = {
  login: async (username: string, password: string) => {
    const { data } = await api.post("/auth/token/", { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
  register: async (
    username: string,
    email: string,
    password: string,
    phone?: string,
    address?: string,
  ) => {
    const { data } = await api.post("/auth/registration/", {
      username,
      email,
      password,
      password_confirm: password,
      phone: phone || "",
      address: address || "",
    });
    return data;
  },
  getCurrentUser: async () => {
    const { data } = await api.get("/auth/user/");
    return data;
  },
  requestPasswordReset: async (email: string) => {
    const { data } = await api.post("/auth/password/reset/", { email });
    return data;
  },
  confirmPasswordReset: async (body: {
    user_id: number;
    token: string;
    new_password: string;
    new_password_confirm: string;
  }) => {
    const { data } = await api.post("/auth/password/reset/confirm/", body);
    return data;
  },
  changePassword: async (
    oldPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ) => {
    const { data } = await api.post("/auth/password/change/", {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return data;
  },

  // Google OAuth
  getGoogleAuthUrl: async () => {
    const { data } = await api.get("/auth/google/url/");
    return data;
  },
  googleCallback: async (code: string) => {
    try {
      const { data } = await api.post<{
        access?: string;
        refresh?: string;
        error?: string;
      }>("/auth/google/callback/", { code });
      if (!data?.access) {
        throw new Error(data?.error || "Đăng nhập Google thất bại");
      }
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh ?? "");
      return data;
    } catch (err) {
      const ax = axios.isAxiosError(err) ? err : null;
      const d = ax?.response?.data as
        | { error?: string; detail?: unknown }
        | undefined;
      const msg =
        (typeof d?.error === "string" && d.error) ||
        (typeof d?.detail === "string" ? d.detail : "") ||
        (err instanceof Error ? err.message : "") ||
        "Đăng nhập Google thất bại";
      throw new Error(msg);
    }
  },
  googleLogin: async (idToken: string) => {
    const { data } = await api.post("/auth/google/login/", {
      id_token: idToken,
    });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  },

  // Facebook OAuth
  getFacebookAuthUrl: async () => {
    const { data } = await api.get("/auth/facebook/url/");
    return data;
  },
  facebookCallback: async (code: string) => {
    try {
      const { data } = await api.post<{
        access?: string;
        refresh?: string;
        error?: string;
      }>("/auth/facebook/callback/", { code });
      if (!data?.access) {
        throw new Error(data?.error || "Đăng nhập Facebook thất bại");
      }
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh ?? "");
      return data;
    } catch (err) {
      const ax = axios.isAxiosError(err) ? err : null;
      const d = ax?.response?.data as
        | { error?: string; detail?: unknown }
        | undefined;
      const msg =
        (typeof d?.error === "string" && d.error) ||
        (typeof d?.detail === "string" ? d.detail : "") ||
        (err instanceof Error ? err.message : "") ||
        "Đăng nhập Facebook thất bại";
      throw new Error(msg);
    }
  },
  facebookLogin: async (accessToken: string) => {
    const { data } = await api.post("/auth/facebook/login/", {
      access_token: accessToken,
    });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  },
};

export const products = {
  list: (params?: Record<string, unknown>) => api.get("/products/", { params }),
  get: (id: number) => api.get(`/products/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/products/", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  featured: () => api.get("/products/featured/"),
  hotDeals: () => api.get("/products/hot_deals/"),
  newArrivals: () => api.get("/products/new_arrivals/"),
  related: (id: number) => api.get(`/products/${id}/related/`),
};

export const colors = {
  list: () => api.get("/products/colors/"),
  get: (id: number) => api.get(`/products/colors/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post("/products/colors/", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/products/colors/${id}/`, data),
  delete: (id: number) => api.delete(`/products/colors/${id}/`),
};

export const sizes = {
  list: () => api.get("/products/sizes/"),
  get: (id: number) => api.get(`/products/sizes/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/products/sizes/", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/products/sizes/${id}/`, data),
  delete: (id: number) => api.delete(`/products/sizes/${id}/`),
};

export const variants = {
  list: (params?: Record<string, unknown>) =>
    api.get("/products/variants/", { params }),
  get: (id: number) => api.get(`/products/variants/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post("/products/variants/", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/products/variants/${id}/`, data),
  delete: (id: number) => api.delete(`/products/variants/${id}/`),
};

export const categories = {
  list: () => api.get("/products/categories/"),
  get: (id: number) => api.get(`/products/categories/${id}/`),
  products: (id: number) => api.get(`/products/categories/${id}/products/`),
};

export const promotions = {
  list: () => api.get("/products/promotions/"),
  get: (id: number) => api.get(`/products/promotions/${id}/`),
  active: () => api.get("/products/promotions/active/"),
};

export const cart = {
  get: () =>
    api.get("/cart/carts/").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      const first = list[0] as { items?: unknown[] } | undefined;
      return { data: { items: first?.items ?? [] } };
    }),
  addItem: (payload: {
    product_id?: number;
    product_variant_id?: number;
    quantity: number;
  }) => api.post("/cart/cart-items/", payload),
  updateItem: (id: number, quantity: number) =>
    api.patch(`/cart/cart-items/${id}/`, { quantity }),
  removeItem: (id: number) => api.delete(`/cart/cart-items/${id}/`),
};

export const orders = {
  list: () => api.get("/orders/orders/"),
  get: (id: number) => api.get(`/orders/orders/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/orders/orders/", data),
  cancel: (id: number) => api.post(`/orders/orders/${id}/cancel/`),
  confirmReceived: (id: number) =>
    api.post(`/orders/orders/${id}/confirm-received/`),
  discountPreview: (data: {
    discount_code?: string;
    cart_item_ids?: number[];
  }) => api.post("/orders/orders/discount-preview/", data),
  checkout: (data: {
    name: string;
    phone: string;
    address: string;
    note?: string;
    discount_code?: string;
    cart_item_ids?: number[];
  }) => api.post("/orders/orders/checkout/", data),
};

export const reviews = {
  list: (productId?: number) =>
    api.get("/reviews/reviews/", { params: { product: productId } }),
  getMyReviews: () => api.get("/reviews/reviews/my_reviews/"),
  getPurchasable: () => api.get("/reviews/reviews/purchasable/"),
  getByProduct: (productId: number) =>
    api.get(`/reviews/reviews/by_product/${productId}/`),
  create: (data: {
    product: number;
    rating: number;
    feedback_type?: string;
    content?: string;
  }) => api.post("/reviews/reviews/", data),
  delete: (id: number) => api.delete(`/reviews/reviews/${id}/`),
};

export const profiles = {
  getMe: () => api.get("/accounts/profiles/"),
  updateMe: (id: number, data: Record<string, unknown>) =>
    api.patch(`/accounts/profiles/${id}/`, data),

  updateAvatar: (id: number, data: FormData) =>
    api.patch(`/accounts/profiles/${id}/`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
};
export type ContactSubjectOption = { value: string; label: string };
export type ContactMeta = {
  brand: string;
  hotline_display: string;
  hotline_e164: string;
  email: string;
  address: string;
  hours: string;
  response_note: string;
  stats: { label: string; value: string }[];
  subject_options: ContactSubjectOption[];
};

/** Form liên hệ / góp ý công khai; chính sách đọc từ API */
export const site = {
  getContactMeta: () => api.get<ContactMeta>("/contact/meta/"),
  sendContact: (data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }) => api.post("/contact/contacts/", data),
  sendFeedback: (message: string) =>
    api.post("/contact/feedbacks/", { message }),
  getPolicies: () => api.get("/contact/policies/"),
};

/** Yêu thích — lưu trên server (cần đăng nhập) */
/** Thống kê dashboard admin (GET /api/core/dashboard/stats/) */
export type AdminDashboardStats = {
  revenue_today: string;
  revenue_week: string;
  revenue_month: string;
  orders_today: number;
  orders_total: number;
  pending_orders: number;
  stale_pending_order_ids: number[];
  low_stock_threshold: number;
  low_stock_variants: number;
  low_stock_products: number;
  unhandled_contacts: number;
  unhandled_feedbacks: number;
  catalog: { products: number; variants: number; categories: number };
  revenue_series: {
    date: string;
    label: string;
    revenue: string;
    orders: number;
  }[];
  orders_by_status: Record<string, number>;
  top_products: { id: number; name: string; revenue: string }[];
};

export const wishlistApi = {
  getIds: () => api.get<{ product_ids: number[] }>("/wishlist/items/"),
  toggle: (productId: number) =>
    api.post<{ in_wishlist: boolean; product_ids: number[] }>(
      "/wishlist/toggle/",
      {
        product_id: productId,
      },
    ),
  sync: (productIds: number[]) =>
    api.post<{ product_ids: number[] }>("/wishlist/sync/", {
      product_ids: productIds,
    }),
};

export const returns = {
  list: () => api.get("/orders/returns/"),
  create: (data: { order: number; reason: string; description?: string }) =>
    api.post("/orders/returns/", data),
  approve: (id: number, adminNote?: string) =>
    api.post(`/orders/returns/${id}/approve/`, { admin_note: adminNote ?? "" }),
  reject: (id: number, adminNote?: string) =>
    api.post(`/orders/returns/${id}/reject/`, { admin_note: adminNote ?? "" }),
  complete: (id: number, adminNote?: string) =>
    api.post(`/orders/returns/${id}/complete/`, {
      admin_note: adminNote ?? "",
    }),
};

export const admin = {
  dashboard: {
    stats: () => api.get<AdminDashboardStats>("/core/dashboard/stats/"),
  },
  policies: {
    list: () => api.get("/contact/policies/"),
    create: (data: { title: string; content: string }) =>
      api.post("/contact/policies/", data),
    update: (id: number, data: Record<string, unknown>) =>
      api.patch(`/contact/policies/${id}/`, data),
    delete: (id: number) => api.delete(`/contact/policies/${id}/`),
  },
  // Products - support FormData for image upload
  products: {
    list: (params?: Record<string, unknown>) =>
      api.get("/products/", { params }),
    get: (id: number) => api.get(`/products/${id}/`),
    create: (data: Record<string, unknown> | FormData) =>
      api.post("/products/", data, {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      }),
    update: (id: number, data: Record<string, unknown> | FormData) =>
      api.put(`/products/${id}/`, data, {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      }),
    delete: (id: number) => api.delete(`/products/${id}/`),
  },
  // Categories
  categories: {
    list: () => api.get("/products/categories/"),
    get: (id: number) => api.get(`/products/categories/${id}/`),
    create: (data: Record<string, unknown> | FormData) =>
      api.post("/products/categories/", data, {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      }),
    update: (id: number, data: Record<string, unknown> | FormData) =>
      api.put(`/products/categories/${id}/`, data, {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      }),
    delete: (id: number) => api.delete(`/products/categories/${id}/`),
  },
  // Promotions
  promotions: {
    list: () => api.get("/products/promotions/"),
    get: (id: number) => api.get(`/products/promotions/${id}/`),
    create: (data: Record<string, unknown>) =>
      api.post("/products/promotions/", data),
    update: (id: number, data: Record<string, unknown>) =>
      api.put(`/products/promotions/${id}/`, data),
    delete: (id: number) => api.delete(`/products/promotions/${id}/`),
  },
  // Colors
  colors: {
    list: () => api.get("/products/colors/"),
    get: (id: number) => api.get(`/products/colors/${id}/`),
    create: (data: Record<string, unknown>) =>
      api.post("/products/colors/", data),
    update: (id: number, data: Record<string, unknown>) =>
      api.put(`/products/colors/${id}/`, data),
    delete: (id: number) => api.delete(`/products/colors/${id}/`),
  },
  // Sizes
  sizes: {
    list: () => api.get("/products/sizes/"),
    get: (id: number) => api.get(`/products/sizes/${id}/`),
    create: (data: Record<string, unknown>) =>
      api.post("/products/sizes/", data),
    update: (id: number, data: Record<string, unknown>) =>
      api.put(`/products/sizes/${id}/`, data),
    delete: (id: number) => api.delete(`/products/sizes/${id}/`),
  },
  // Product Variants
  variants: {
    list: (params?: Record<string, unknown>) =>
      api.get("/products/variants/", { params }),
    get: (id: number) => api.get(`/products/variants/${id}/`),
    create: (data: Record<string, unknown>) =>
      api.post("/products/variants/", data),
    update: (id: number, data: Record<string, unknown>) =>
      api.put(`/products/variants/${id}/`, data),
    delete: (id: number) => api.delete(`/products/variants/${id}/`),
  },
  // Orders (backend: api/orders/ + router 'orders' => /orders/orders/)
  orders: {
    list: (params?: Record<string, unknown>) =>
      api.get("/orders/orders/", { params }),
    get: (id: number) => api.get(`/orders/orders/${id}/`),
    update: (id: number, data: Record<string, unknown>) =>
      api.patch(`/orders/orders/${id}/`, data),
  },
  discountCodes: {
    list: () => api.get("/orders/discount-codes/"),
    get: (id: number) => api.get(`/orders/discount-codes/${id}/`),
    create: (data: Record<string, unknown>) =>
      api.post("/orders/discount-codes/", data),
    update: (id: number, data: Record<string, unknown>) =>
      api.put(`/orders/discount-codes/${id}/`, data),
    delete: (id: number) => api.delete(`/orders/discount-codes/${id}/`),
  },
  // Users/Profiles
  users: {
    list: () => api.get("/accounts/profiles/"),
    get: (id: number) => api.get(`/accounts/profiles/${id}/`),
    update: (id: number, data: Record<string, unknown>) =>
      api.patch(`/accounts/profiles/${id}/`, data),
  },
  // Reviews (backend: api/reviews/ + router 'reviews' => /reviews/reviews/)
  reviews: {
    list: (params?: Record<string, unknown>) =>
      api.get("/reviews/reviews/", { params }),
    update: (id: number, data: Record<string, unknown>) =>
      api.patch(`/reviews/reviews/${id}/`, data),
    delete: (id: number) => api.delete(`/reviews/reviews/${id}/`),
  },
  // Contacts (backend: api/contact/ + router 'contacts' => /contact/contacts/)
  contacts: {
    list: () => api.get("/contact/contacts/"),
    patch: (id: number, data: Record<string, unknown>) =>
      api.patch(`/contact/contacts/${id}/`, data),
    delete: (id: number) => api.delete(`/contact/contacts/${id}/`),
  },
  // Feedbacks (backend: api/contact/ + router 'feedbacks' => /contact/feedbacks/)
  feedbacks: {
    list: () => api.get("/contact/feedbacks/"),
    patch: (id: number, data: Record<string, unknown>) =>
      api.patch(`/contact/feedbacks/${id}/`, data),
    delete: (id: number) => api.delete(`/contact/feedbacks/${id}/`),
  },
  returns: {
    list: (params?: Record<string, unknown>) =>
      api.get("/orders/returns/", { params }),
    approve: (id: number, adminNote?: string) =>
      api.post(`/orders/returns/${id}/approve/`, {
        admin_note: adminNote ?? "",
      }),
    reject: (id: number, adminNote?: string) =>
      api.post(`/orders/returns/${id}/reject/`, {
        admin_note: adminNote ?? "",
      }),
    complete: (id: number, adminNote?: string) =>
      api.post(`/orders/returns/${id}/complete/`, {
        admin_note: adminNote ?? "",
      }),
  },
};

export const discountCodes = {
  listActive: () => api.get("/orders/discount-codes/active/"),
};
