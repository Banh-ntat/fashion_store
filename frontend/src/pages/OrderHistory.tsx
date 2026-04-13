import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { orders, reviews, returns } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Order, PurchasableProduct } from "../types";
import { getAddressProvince, getEstimatedDeliveryTime, shouldShowDeliveryEstimate } from "../utils/delivery";
import "../styles/pages/OrderHistory.css";

/** Gợi ý theo mã VNPay (một phần — khớp backend payments/vnpay.py) */
const VNPAY_FAIL_HINTS: Record<string, string> = {
  "00": "Giao dịch thành công.",
  "07": "Giao dịch bị nghi ngờ (kiểm tra thêm tại ngân hàng).",
  "09": "Thẻ/chưa đăng ký Internet Banking.",
  "10": "OTP không đúng.",
  "11": "Hết hạn OTP.",
  "12": "Thẻ bị khóa.",
  "13": "Sai mật khẩu thanh toán quá số lần.",
  "24": "Giao dịch đã hủy.",
  "51": "Không đủ số dư.",
  "65": "Vượt hạn mức trong ngày.",
  "75": "Ngân hàng đang bảo trì.",
  "79": "Sai mật khẩu thanh toán quá số lần.",
  "15": "Hết thời gian chờ thanh toán — thử lại và hoàn tất ngay trên cổng VNPay.",
  "70": "Sai chữ ký cổng thanh toán. Kiểm tra cấu hình VNPay (TMN/Secret), thử không ép VNPAYQR.",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xử lý",
  shipping: "Đang giao",
  awaiting_confirmation: "Chờ xác nhận",
  returning: "Đã hoàn trả",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const REASON_OPTIONS = [
  { value: "wrong_item", label: "Sản phẩm sai" },
  { value: "damaged", label: "Sản phẩm hỏng/lỗi" },
  { value: "not_as_described", label: "Không đúng mô tả" },
  { value: "changed_mind", label: "Thay đổi quyết định" },
  { value: "other", label: "Lý do khác" },
];

function getPaymentMethodLabel(method?: string) {
  if (method === "vnpay") return "VNPay";
  if (method === "momo") return "Ví MoMo";
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

// Phải khớp với RETURN_WINDOW trong orders/constants.py
// Production: 2 * 24 * 60 * 60 * 1000 (2 ngày)
// Test:       2 * 60 * 1000            (2 phút)
const RETURN_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const isReturnWindowOpen = (order: Order): boolean => {
  if (!order.confirmed_by_user) return true;
  if (!order.completed_at) return false;
  return Date.now() - new Date(order.completed_at).getTime() < RETURN_WINDOW_MS;
};

/** Số phút còn lại trong cửa sổ hoàn trả */
const minutesRemaining = (order: Order): number => {
  if (!order.completed_at) return 0;
  const ms =
    new Date(order.completed_at).getTime() + RETURN_WINDOW_MS - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60)));
};

/** Label hiển thị thời gian còn lại, ví dụ "3 phút" hoặc "5 giờ" */
const remainingLabel = (order: Order): string | null => {
  const mins = minutesRemaining(order);
  if (mins <= 0 || mins > 24 * 60) return null;
  return mins < 60 ? `${mins} phút` : `${Math.ceil(mins / 60)} giờ`;
};

type OrderHistoryProps = { embedded?: boolean };

export default function OrderHistory({ embedded = false }: OrderHistoryProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shellClass = embedded
    ? "order-history-page order-history-page--embed"
    : "pageSection order-history-page";
  const innerClass = embedded
    ? "sectionContainer customer-account-embedInner"
    : "sectionContainer";
  const loginRedirect = embedded
    ? "/login?redirect=/dashboard/orders"
    : "/login";
  const clearedPlacedState = useRef(false);
  const [list, setList] = useState<Order[]>([]);
  const [purchasableItems, setPurchasableItems] = useState<
    PurchasableProduct[]
  >([]);
  const [returnedOrderIds, setReturnedOrderIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [showOrderPlacedBanner, setShowOrderPlacedBanner] = useState(false);
  const [paymentRedirectNotice, setPaymentRedirectNotice] = useState<
    "success" | "failed" | null
  >(null);
  const [vnpayFailHint, setVnpayFailHint] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancelErrorId, setCancelErrorId] = useState<number | null>(null);
  const [cancelErrorMsg, setCancelErrorMsg] = useState("");
  const [confirmReceivedId, setConfirmReceivedId] = useState<number | null>(
    null,
  );
  const [receivedLoadingId, setReceivedLoadingId] = useState<number | null>(
    null,
  );
  const [showReturnFormId, setShowReturnFormId] = useState<number | null>(null);
  const [returnForm, setReturnForm] = useState({ reason: "", description: "" });
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnSuccessId, setReturnSuccessId] = useState<number | null>(null);

  useEffect(() => {
    if (clearedPlacedState.current) return;
    const state = location.state as { orderPlaced?: boolean } | null;
    if (state?.orderPlaced) {
      clearedPlacedState.current = true;
      setShowOrderPlacedBanner(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const p = searchParams.get("payment");
    const vnpRc = searchParams.get("vnp_rc");
    if (p === "success" || p === "failed") {
      setPaymentRedirectNotice(p);
      if (p === "failed" && vnpRc) {
        setVnpayFailHint(VNPAY_FAIL_HINTS[vnpRc] ?? null);
      } else {
        setVnpayFailHint(null);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([orders.list(), reviews.getPurchasable(), returns.list()])
      .then(([ordersRes, purchasableRes, returnsRes]) => {
        const orderData = ordersRes.data as Order[] | { results?: Order[] };
        setList(
          Array.isArray(orderData) ? orderData : (orderData.results ?? []),
        );
        setPurchasableItems(
          (purchasableRes?.data ?? []) as PurchasableProduct[],
        );
        const returnData = returnsRes.data as
          | { order: number }[]
          | { results?: { order: number }[] };
        const returnArr = Array.isArray(returnData)
          ? returnData
          : (returnData.results ?? []);
        setReturnedOrderIds(new Set(returnArr.map((r) => r.order)));
      })
      .catch(() => {
        setList([]);
        setPurchasableItems([]);
        setReturnedOrderIds(new Set());
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleConfirmReceived = async (orderId: number) => {
    setReceivedLoadingId(orderId);
    try {
      const res = await orders.confirmReceived(orderId);
      const updated = res.data as Order;
      setList((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)),
      );
      setConfirmReceivedId(null);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      alert(detail ?? "Không thể xác nhận. Vui lòng thử lại.");
    } finally {
      setReceivedLoadingId(null);
    }
  };

  const handleSubmitReturn = async (orderId: number) => {
    if (!returnForm.reason) {
      setReturnError("Vui lòng chọn lý do.");
      return;
    }
    setReturnSubmitting(true);
    setReturnError("");
    try {
      await returns.create({
        order: orderId,
        reason: returnForm.reason,
        description: returnForm.description,
      });
      setShowReturnFormId(null);
      setReturnForm({ reason: "", description: "" });
      setReturnedOrderIds((prev) => new Set([...prev, orderId]));
      setReturnSuccessId(orderId);
      setTimeout(
        () => setReturnSuccessId((prev) => (prev === orderId ? null : prev)),
        5000,
      );
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setReturnError(detail ?? "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleCancelRequest = (orderId: number) => {
    setCancelErrorId(null);
    setCancelErrorMsg("");
    setConfirmCancelId(orderId);
  };

  const handleCancelConfirm = async () => {
    if (confirmCancelId === null) return;
    const orderId = confirmCancelId;
    setConfirmCancelId(null);
    setCancellingId(orderId);
    setCancelErrorId(null);
    setCancelErrorMsg("");
    try {
      await orders.cancel(orderId);
      setList((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)),
      );
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setCancelErrorId(orderId);
      setCancelErrorMsg(detail ?? "Không thể hủy đơn hàng. Vui lòng thử lại.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRetryPayment = async (order: Order) => {
    setCancelErrorId(null);
    setCancelErrorMsg("");
    setRetryingId(order.id);
    try {
      const res = await orders.retryPayment(order.id);
      const data = res.data as { payment_url?: string };
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error("Không lấy được đường dẫn thanh toán.");
      }
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setCancelErrorId(order.id);
      setCancelErrorMsg(detail ?? "Không thể tạo lại thanh toán. Vui lòng thử lại.");
      setRetryingId(null);
    }
  };

  const purchasableOrderIds = new Set(
    purchasableItems.map((item) => item.order_id),
  );

  const renderReturnForm = (orderId: number) => (
    <div className="orderReturnForm">
      <p className="orderReturnFormTitle">Yêu cầu hoàn trả đơn #{orderId}</p>
      <select
        value={returnForm.reason}
        onChange={(e) =>
          setReturnForm((f) => ({ ...f, reason: e.target.value }))
        }
        className="orderReturnSelect"
      >
        <option value="">Chọn lý do</option>
        {REASON_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        value={returnForm.description}
        onChange={(e) =>
          setReturnForm((f) => ({ ...f, description: e.target.value }))
        }
        placeholder="Mô tả thêm (tuỳ chọn)..."
        rows={3}
        className="orderReturnTextarea"
        maxLength={1000}
      />
      {returnError && (
        <p className="orderCancelError" role="alert">
          {returnError}
        </p>
      )}
      <div className="orderCancelConfirmActions">
        <button
          type="button"
          className="orderCancelConfirmYes"
          disabled={returnSubmitting}
          onClick={() => handleSubmitReturn(orderId)}
        >
          {returnSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
        </button>
        <button
          type="button"
          className="orderCancelConfirmNo"
          onClick={() => {
            setShowReturnFormId(null);
            setReturnError("");
          }}
        >
          Huỷ
        </button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <section className={shellClass}>
        <div className={innerClass}>
          <p className="orderLoginHint">
            Vui lòng <Link to={loginRedirect}>đăng nhập</Link> để xem lịch sử
            đơn hàng.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={shellClass}>
        <div className={innerClass}>
          <div className="loading">Đang tải...</div>
        </div>
      </section>
    );
  }

  return (
    <section className={shellClass}>
      <div className={innerClass}>
        <h1
          className={
            embedded
              ? "orderHistoryTitle orderHistoryTitle--embed"
              : "orderHistoryTitle"
          }
        >
          Lịch sử đơn hàng
        </h1>

        {showOrderPlacedBanner && (
          <div className="orderPlacedBanner" role="status">
            Đặt hàng thành công. Cảm ơn bạn đã mua sắm tại cửa hàng.
          </div>
        )}

        {paymentRedirectNotice === "success" && (
          <div className="orderPlacedBanner" role="status">
            Thanh toán thành công. Đơn hàng đã được ghi nhận.
          </div>
        )}
        {paymentRedirectNotice === "failed" && (
          <div
            className="orderPlacedBanner orderPlacedBanner--warn"
            role="status"
          >
            {vnpayFailHint ??
              "Thanh toán chưa hoàn tất hoặc đã hủy. Kiểm tra đơn trong danh sách bên dưới."}
          </div>
        )}

        <div className="orderReviewHub">
          <div>
            <p className="orderReviewHubEyebrow">Đánh giá sản phẩm đã mua</p>
            <h2 className="orderReviewHubTitle">
              Xem các món đã nhận và viết đánh giá của bạn
            </h2>
            <p className="orderReviewHubText">
              {purchasableItems.length > 0
                ? `Hiện có ${purchasableItems.length} sản phẩm đang chờ bạn đánh giá.`
                : "Bạn có thể xem lại các đánh giá đã gửi và các sản phẩm đủ điều kiện đánh giá tại đây."}
            </p>
          </div>
          <Link to="/my-feedback" className="orderReviewHubBtn">
            {purchasableItems.length > 0
              ? "Đi đánh giá ngay"
              : "Mở trang đánh giá"}
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="orderEmpty">
            <div className="orderEmptyIconWrap">
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E24B4A"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
            </div>
            <h2>Lịch sử trống</h2>
            <p>Hãy khám phá sản phẩm và mua sắm ngay!</p>
            <Link to="/products" className="orderEmptyBtn">
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <ul className="orderList">
            {list.map((order) => {
              const windowOpen = isReturnWindowOpen(order);
              const timeLabel =
                windowOpen && order.confirmed_by_user
                  ? remainingLabel(order)
                  : null;

              return (
                <li key={order.id} className="orderCard">
                  <div className="orderCardHeader">
                    <span className="orderId">Đơn #{order.id}</span>
                    <span className="orderDate">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString("vi-VN")
                        : "—"}
                    </span>
                    <span
                      className={`orderStatus orderStatus--${order.status}`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>

                  <div className="orderPaymentInfo" style={{ marginBottom: "16px", fontSize: "14px", color: "var(--text-secondary)" }}>
                    <strong>Phương thức:</strong> {getPaymentMethodLabel(order.payment_method)}
                    {order.payment_method && order.payment_method !== "cod" && (
                      <span>
                        {" "}— <strong>Trạng thái cổng:</strong>{" "}
                        <span
                          className={`orderStatus orderStatus--${
                            order.gateway_status === "paid"
                              ? "completed"
                              : order.gateway_status === "failed"
                              ? "cancelled"
                              : "pending"
                          }`}
                          style={{ marginLeft: "4px" }}
                        >
                          {getGatewayStatusLabel(order.gateway_status)}
                        </span>
                      </span>
                    )}
                    {shouldShowDeliveryEstimate(order.status) && order.shipping?.address && (
                      <div style={{ marginTop: "6px", color: "var(--success-color, #22c55e)" }}>
                        <strong>Dự kiến nhận hàng:</strong> {getEstimatedDeliveryTime(getAddressProvince(order.shipping.address), order.created_at)}
                      </div>
                    )}
                  </div>

                  {order.status === "completed" &&
                    purchasableOrderIds.has(order.id) && (
                      <div className="orderReviewPrompt">
                        <span className="orderReviewPromptText">
                          Đơn này có sản phẩm đủ điều kiện để đánh giá.
                        </span>
                        <Link
                          to="/my-feedback"
                          className="orderReviewPromptBtn"
                        >
                          Đánh giá sản phẩm
                        </Link>
                      </div>
                    )}

                  <ul className="orderItems">
                    {order.items?.map((item) => (
                      <li key={item.id} className="orderItem">
                        <div className="orderItemInfo">
                          <span className="orderItemName">
                            {item.product?.name ?? "Sản phẩm"}
                          </span>
                          {item.variant_info && (
                            <span className="orderItemVariant">
                              <span
                                className="variantColor"
                                style={{
                                  backgroundColor: item.variant_info.color.code,
                                }}
                              />
                              {item.variant_info.color.name} /{" "}
                              {item.variant_info.size.name}
                            </span>
                          )}
                        </div>
                        <span className="orderItemQty">x{item.quantity}</span>
                        <span className="orderItemPrice">{Number(item.price).toLocaleString('vi-VN')}đ</span>
                      </li>
                    ))}
                  </ul>

                  {returnSuccessId === order.id && (
                    <div className="orderReturnSuccess">
                      ✓ Yêu cầu hoàn trả đã được gửi. Chúng tôi sẽ xem xét trong
                      1–2 ngày làm việc.
                    </div>
                  )}

                  {order.status === "awaiting_confirmation" &&
                    !returnedOrderIds.has(order.id) && (
                      <div className="orderShippingActions">
                        {showReturnFormId === order.id ? (
                          renderReturnForm(order.id)
                        ) : confirmReceivedId === order.id ? (
                          <div className="orderCancelConfirm">
                            <span className="orderCancelConfirmText">
                              Xác nhận đã nhận được đơn #{order.id}?
                            </span>
                            <div className="orderCancelConfirmActions">
                              <button
                                type="button"
                                className="orderCancelConfirmYes"
                                disabled={receivedLoadingId === order.id}
                                onClick={() => handleConfirmReceived(order.id)}
                              >
                                Xác nhận
                              </button>
                              <button
                                type="button"
                                className="orderCancelConfirmNo"
                                onClick={() => setConfirmReceivedId(null)}
                              >
                                Quay lại
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="orderReceivedBtn"
                              disabled={receivedLoadingId === order.id}
                              onClick={() => setConfirmReceivedId(order.id)}
                            >
                              ✓ Đã nhận hàng
                            </button>
                            <button
                              type="button"
                              className="orderReturnBtn"
                              onClick={() => {
                                setShowReturnFormId(order.id);
                                setReturnError("");
                                setReturnForm({ reason: "", description: "" });
                              }}
                            >
                              ↩ Yêu cầu hoàn trả
                            </button>
                          </>
                        )}
                      </div>
                    )}

                  {/* Đã hoàn thành: nếu user đã xác nhận → không cho hoàn trả */}
                  {order.status === "completed" &&
                    order.confirmed_by_user &&
                    !returnedOrderIds.has(order.id) &&
                    null}

                  <div className="orderTotal">
                    {order.subtotal != null && order.shipping_fee != null && (
                      <div className="orderTotalBreakdown">
                        Tạm tính: {Number(order.subtotal).toLocaleString('vi-VN')}đ · Phí ship:{" "}
                        {Number(order.shipping_fee).toLocaleString('vi-VN')}đ
                        {order.discount_amount &&
                          Number(order.discount_amount) > 0 && (
                            <>
                              {" "}
                              · Giảm: {Number(order.discount_amount).toLocaleString('vi-VN')}đ
                              {order.discount_code
                                ? ` (${order.discount_code})`
                                : ""}
                            </>
                          )}
                      </div>
                    )}
                    Tổng: <strong>{Number(order.total_price).toLocaleString('vi-VN')}đ</strong>
                  </div>

                  {order.status === "pending" && (
                    <div className="orderCancelWrap">
                      {cancelErrorId === order.id && (
                        <p className="orderCancelError" role="alert">
                          {cancelErrorMsg}
                        </p>
                      )}
                      {confirmCancelId === order.id ? (
                        <div className="orderCancelConfirm">
                          <span className="orderCancelConfirmText">
                            Xác nhận hủy đơn #{order.id}?
                          </span>
                          <div className="orderCancelConfirmActions">
                            <button
                              type="button"
                              className="orderCancelConfirmYes"
                              onClick={handleCancelConfirm}
                            >
                              Hủy đơn
                            </button>
                            <button
                              type="button"
                              className="orderCancelConfirmNo"
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Giữ lại
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {order.payment_method &&
                            ["vnpay", "momo"].includes(order.payment_method) &&
                            order.gateway_status !== "paid" && (
                              <button
                                type="button"
                                className="orderCancelBtn"
                                style={{
                                  backgroundColor: "var(--primary-color, #E24B4A)",
                                  color: "white",
                                  border: "none",
                                }}
                                disabled={cancellingId === order.id || retryingId === order.id}
                                onClick={() => handleRetryPayment(order)}
                              >
                                {retryingId === order.id ? "Đang xử lý..." : "Thanh toán lại"}
                              </button>
                            )}

                          <button
                            type="button"
                            className="orderCancelBtn"
                            disabled={cancellingId === order.id || retryingId === order.id}
                            onClick={() => handleCancelRequest(order.id)}
                          >
                            {cancellingId === order.id
                              ? "Đang hủy..."
                              : "Hủy đơn hàng"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
