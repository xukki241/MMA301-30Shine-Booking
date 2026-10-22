import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

const labels = { stylist: "Stylist", general_manager: "General Manager", system_admin: "System Admin" };

export function SystemAdminApp({ session, signOut }) {
  const [page, setPage] = useState("users");
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ action: "", result: "", from: "", to: "" });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const token = session.accessToken;

  const handleError = useCallback((cause) => {
    if (cause.status === 401) signOut();
    setError(cause.message || "Không tải được dữ liệu.");
  }, [signOut]);
  const reload = useCallback(async (nextPage = page, nextFilters = filters) => {
    setBusy(true);
    setError("");
    try {
      if (nextPage === "users") setUsers(await api.listUsers(token));
      if (nextPage === "health") setHealth(await api.systemHealth(token));
      if (nextPage === "audit") setEvents(await api.auditEvents(token, nextFilters));
    } catch (cause) { handleError(cause); }
    finally { setBusy(false); }
  }, [page, filters, token, handleError]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBusy(true);
      setError("");
      try {
        const data = page === "users" ? await api.listUsers(token) :
          page === "health" ? await api.systemHealth(token) : await api.auditEvents(token, {});
        if (!cancelled) {
          if (page === "users") setUsers(data);
          else if (page === "health") setHealth(data);
          else setEvents(data);
        }
      } catch (cause) { if (!cancelled) handleError(cause); }
      finally { if (!cancelled) setBusy(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [page, token, handleError]);

  async function saveUser(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = { email: String(form.get("email") || "").trim(), fullName: String(form.get("fullName") || "").trim(),
      role: String(form.get("role")), password: String(form.get("password") || "") };
    if (editor?.id && !values.password) delete values.password;
    setBusy(true); setError(""); setNotice("");
    try {
      if (editor?.id) await api.updateUser(token, editor.id, values);
      else await api.createUser(token, values);
      setNotice(editor?.id ? "Đã cập nhật tài khoản." : "Đã tạo tài khoản nhân sự.");
      setEditor(null);
      setUsers(await api.listUsers(token));
    } catch (cause) { handleError(cause); }
    finally { setBusy(false); }
  }
  async function toggleUser(user) {
    const action = user.status === "locked" ? "khôi phục" : "khóa";
    if (!window.confirm(`Xác nhận ${action} ${user.email}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (user.status === "locked") await api.restoreUser(token, user.id);
      else await api.lockUser(token, user.id);
      setNotice(`Đã ${action} tài khoản.`);
      setUsers(await api.listUsers(token));
    } catch (cause) { handleError(cause); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar system-sidebar">
      <a className="brand" href="#users"><span className="brand-mark">30</span><span>30SHINE<small>SYSTEM ADMIN</small></span></a>
      <div className="nav-caption">HỆ THỐNG</div>
      <button className={`nav-item ${page === "users" ? "active" : ""}`} title="Tài khoản nhân sự" onClick={() => setPage("users")}><span aria-hidden="true">♙</span><span className="nav-label">Tài khoản nhân sự</span></button>
      <button className={`nav-item ${page === "health" ? "active" : ""}`} title="Health" onClick={() => setPage("health")}><span aria-hidden="true">◉</span><span className="nav-label">Health</span></button>
      <button className={`nav-item ${page === "audit" ? "active" : ""}`} title="Audit Log" onClick={() => setPage("audit")}><span aria-hidden="true">▤</span><span className="nav-label">Audit Log</span></button>
      <div className="sidebar-bottom"><div className="avatar">{session.user.email?.slice(0, 1).toUpperCase()}</div><div className="account"><strong>System Admin</strong><small>{session.user.email}</small></div><button className="icon-button" title="Đăng xuất" aria-label="Đăng xuất" onClick={signOut}>↗</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="crumb">30Shine / Hệ thống</span><h1>{page === "users" ? "Tài khoản nhân sự" : page === "health" ? "Trạng thái hệ thống" : "Audit Log"}</h1></div><button className="quiet-button" disabled={busy} onClick={() => void reload()}>Làm mới</button></header>
      <section className="page-body">
        {error && <div className="alert error"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}
        {notice && <div className="alert success"><span>✓</span>{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {page === "users" && <>
          <div className="toolbar"><p>Chỉ tài khoản nhân sự. Customer dùng Guest Session và không nằm trong danh sách này.</p><button className="primary-button" onClick={() => setEditor({})}>＋ Thêm tài khoản</button></div>
          <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>HỌ TÊN</th><th>EMAIL</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
            {users.map((user) => <tr key={user.id}><td><strong>{user.fullName || "Chưa cập nhật"}</strong></td><td>{user.email}</td><td>{labels[user.role] || user.role}</td><td><span className={`status ${user.status === "locked" ? "paused" : "live"}`}>{user.status === "locked" ? "Đã khóa" : "Đang hoạt động"}</span></td><td><div className="row-actions"><button onClick={() => setEditor(user)}>Sửa</button><button disabled={busy} onClick={() => void toggleUser(user)}>{user.status === "locked" ? "Khôi phục" : "Khóa"}</button></div></td></tr>)}
            {!users.length && <tr><td colSpan="5">{busy ? "Đang tải…" : "Chưa có tài khoản nhân sự."}</td></tr>}
          </tbody></table></div></section>
        </>}
        {page === "health" && <section className="panel system-panel"><div className="panel-heading"><div><h2>Kiểm tra dịch vụ</h2><p>{health?.checkedAt ? `Kiểm tra lúc ${new Date(health.checkedAt).toLocaleString("vi-VN")}` : "Đang tải trạng thái…"}</p></div></div><div className="system-health-grid">
          {[["Auth Service", "auth"], ["Core API", "core"], ["Auth database", "authDatabase"], ["Core database", "coreDatabase"]].map(([label, key]) => <div className="system-health-item" key={key}><span>{label}</span><strong className={health?.services?.[key]?.ok ? "health-ok" : "health-down"}>{health ? health.services?.[key]?.ok ? "Hoạt động" : "Không khả dụng" : "Đang kiểm tra"}</strong></div>)}
        </div></section>}
        {page === "audit" && <><form className="toolbar audit-filters" onSubmit={(event) => { event.preventDefault(); void reload("audit", filters); }}><label>Hành động<input value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} placeholder="Ví dụ: staff.create" /></label><label>Kết quả<select value={filters.result} onChange={(event) => setFilters({ ...filters, result: event.target.value })}><option value="">Tất cả</option><option value="success">Thành công</option><option value="failed">Thất bại</option></select></label><label>Từ ngày<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Đến ngày<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><button className="primary-button" type="submit">Lọc</button></form>
          <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>THỜI GIAN</th><th>HÀNH ĐỘNG</th><th>ĐỐI TƯỢNG</th><th>NGƯỜI THỰC HIỆN</th><th>KẾT QUẢ</th></tr></thead><tbody>{events.map((event, index) => <tr key={event._id || index}><td>{new Date(event.occurredAt).toLocaleString("vi-VN")}</td><td>{event.action}</td><td>{event.targetType} · {event.targetId || "—"}</td><td>{event.actorId || "Hệ thống/không xác định"}</td><td>{event.result === "success" ? "Thành công" : "Thất bại"}</td></tr>)}{!events.length && <tr><td colSpan="5">{busy ? "Đang tải…" : "Chưa có sự kiện phù hợp."}</td></tr>}</tbody></table></div></section>
        </>}
      </section>
    </main>
    {editor && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditor(null)}><form className="modal" onSubmit={(event) => void saveUser(event)}><div className="modal-head"><div><span className="eyebrow">SYSTEM ADMIN</span><h2>{editor.id ? "Sửa tài khoản" : "Tạo tài khoản nhân sự"}</h2></div><button type="button" className="icon-button" onClick={() => setEditor(null)}>×</button></div><div className="modal-fields"><label className="field"><span>Họ tên</span><input name="fullName" type="text" minLength={2} maxLength={100} required defaultValue={editor.fullName || ""} autoComplete="name" /></label><label className="field"><span>Email</span><input name="email" type="email" required defaultValue={editor.email || ""} /></label><label className="field"><span>Vai trò</span><select name="role" defaultValue={editor.role || "stylist"}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>{editor.id ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu"}</span><input name="password" type="password" minLength={8} required={!editor.id} autoComplete="new-password" /></label></div><div className="modal-actions"><button type="button" className="quiet-button" onClick={() => setEditor(null)}>Hủy</button><button className="primary-button" disabled={busy} type="submit">{editor.id ? "Lưu thay đổi" : "Tạo tài khoản"}</button></div></form></div>}
  </div>;
}
