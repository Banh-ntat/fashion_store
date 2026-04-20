import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../pages/admin/Admin.css'; 

const WalletPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState([]);

  const fetchWalletData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/wallets/info/', {
        headers: { Authorization: `Token ${user.token}` }
      });
      setBalance(res.data.balance);
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu ví thực tế:", err);
    }
  };

  useEffect(() => {
    if (user?.token) fetchWalletData();
  }, [user]);

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
            {Number(balance).toLocaleString('vi-VN')}
            <span className="wallet-currency">VNĐ</span>
          </div>
        </div>
        <div className="wallet-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="wallet-action-btn" onClick={() => alert('Chuyển đến MoMo...')}>
            Nạp tiền ngay
          </button>
          <button className="wallet-action-btn" style={{ background: '#333' }} onClick={() => alert('Nhập SĐT MoMo...')}>
            Rút tiền MoMo
          </button>
        </div>
      </div>

      <div className="transaction-history">
        <h4>Lịch sử giao dịch</h4>
        {transactions.length > 0 ? (
          transactions.map((tx: any) => (
            <div key={tx.id} className="transaction-item">
              <div className="tx-info">
                <span className="tx-name">{tx.note}</span>
                <span className="tx-date">{tx.created_at}</span>
              </div>
              <span className={`tx-amount ${tx.amount > 0 ? 'plus' : 'minus'}`}>
                {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toLocaleString('vi-VN')}đ
              </span>
            </div>
          ))
        ) : (
          <div className="transaction-empty">Chưa có giao dịch nào trong database.</div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;