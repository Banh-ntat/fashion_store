const AdminReturnList = () => {
  const [returns, setReturns] = useState([]);

  const handleApprove = async (id: number) => {
    if (!window.confirm("Xác nhận duyệt trả hàng và hoàn tiền vào ví khách?")) return;
    try {
      const res = await axios.post(`http://localhost:8000/api/orders/returns/${id}/approve/`, {}, {
        headers: { Authorization: `Token ${user.token}` }
      });
      alert(res.data.message);
      fetchReturns(); // Tải lại danh sách
    } catch (err) {
      alert("Lỗi khi duyệt hoàn tiền");
    }
  };

  return (
    <div className="admin-container">
      <h2>Yêu cầu trả hàng chờ duyệt</h2>
      <table>
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th>Lý do</th>
            <th>Số tiền hoàn</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {returns.map((item: any) => (
            <tr key={item.id}>
              <td>#{item.order.id}</td>
              <td>{item.order.user_email}</td>
              <td>{item.reason}</td>
              <td>{item.order.total_price.toLocaleString()}đ</td>
              <td>
                <button onClick={() => handleApprove(item.id)} className="btn-approve">
                  Duyệt hoàn tiền
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};