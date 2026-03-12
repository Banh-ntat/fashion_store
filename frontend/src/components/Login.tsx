import React from 'react';
import './Login.css';

const Login = () => {
  return (
    <div className="login-container">
      <form className="login-form">
        <h2>Đăng Nhập</h2>
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Mật khẩu" required />
        <button type="submit">Đăng nhập</button>
      </form>
    </div>
  );
};

export default Login;