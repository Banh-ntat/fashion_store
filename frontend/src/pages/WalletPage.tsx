import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../pages/admin/Admin.css'; 

const WalletPage = () => {
  const { user } = useAuth();
  const [balance] = useState<number>(500000); 

  return (
    <div className="page-container wallet-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Ví tiền của tôi</h1>
          <p className="page-subtitle">Quản lý số dư và lịch sử giao dịch cá nhân.</p>
        </div>
      </header>

      <div className="wallet-card">
        <div className="wallet-balance-group">
          <h3>Số dư khả dụng</h3>
          <div className="wallet-balance">
            {balance.toLocaleString('vi-VN')}
            <span className="wallet-currency">VNĐ</span>
          </div>
        </div>
        <button className="wallet-action-btn" onClick={() => alert('Hệ thống đang kết nối cổng thanh toán!')}>
          Nạp tiền ngay
        </button>
      </div>

      <div className="transaction-history">
        <h4>Lịch sử giao dịch</h4>
        <div className="transaction-item">
          <div className="tx-info">
            <span className="tx-name">Hoàn tiền hệ thống</span>
            <span className="tx-date">20/04/2026</span>
          </div>
          <span className="tx-amount plus">+ 200.000đ</span>
        </div>
        <div className="transaction-empty">Hết danh sách giao dịch.</div>
      </div>
    </div>
  );
};

export default WalletPage;