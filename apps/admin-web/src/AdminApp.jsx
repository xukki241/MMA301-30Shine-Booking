import { useState } from "react";
import { api } from "./api.js";
import { canUseAdminWeb, readAdminSession } from "./access.js";
import { SystemAdminApp } from "./SystemAdminApp.jsx";

export function AdminApp() {
  const [session, setSession] = useState(() => readAdminSession(sessionStorage));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function signOut() {
    sessionStorage.removeItem("shine-admin-session");
    setSession(null);
  }

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.login(String(form.get("email")), String(form.get("password")));
      if (!canUseAdminWeb(result.user?.role)) {
        setError("403 · Chỉ tài khoản System Admin mới có quyền truy cập trang quản trị này.");
        return;
      }
      const next = { accessToken: result.accessToken, user: result.user };
      sessionStorage.setItem("shine-admin-session", JSON.stringify(next));
      setSession(next);
    } catch (cause) {
      setError(cause.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setBusy(false);
    }
  }

  if (session?.accessToken && canUseAdminWeb(session.user?.role)) {
    return <SystemAdminApp session={session} signOut={signOut} />;
  }

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="art-brand">
          <div className="brand-mark">30</div>
          <div className="brand-text">
            <span>30SHINE</span>
            <small>SYSTEM ADMINISTRATION</small>
          </div>
        </div>

        <div className="art-copy">
          <span className="eyebrow ocean">CỔNG QUẢN TRỊ TRUNG TÂM</span>
          <h1>Quản trị hệ thống.</h1>
          <p>
            Quản lý tài khoản nhân sự, phân quyền vai trò và giám sát trạng thái hoạt động của hệ thống dịch vụ.
          </p>
        </div>

        <div className="art-footer">30SHINE · HỆ THỐNG ĐẶT LỊCH & VẬN HÀNH</div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={submitLogin}>
          <div className="login-header">
            <span className="badge-pill ocean">SYSTEM ADMIN PORTAL</span>
            <h2>Đăng nhập</h2>
            <p>Nhập email và mật khẩu tài khoản Quản trị viên</p>
          </div>

          {error && (
            <div className="alert error">
              <div className="alert-text">{error}</div>
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@30shine.vn"
              required
            />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <div className="password-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </label>

          <button className="primary-button full" type="submit" disabled={busy}>
            {busy ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>

        <div className="login-bottom">
          © 2026 30Shine Vietnam
        </div>
      </div>
    </main>
  );
}
