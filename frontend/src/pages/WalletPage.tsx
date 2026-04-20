import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Transaction {
  id: number;
  amount: string;
  transaction_type: 'deposit' | 'withdraw';
  note: string;
  created_at: string;
}

const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await axios.get('/api/wallets/my-wallet/');
      setBalance(response.data.balance);
      setTransactions(response.data.transactions);
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin ví:", error);
      setLoading(false);
    }
  };

  const handleWalletAction = async (type: 'deposit' | 'withdraw') => {
    const amountStr = prompt(`Nhập số tiền muốn ${type === 'deposit' ? 'nạp' : 'rút'}:`);
    const amount = parseInt(amountStr || '0');

    if (isNaN(amount) || amount <= 0) {
      alert("Số tiền không hợp lệ");
      return;
    }

    try {
      const response = await axios.post('/api/wallets/action/', {
        type: type,
        amount: amount
      });
      
      setBalance(response.data.balance);
      alert(response.data.message);
      fetchWalletData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Giao dịch thất bại");
    }
  };

  if (loading) return <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', backgroundColor: '#000', height: '100vh' }}>Đang tải...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', color: '#fff', backgroundColor: '#000', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '30px', fontSize: '28px', color: '#ff4d4d', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Quản lý Ví Cá Nhân
      </h2>
      
      {/* Card Số Dư - Tông Đỏ Đen Luxury */}
      <div style={{ 
        padding: '40px', 
        borderRadius: '20px', 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)',
        border: '2px solid #ff4d4d',
        marginBottom: '40px',
        boxShadow: '0 10px 30px rgba(255, 77, 77, 0.2)'
      }}>
        <p style={{ fontSize: '18px', color: '#aaa', margin: 0, textTransform: 'uppercase' }}>Số dư khả dụng</p>
        <h1 style={{ fontSize: '48px', margin: '15px 0', color: '#ff4d4d', fontWeight: 'bold' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(balance)}
        </h1>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
          <button 
            onClick={() => handleWalletAction('deposit')}
            style={{ 
              padding: '14px 30px', 
              borderRadius: '10px', 
              backgroundColor: '#ff4d4d', 
              color: '#fff', 
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: '0.3s',
              textTransform: 'uppercase'
            }}
          >
            Nạp tiền
          </button>

          <button 
            onClick={() => handleWalletAction('withdraw')}
            style={{ 
              padding: '14px 30px', 
              borderRadius: '10px', 
              border: '2px solid #ff4d4d', 
              backgroundColor: 'transparent', 
              color: '#ff4d4d',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: '0.3s',
              textTransform: 'uppercase'
            }}
          >
            Rút tiền
          </button>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <h3 style={{ marginBottom: '20px', color: '#ff4d4d', fontSize: '20px' }}>Lịch sử giao dịch</h3>
      <div style={{ backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333' }}>
        {transactions.length === 0 ? (
          <p style={{ padding: '30px', color: '#666', textAlign: 'center' }}>Hệ thống chưa ghi nhận giao dịch nào.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#222', textAlign: 'left', color: '#ff4d4d' }}>
                <th style={{ padding: '20px' }}>Thời gian</th>
                <th style={{ padding: '20px' }}>Hoạt động</th>
                <th style={{ padding: '20px' }}>Số tiền</th>
                <th style={{ padding: '20px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #222', transition: '0.2s' }}>
                  <td style={{ padding: '20px', color: '#888' }}>{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                  <td style={{ padding: '20px', fontWeight: '500' }}>
                    {tx.transaction_type === 'deposit' ? 'Nạp tiền vào ví' : 'Rút tiền mặt'}
                  </td>
                  <td style={{ padding: '20px', fontWeight: 'bold', color: tx.transaction_type === 'deposit' ? '#ff4d4d' : '#fff' }}>
                    {tx.transaction_type === 'deposit' ? '+' : '-'} {new Intl.NumberFormat('vi-VN').format(parseInt(tx.amount))} đ
                  </td>
                  <td style={{ padding: '20px' }}>
                    <span style={{ 
                      padding: '5px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      backgroundColor: '#222', 
                      color: '#4caf50',
                      border: '1px solid #4caf50' 
                    }}>
                      Thành công
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WalletPage;