import { useState, useEffect } from 'react';
import { admin } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

interface Contact {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    admin.contacts
      .list()
      .then((res) => {
        const data = res?.data;
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setContacts(list);
      })
      .catch((err) => {
        console.error('Load contacts failed:', err);
        setContacts([]);
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa liên hệ này?')) {
      try {
        await admin.contacts.delete(id);
        loadContacts();
      } catch {
        alert('Có lỗi xảy ra!');
      }
    }
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý liên hệ</h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Chủ đề</th>
              <th>Nội dung</th>
              <th>Ngày gửi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td>{contact.id}</td>
                <td>{contact.name}</td>
                <td>{contact.email}</td>
                <td>{contact.subject}</td>
                <td className="message-cell">{contact.message}</td>
                <td>{new Date(contact.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="btn-delete" onClick={() => handleDelete(contact.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
