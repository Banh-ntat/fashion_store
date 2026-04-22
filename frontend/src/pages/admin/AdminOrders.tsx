import axios from "axios";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { admin } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getAddressProvince,
  getEstimatedDeliveryTime,
  shouldShowDeliveryEstimate,
} from "../../utils/delivery";
import "../../styles/admin/Admin.css";

interface OrderUser {
  id: number;
  username: string;
}

interface OrderItemRow {
  id: number;
  product: { id: number; name: string; price: string };
  variant_info: { color: { name: string }; size: { name: string } } | null;
  quantity: number;
  price: string;
}

interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  note: string;
}

interface Order {
  id: number;
  user: OrderUser;
  subtotal: string;
  shipping_fee: string;
  total_price: string;
  status: string;
  created_at: string;
  payment_method?: string;
  gateway_status?: string;
  gateway_transaction_id?: string;
  items: OrderItemRow[];
  shipping: ShippingInfo | null;
}

const STATUS_CHOICES = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "shipping", label: "Đang giao hàng" },
  { value: "awaiting_confirmation", label: "Chờ xác nhận" },
  { value: "returning", label: "Đã hoàn trả" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

function isTerminalStatus(status: string) {
  return (
    status === "completed" || status === "cancelled" || status === "returning"
  );
}

function formatVnd(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return String(value);
  return `${new Intl.NumberFormat("vi-VN").format(n)} đ`;
}

function getPaymentMethodLabel(method?: string) {
  if (method === "vnpay") return "VNPay";
  if (method === "momo") return "Ví MoMo";
  if (method === "zalopay") return "ZaloPay";
  if (method === "wallet") return "Ví trên ứng dụng";
  if (method === "cod") return "Thanh toán khi nhận hàng (COD)";
  return method || "N/A";
}

function getGatewayStatusLabel(status?: string) {
  if (status === "paid") return "Đã thanh toán";
  if (status === "failed") return "Thanh toán thất bại";
  if (status === "pending") return "Chờ thanh toán";
  if (status === "none") return "Không qua cổng (COD)";
  return status || "N/A";
}

const PAGE_SIZE = 10;

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const statusFilter = searchParams.get("status") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
    };
    if (statusFilter) params.status = statusFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    admin.orders
      .list(params)
      .then((res) => {
        const d = res.data as { results?: Order[]; count?: number };
        if (Array.isArray(d?.results)) {
          setOrders(d.results);
          setCount(typeof d.count === "number" ? d.count : d.results.length);
        } else if (Array.isArray(res.data)) {
          setOrders(res.data as Order[]);
          setCount((res.data as Order[]).length);
        } else {
          setOrders([]);
          setCount(0);
        }
      })
      .catch((err) => {
        console.error(err);
        setOrders([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, dateFrom, dateTo]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await admin.orders.update(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      if (detail?.id === orderId) {
        setDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { detail?: string })?.detail
        : null;
      window.alert(msg ? String(msg) : "Không cập nhật được trạng thái.");
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const { data } = await admin.orders.get(id);
      setDetail(data as Order);
    } catch {
      setDetail(null);
      window.alert("Không tải được chi tiết đơn.");
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "status-pending",
      shipping: "status-shipping",
      awaiting_confirmation: "status-awaiting",
      returning: "status-returning",
      completed: "status-completed",
      cancelled: "status-cancelled",
    };
    return statusMap[status] || "";
  };

  const getStatusLabel = (status: string) =>
    STATUS_CHOICES.find((s) => s.value === status)?.label || status;

  const setStatusParam = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("status", value);
    else next.delete("status");
    next.set("page", "1");
    setSearchParams(next);
  };

  const setDateFromParam = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("date_from", value);
    else next.delete("date_from");
    next.set("page", "1");
    setSearchParams(next);
  };

  const setDateToParam = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("date_to", value);
    else next.delete("date_to");
    next.set("page", "1");
    setSearchParams(next);
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (loading && orders.length === 0) {
    return (
      <AdminLayout>
        <div className="loading">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý đơn hàng</h3>
        </div>

        <div className="admin-filters">
          <label>
            Trạng thái{" "}
            <select
              value={statusFilter}
              onChange={(e) => setStatusParam(e.target.value)}
            >
              <option value="">Tất cả</option>
              {STATUS_CHOICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Từ ngày{" "}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFromParam(e.target.value)}
            />
          </label>
          <label>
            Đến ngày{" "}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateToParam(e.target.value)}
            />
          </label>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Cập nhật</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.user?.username || "N/A"}</td>
                <td>{formatVnd(order.total_price)}</td>
                <td>
                  <span
                    className={`status-badge ${getStatusBadge(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>{new Date(order.created_at).toLocaleString("vi-VN")}</td>
                <td>
                  <select
                    className="status-select"
                    value={order.status}
                    disabled={isTerminalStatus(order.status)}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value)
                    }
                  >
                    {STATUS_CHOICES.filter((status) => {
                      if (isTerminalStatus(order.status))
                        return status.value === order.status;
                      return true;
                    }).map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => openDetail(order.id)}
                  >
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="admin-pagination">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(page - 1));
              setSearchParams(next);
            }}
          >
            ← Trước
          </button>
          <span className="numPages">
            Trang {page} / {totalPages} — {count} đơn
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(page + 1));
              setSearchParams(next);
            }}
          >
            Sau →
          </button>
        </div>

        {detail && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
          >
            <div className="modal modal--wide">
              <h3 id="order-detail-title">Chi tiết đơn #{detail.id}</h3>
              {detailLoading ? (
                <p>Đang tải…</p>
              ) : (
                <>
                  <div className="order-details">
                    <p>
                      <strong>Khách:</strong> {detail.user?.username}
                    </p>
                    <p>
                      <strong>Tạm tính:</strong> {formatVnd(detail.subtotal)} —{" "}
                      <strong>Phí ship:</strong>{" "}
                      {formatVnd(detail.shipping_fee)} — <strong>Tổng:</strong>{" "}
                      {formatVnd(detail.total_price)}
                    </p>
                    <p>
                      <strong>Trạng thái:</strong>{" "}
                      {getStatusLabel(detail.status)}
                    </p>
                    <p>
                      <strong>Ngày tạo:</strong>{" "}
                      {new Date(detail.created_at).toLocaleString("vi-VN")}
                    </p>
                    <p>
                      <strong>Phương thức:</strong>{" "}
                      {getPaymentMethodLabel(detail.payment_method)}
                      {detail.payment_method &&
                        detail.payment_method !== "cod" && (
                          <span>
                            {" "}
                            — <strong>Trạng thái cổng:</strong>{" "}
                            <span
                              className={
                                detail.gateway_status === "paid"
                                  ? "status-completed"
                                  : detail.gateway_status === "failed"
                                    ? "status-cancelled"
                                    : "status-pending"
                              }
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "13px",
                              }}
                            >
                              {getGatewayStatusLabel(detail.gateway_status)}
                            </span>
                          </span>
                        )}
                    </p>
                    {detail.shipping && (
                      <>
                        <h4>Giao hàng</h4>
                        <p>
                          {detail.shipping.name} — {detail.shipping.phone}
                        </p>
                        <p>{detail.shipping.address}</p>
                        {detail.shipping.note ? (
                          <p className="admin-muted">
                            Ghi chú: {detail.shipping.note}
                          </p>
                        ) : null}
                        {shouldShowDeliveryEstimate(detail.status) && (
                          <p style={{ color: "var(--success-color, #22c55e)" }}>
                            <strong>Dự kiến nhận hàng:</strong>{" "}
                            {getEstimatedDeliveryTime(
                              getAddressProvince(detail.shipping.address),
                              detail.created_at,
                            )}
                          </p>
                        )}
                      </>
                    )}
                    <h4>Sản phẩm</h4>
                    <table className="data-table data-table--compact">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Biến thể</th>
                          <th>SL</th>
                          <th>Đơn giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.items || []).map((line) => (
                          <tr key={line.id}>
                            <td>{line.product?.name}</td>
                            <td>
                              {line.variant_info
                                ? `${line.variant_info.color?.name} / ${line.variant_info.size?.name}`
                                : "—"}
                            </td>
                            <td>{line.quantity}</td>
                            <td>{formatVnd(line.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
