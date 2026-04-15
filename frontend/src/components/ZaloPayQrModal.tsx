import QRCode from "qrcode";
import { useEffect, useState } from "react";
import "./ZaloPayQrModal.css";

type Props = {
  open: boolean;
  orderUrl: string | null;
  orderId?: number;
  onClose: () => void;
  onDone: () => void;
};

export default function ZaloPayQrModal({
  open,
  orderUrl,
  orderId,
  onClose,
  onDone,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !orderUrl) {
      setDataUrl(null);
      setQrError(null);
      return;
    }
    let cancelled = false;
    setQrError(null);
    QRCode.toDataURL(orderUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError("Không tạo được mã QR. Dùng nút mở cổng bên dưới.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderUrl]);

  if (!open) return null;

  return (
    <div
      className="zlpQrOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zlpQrTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="zlpQrDialog" onClick={(e) => e.stopPropagation()}>
        <h2 id="zlpQrTitle" className="zlpQrTitle">
          Thanh toán ZaloPay (sandbox)
        </h2>
        <p className="zlpQrHint">
          Mở <strong>app ZaloPay sandbox</strong> trên điện thoại và quét mã QR. Nội dung mã là
          liên kết cổng thanh toán do ZaloPay cung cấp (theo tài liệu QR động).
        </p>
        {orderId != null && (
          <p className="zlpQrOrderId">Đơn hàng #{orderId}</p>
        )}
        <div className="zlpQrFrame">
          {qrError && <p className="zlpQrErr">{qrError}</p>}
          {dataUrl && !qrError && (
            <img src={dataUrl} alt="Mã QR thanh toán ZaloPay" className="zlpQrImg" />
          )}
          {!dataUrl && !qrError && <p className="zlpQrLoading">Đang tạo mã QR…</p>}
        </div>
        <div className="zlpQrActions">
          <button
            type="button"
            className="zlpQrBtn zlpQrBtnSecondary"
            onClick={() => orderUrl && window.open(orderUrl, "_blank", "noopener,noreferrer")}
            disabled={!orderUrl}
          >
            Mở cổng trên trình duyệt
          </button>
          <button type="button" className="zlpQrBtn zlpQrBtnPrimary" onClick={onDone}>
            Đã quét / về đơn hàng
          </button>
        </div>
        <button type="button" className="zlpQrDismiss" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}
