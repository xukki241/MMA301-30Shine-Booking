import { useState } from "react";
import { api } from "./api.js";
import { canUseAdminWeb, readAdminSession } from "./access.js";
import { SystemAdminApp } from "./SystemAdminApp.jsx";

export function AdminApp() {
  const [session, setSession] = useState(() => readAdminSession(sessionStorage));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function signOut() {
    sessionStorage.removeItem("shine-admin-session");
    setSession(null);
  }

  async function submitLogin(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.login(String(form.get("email")), String(form.get("password")));
      if (!canUseAdminWeb(result.user?.role)) {
        setError("403 · Chỉ System Admin được truy cập web quản trị.");
        return;
      }
      const next = { accessToken: result.accessToken, user: result.user };
      sessionStorage.setItem("shine-admin-session", JSON.stringify(next));
      setSession(next);
    } catch (cause) { setError(cause.message || "Đăng nhập thất bại."); }
    finally { setBusy(false); }
  }

  if (session?.accessToken && canUseAdminWeb(session.user?.role)) {
    return <SystemAdminApp session={session} signOut={signOut} />;
  }
  return <main className="login-page">
    <div className="login-art"><div className="art-glow" /><div className="art-brand"><span className="brand-mark">30</span> 30SHINE</div>
      <div className="art-copy"><span className="eyebrow">SYSTEM ADMIN</span><h1>Quản trị<br />hệ thống.</h1>
        <p>Quản lý tài khoản nhân sự, sức khỏe dịch vụ và nhật ký thao tác.</p></div>
      <div className="art-footer">ĐẸP TRAI · ĐẸP GÁI · ĐẸP CẢ ĐÔI</div></div>
    <div className="login-panel"><form className="login-form" onSubmit={submitLogin}>
      <span className="eyebrow red">SYSTEM ADMIN PORTAL</span><h2>Chào mừng trở lại</h2>
      <p>Đăng nhập tài khoản System Admin.</p>
      {error && <div className="login-error">{error}</div>}
      <label className="field"><span>Email quản trị</span><input name="email" type="email" autoComplete="username" placeholder="admin@30shine.vn" required /></label>
      <label className="field"><span>Mật khẩu</span><input name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" required /></label>
      <button className="primary-button full" type="submit" disabled={busy}>{busy ? "Đang đăng nhập..." : "Đăng nhập →"}</button>
      <div className="login-note">Chỉ dành cho <b>System Admin</b>.</div>
    </form><div className="login-bottom">© 2026 30Shine · System Administration</div></div>
  </main>;
}
