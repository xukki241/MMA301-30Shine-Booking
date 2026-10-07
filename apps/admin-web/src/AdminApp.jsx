import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const cached = () => {
  try { return JSON.parse(sessionStorage.getItem("shine-admin-session") || "null"); } catch { return null; }
};
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const money = (value) => new Intl.NumberFormat("vi-VN").format(value || 0) + " ₫";
const time = (iso) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const shortDate = (date) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(`${date}T12:00:00`));
const initialBranch = { name: "", address: "", phone: "", isActive: true };
const initialService = { name: "", price: "", durationMinutes: "45", description: "", isActive: true };
const initialStylist = { userId: "", displayName: "", isActive: true };

export function AdminApp() {
  const [session, setSession] = useState(cached);
  const [page, setPage] = useState("catalog");
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [services, setServices] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);

  const selectedBranch = useMemo(() => branches.find((branch) => branch.id === branchId), [branches, branchId]);
  const refreshBranches = useCallback(async () => {
    if (!session?.accessToken) return;
    const next = await api.listBranches(session.accessToken);
    setBranches(next);
    setBranchId((current) => next.some((branch) => branch.id === current) ? current : next[0]?.id || "");
  }, [session]);
  const refreshCatalog = useCallback(async () => {
    if (!session?.accessToken || !branchId) { setServices([]); setStylists([]); return; }
    const [nextServices, nextStylists] = await Promise.all([
      api.listServices(session.accessToken, branchId), api.listStylists(session.accessToken, branchId),
    ]);
    setServices(nextServices);
    setStylists(nextStylists);
  }, [session, branchId]);
  const refreshShifts = useCallback(async () => {
    if (!session?.accessToken || !branchId) { setShifts([]); return; }
    setShifts(await api.listShifts(session.accessToken, branchId, date));
  }, [session, branchId, date]);

  useEffect(() => {
    if (!session?.accessToken) return;
    setLoading(true); setError("");
    refreshBranches().catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, [session, refreshBranches]);
  useEffect(() => {
    if (!session?.accessToken || !branchId) return;
    setLoading(true); setError("");
    Promise.all([refreshCatalog(), refreshShifts()]).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, [session, branchId, date, refreshCatalog, refreshShifts]);

  async function perform(operation, success) {
    setError(""); setNotice("");
    try { await operation(); setNotice(success); setDialog(null); await Promise.all([refreshBranches(), refreshCatalog(), refreshShifts()]); }
    catch (cause) {
      if (cause.status === 401) signOut();
      setError(cause.message);
    }
  }
  function signOut() { sessionStorage.removeItem("shine-admin-session"); setSession(null); }
  async function submitLogin(event) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.login(String(form.get("email")), String(form.get("password")));
      if (result.user?.role !== "shop_admin") { setError("403 · Tài khoản này không có quyền Shop Admin."); return; }
      const next = { accessToken: result.accessToken, user: result.user };
      sessionStorage.setItem("shine-admin-session", JSON.stringify(next)); setSession(next);
    } catch (cause) { setError(cause.message); }
  }

  if (!session?.accessToken || session.user?.role !== "shop_admin") return <Login onSubmit={submitLogin} error={error} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#catalog"><span className="brand-mark">30</span><span>30SHINE<small>SHOP ADMIN</small></span></a>
      <div className="nav-caption">QUẢN LÝ</div>
      <button className={`nav-item ${page === "catalog" ? "active" : ""}`} onClick={() => setPage("catalog")}><span>▦</span> Danh mục</button>
      <button className={`nav-item ${page === "shifts" ? "active" : ""}`} onClick={() => setPage("shifts")}><span>◷</span> Lịch làm việc</button>
      <div className="sidebar-bottom"><div className="avatar">{session.user.email?.slice(0, 1).toUpperCase()}</div><div className="account"><strong>Shop Admin</strong><small>{session.user.email}</small></div><button className="icon-button" title="Đăng xuất" onClick={signOut}>↗</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="crumb">30Shine / Quản trị</span><h1>{page === "catalog" ? "Danh mục cửa hàng" : "Lịch làm việc"}</h1></div><div className="top-meta"><span className="online-dot" /> Hệ thống đang hoạt động <span className="date-stamp">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date())}</span></div></header>
      <section className="page-body">
        {error && <div className="alert error"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}
        {notice && <div className="alert success"><span>✓</span>{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {page === "catalog" ? <CatalogPage {...{ branches, branchId, setBranchId, selectedBranch, services, stylists, loading, perform, setDialog, token: session.accessToken }} /> : <ShiftPage {...{ branches, branchId, setBranchId, selectedBranch, stylists, shifts, date, setDate, loading, perform, setDialog, token: session.accessToken }} />}
      </section>
    </main>
    {dialog && <EditorDialog dialog={dialog} branchId={branchId} stylists={stylists} onClose={() => setDialog(null)} onSave={(operation, message) => perform(operation, message)} token={session.accessToken} />}
  </div>;
}

function Login({ onSubmit, error }) {
  const [email, setEmail] = useState("admin@30shine.vn");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);

  return <main className="login-page"><div className="login-art"><div className="art-glow"/><div className="art-brand"><span className="brand-mark">30</span> 30SHINE</div><div className="art-copy"><span className="eyebrow">SALON OPERATIONS</span><h1>Vận hành<br/>sáng bừng.</h1><p>Một không gian gọn gàng để đội ngũ của bạn chăm sóc từng lịch hẹn.</p></div><div className="art-footer">ĐẸP TRAI · ĐẸP GÁI · ĐẸP CẢ ĐÔI</div></div><div className="login-panel"><form className="login-form" onSubmit={onSubmit}><span className="eyebrow red">SHOP ADMIN PORTAL</span><h2>Chào mừng trở lại</h2><p>Đăng nhập tài khoản quản trị của bạn.</p>{error && <div className="login-error">{error}</div>}<Field label="Email quản trị" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@30shine.vn" required /><label className="field"><span>Mật khẩu</span><div className="password-wrapper"><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" required /><button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button></div></label><button className="primary-button full" type="submit">Đăng nhập <span>→</span></button><div className="login-note">Chỉ tài khoản có vai trò <b>Shop Admin</b> mới có quyền truy cập.</div></form><div className="login-bottom">© 2026 30Shine · Salon Management</div></div></main>;
}



function CatalogPage({ branches, branchId, setBranchId, selectedBranch, services, stylists, loading, perform, setDialog, token }) {
  return <>
    <div className="toolbar"><div className="branch-picker"><span className="picker-icon">⌖</span><div><small>CHI NHÁNH ĐANG XEM</small><select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Chưa có chi nhánh</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div></div><button className="primary-button" onClick={() => setDialog({ kind: "branch", item: initialBranch })}>＋ Thêm chi nhánh</button></div>
    {!branches.length && !loading ? <Empty title="Chưa có chi nhánh" detail="Tạo chi nhánh đầu tiên để bắt đầu quản lý dịch vụ và stylist." action={<button className="primary-button" onClick={() => setDialog({ kind: "branch", item: initialBranch })}>＋ Tạo chi nhánh</button>} /> : <>
      {selectedBranch && <section className="branch-summary panel"><div className="branch-icon">⌖</div><div className="grow"><div className="row-title"><h2>{selectedBranch.name}</h2><span className={`status ${selectedBranch.isActive ? "live" : "paused"}`}>{selectedBranch.isActive ? "ĐANG HOẠT ĐỘNG" : "TẠM NGƯNG"}</span></div><p>{selectedBranch.address}{selectedBranch.phone ? ` · ${selectedBranch.phone}` : ""}</p></div><button className="quiet-button" onClick={() => setDialog({ kind: "branch", item: selectedBranch })}>Chỉnh sửa</button><button className="icon-button danger-icon" title="Xóa chi nhánh" onClick={() => window.confirm(`Xóa ${selectedBranch.name} và dữ liệu gán thuộc chi nhánh?`) && perform(() => api.deleteBranch(token, selectedBranch.id), "Đã xóa chi nhánh.")}>⌫</button></section>}
      <div className="section-heading"><div><span className="eyebrow">CATALOG</span><h2>Dịch vụ & đội ngũ</h2></div></div>
      <div className="catalog-grid"><section className="panel table-panel"><div className="panel-heading"><div><h3>Dịch vụ</h3><p>{services.length} dịch vụ tại chi nhánh</p></div><button className="small-primary" disabled={!branchId} onClick={() => setDialog({ kind: "service", item: initialService })}>＋ Thêm dịch vụ</button></div><div className="table-wrap"><table><thead><tr><th>TÊN DỊCH VỤ</th><th>THỜI LƯỢNG</th><th>GIÁ</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong><small>{service.description || "Dịch vụ salon"}</small></td><td>{service.durationMinutes} phút</td><td>{money(service.price)}</td><td><span className={`status ${service.isActive ? "live" : "paused"}`}>{service.isActive ? "Hoạt động" : "Tạm ngưng"}</span></td><td><RowActions edit={() => setDialog({ kind: "service", item: service })} remove={() => window.confirm(`Xóa dịch vụ ${service.name}?`) && perform(() => api.deleteService(token, service.id), "Đã xóa dịch vụ.")} /></td></tr>)}{!services.length && <EmptyRow text="Chưa có dịch vụ ở chi nhánh này." />}</tbody></table></div></section>
        <section className="panel table-panel"><div className="panel-heading"><div><h3>Stylist</h3><p>{stylists.length} stylist được gán</p></div><button className="small-primary" disabled={!branchId} onClick={() => setDialog({ kind: "stylist", item: initialStylist })}>＋ Gán stylist</button></div><div className="stylist-list">{stylists.map((stylist) => <div className="stylist-row" key={stylist.id}><div className="stylist-avatar">{stylist.displayName.slice(0, 1).toUpperCase()}</div><div className="grow"><strong>{stylist.displayName}</strong><small>User ID · {stylist.userId}</small></div><span className={`status ${stylist.isActive ? "live" : "paused"}`}>{stylist.isActive ? "Hoạt động" : "Tạm ngưng"}</span><RowActions edit={() => setDialog({ kind: "stylist", item: stylist })} remove={() => window.confirm(`Hủy gán ${stylist.displayName}?`) && perform(() => api.deleteStylist(token, stylist.id), "Đã hủy gán stylist.")} /></div>)}{!stylists.length && <div className="empty-inline">Chưa gán stylist. Cần userId tài khoản có role stylist.</div>}</div></section></div>
    </>}
  </>;
}

function ShiftPage({ branches, branchId, setBranchId, selectedBranch, stylists, shifts, date, setDate, loading, perform, setDialog, token }) {
  return <>
    <div className="toolbar"><div className="branch-picker"><span className="picker-icon">⌖</span><div><small>CHI NHÁNH</small><select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Chọn chi nhánh</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div></div><label className="date-control"><span>NGÀY LÀM VIỆC</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><button className="primary-button" disabled={!branchId || !stylists.length} onClick={() => setDialog({ kind: "shift", item: null })}>＋ Xếp ca mới</button></div>
    {!branches.length ? <Empty title="Chưa có chi nhánh" detail="Tạo chi nhánh và gán stylist trước khi xếp ca." /> : !stylists.length ? <Empty title="Chưa có stylist được gán" detail="Từ Danh mục, gán tài khoản stylist có sẵn vào chi nhánh này." /> : <><div className="shift-date-heading"><div><span className="eyebrow">WORK SHIFTS</span><h2>{shortDate(date)}</h2><p>{selectedBranch?.name} · {shifts.length} ca được xếp</p></div><div className="date-nav"><button className="quiet-button" onClick={() => setDate((value) => shiftDate(value, -1))}>← Hôm trước</button><button className="quiet-button" onClick={() => setDate((value) => shiftDate(value, 1))}>Ngày sau →</button></div></div><section className="panel shift-panel"><div className="panel-heading"><div><h3>Phân ca stylist</h3><p>Slot đặt lịch được tính tự động theo thời lượng dịch vụ.</p></div><span className="shift-count">{String(shifts.length).padStart(2, "0")} CA</span></div>{loading ? <div className="empty-inline">Đang tải ca làm…</div> : <div className="shift-list">{shifts.map((shift) => { const stylist = stylists.find((item) => item.userId === shift.stylistId); return <article className="shift-row" key={shift.id}><div className="shift-time"><strong>{time(shift.startAt)}</strong><span>—</span><strong>{time(shift.endAt)}</strong></div><div className="timeline-mark"><i /></div><div className="shift-person"><div className="stylist-avatar">{stylist?.displayName?.slice(0, 1).toUpperCase() || "S"}</div><div><strong>{stylist?.displayName || "Stylist"}</strong><small>{selectedBranch?.name}</small></div></div><div className="shift-actions"><span className="status live">ĐÃ XẾP</span><RowActions edit={() => setDialog({ kind: "shift", item: shift })} remove={() => window.confirm("Xóa ca làm này?") && perform(() => api.deleteShift(token, shift.id), "Đã xóa ca làm.")} /></div></article>; })}{!shifts.length && <Empty title="Chưa có ca trong ngày này" detail="Thêm ca để hệ thống tạo slot cho khách đặt lịch." action={<button className="primary-button" onClick={() => setDialog({ kind: "shift", item: null })}>＋ Xếp ca đầu tiên</button>} />}</div>}</section></>}
  </>;
}

function EditorDialog({ dialog, branchId, stylists, onClose, onSave, token }) {
  const { kind, item } = dialog;
  const title = kind === "branch" ? (item?.id ? "Chỉnh sửa chi nhánh" : "Thêm chi nhánh") : kind === "service" ? (item?.id ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ") : kind === "stylist" ? (item?.id ? "Chỉnh sửa stylist" : "Gán stylist vào chi nhánh") : (item?.id ? "Chỉnh sửa Work Shift" : "Xếp ca làm mới");
  async function submit(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); let data; let operation; let success;
    if (kind === "branch") {
      data = { name: String(form.get("name")).trim(), address: String(form.get("address")).trim(), phone: String(form.get("phone")).trim(), isActive: form.get("isActive") === "on" };
      operation = () => api.saveBranch(token, data, item?.id); success = item?.id ? "Đã cập nhật chi nhánh." : "Đã tạo chi nhánh.";
    } else if (kind === "service") {
      data = { name: String(form.get("name")).trim(), price: Number(form.get("price")), durationMinutes: Number(form.get("durationMinutes")), description: String(form.get("description")).trim(), isActive: form.get("isActive") === "on" };
      operation = () => api.saveService(token, branchId, data, item?.id); success = item?.id ? "Đã cập nhật dịch vụ." : "Đã tạo dịch vụ.";
    } else if (kind === "stylist") {
      data = { ...(item?.id ? {} : { userId: String(form.get("userId")).trim() }), displayName: String(form.get("displayName")).trim(), isActive: form.get("isActive") === "on" };
      operation = () => api.saveStylist(token, branchId, data, item?.id); success = item?.id ? "Đã cập nhật stylist." : "Đã gán stylist vào chi nhánh.";
    } else {
      const date = String(form.get("date"));
      data = { date, branchId, stylistId: String(form.get("stylistId")), startAt: localIso(date, String(form.get("startTime"))), endAt: localIso(date, String(form.get("endTime"))) };
      operation = () => api.saveShift(token, data, item?.id); success = item?.id ? "Đã cập nhật ca làm." : "Đã xếp ca làm.";
    }
    await onSave(operation, success);
  }
  const localInput = (iso) => { if (!iso) return "09:00"; const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit}><div className="modal-head"><div><span className="eyebrow">SHOP ADMIN</span><h2>{title}</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></div><div className="modal-fields">
    {kind === "branch" && <><Field label="Tên chi nhánh" name="name" required defaultValue={item?.name} placeholder="30Shine Quận 1" /><Field label="Địa chỉ" name="address" required defaultValue={item?.address} placeholder="Địa chỉ chi nhánh" /><Field label="Số điện thoại" name="phone" defaultValue={item?.phone} placeholder="090…" /><Checkbox item={item} /></>}
    {kind === "service" && <><Field label="Tên dịch vụ" name="name" required defaultValue={item?.name} placeholder="Cắt tóc" /><div className="field-grid"><Field label="Giá (VND)" name="price" type="number" min="0" required defaultValue={item?.price} /><Field label="Thời lượng (phút)" name="durationMinutes" type="number" min="5" max="480" required defaultValue={item?.durationMinutes || 45} /></div><Field label="Mô tả" name="description" defaultValue={item?.description} placeholder="Mô tả dịch vụ" /><Checkbox item={item} /></>}
    {kind === "stylist" && <>{!item?.id && <Field label="User ID tài khoản stylist" name="userId" required pattern="[a-fA-F0-9]{24}" placeholder="24 ký tự hex từ Auth Service" hint="Nhập ID của tài khoản có role stylist đã tạo sẵn." />}<Field label="Tên hiển thị" name="displayName" required defaultValue={item?.displayName} placeholder="Stylist An" /><Checkbox item={item} /></>}
    {kind === "shift" && <><label className="field"><span>Stylist</span><select name="stylistId" required defaultValue={item?.stylistId || stylists[0]?.userId}>{stylists.map((stylist) => <option key={stylist.userId} value={stylist.userId}>{stylist.displayName}</option>)}</select></label><Field label="Ngày làm việc" name="date" type="date" required defaultValue={item?.date || today()} /><div className="field-grid"><Field label="Bắt đầu" name="startTime" type="time" required defaultValue={localInput(item?.startAt)} /><Field label="Kết thúc" name="endTime" type="time" required defaultValue={localInput(item?.endAt) === "09:00" && item?.endAt ? "17:00" : localInput(item?.endAt)} /></div><p className="field-hint">Thời gian được gửi kèm múi giờ thiết bị. Ca giao nhau hoặc ảnh hưởng lịch đã đặt sẽ bị từ chối.</p></>}
  </div><div className="modal-actions"><button className="quiet-button" type="button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit">{item?.id ? "Lưu thay đổi" : kind === "shift" ? "Xếp ca" : kind === "stylist" ? "Gán stylist" : "Tạo mới"}<span>→</span></button></div></form></div>;
}

function Field({ label, hint, ...props }) { return <label className="field"><span>{label}</span><input {...props} />{hint && <small className="field-hint">{hint}</small>}</label>; }
function Checkbox({ item }) { return <label className="checkbox-field"><input type="checkbox" name="isActive" defaultChecked={item?.isActive !== false} /><span>Đang hoạt động</span></label>; }
function RowActions({ edit, remove }) { return <div className="row-actions"><button title="Chỉnh sửa" onClick={edit}>✎</button><button title="Xóa" onClick={remove}>⌫</button></div>; }
function EmptyRow({ text }) { return <tr><td className="empty-cell" colSpan="5">{text}</td></tr>; }
function Empty({ title, detail, action }) { return <div className="empty-state"><div className="empty-symbol">◇</div><h3>{title}</h3><p>{detail}</p>{action}</div>; }
function shiftDate(date, offset) { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + offset); return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`; }
function localIso(date, time) { const value = new Date(`${date}T${time}`); const offset = -value.getTimezoneOffset(); const sign = offset >= 0 ? "+" : "-"; const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0"); const minutes = String(Math.abs(offset) % 60).padStart(2, "0"); return `${date}T${time}:00${sign}${hours}:${minutes}`; }
