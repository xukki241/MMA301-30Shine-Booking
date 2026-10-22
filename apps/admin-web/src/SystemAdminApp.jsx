import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const ROLE_CONFIG = {
  stylist: {
    label: "Stylist",
    desc: "Thợ tạo mẫu tóc, nhận ca và hoàn thành lịch hẹn",
  },
  general_manager: {
    label: "General Manager",
    desc: "Quản lý chi nhánh, dịch vụ, thợ và duyệt vận hành",
  },
  system_admin: {
    label: "System Admin",
    desc: "Quản trị viên hệ thống, quản lý tài khoản & giám sát",
  },
};

export function SystemAdminApp({ session, signOut }) {
  const [page, setPage] = useState("users");
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ action: "", result: "", from: "", to: "" });

  // Filters for user list
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [editor, setEditor] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = session.accessToken;
  const currentUserId = session.user?.id || session.user?._id;
  const currentUserEmail = session.user?.email;

  const handleError = useCallback((cause) => {
    if (cause?.status === 401) {
      signOut();
      return;
    }
    setError(cause?.message || "Không thể tải dữ liệu từ máy chủ.");
  }, [signOut]);

  const reload = useCallback(async (nextPage = page, nextFilters = filters) => {
    setBusy(true);
    setError("");
    try {
      if (nextPage === "dashboard") {
        const [u, h, a] = await Promise.all([
          api.listUsers(token),
          api.systemHealth(token).catch(() => null),
          api.auditEvents(token, {}).catch(() => []),
        ]);
        setUsers(u || []);
        if (h) setHealth(h);
        if (a) setEvents(a);
      } else if (nextPage === "users") {
        setUsers(await api.listUsers(token));
      } else if (nextPage === "health") {
        setHealth(await api.systemHealth(token));
      } else if (nextPage === "audit") {
        setEvents(await api.auditEvents(token, nextFilters));
      }
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  }, [page, filters, token, handleError]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBusy(true);
      setError("");
      try {
        if (page === "dashboard") {
          const [u, h, a] = await Promise.all([
            api.listUsers(token),
            api.systemHealth(token).catch(() => null),
            api.auditEvents(token, {}).catch(() => []),
          ]);
          if (!cancelled) {
            setUsers(u || []);
            if (h) setHealth(h);
            if (a) setEvents(a);
          }
        } else if (page === "users") {
          const data = await api.listUsers(token);
          if (!cancelled) setUsers(data || []);
        } else if (page === "health") {
          const data = await api.systemHealth(token);
          if (!cancelled) setHealth(data);
        } else {
          const data = await api.auditEvents(token, {});
          if (!cancelled) setEvents(data || []);
        }
      } catch (cause) {
        if (!cancelled) handleError(cause);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, token, handleError]);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchSearch =
        !searchTerm.trim() ||
        (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone && user.phone.includes(searchTerm.trim()));

      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const stylists = users.filter((u) => u.role === "stylist").length;
    const managers = users.filter((u) => u.role === "general_manager").length;
    const admins = users.filter((u) => u.role === "system_admin").length;
    const active = users.filter((u) => u.status !== "locked").length;
    const locked = total - active;
    return { total, stylists, managers, admins, active, locked };
  }, [users]);

  async function saveUser(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phone = String(form.get("phone") || "").trim();
    const role = String(form.get("role") || "stylist");
    const password = String(form.get("password") || "");

    const values = {
      fullName,
      email,
      phone: phone || null,
      role,
    };

    if (password) {
      values.password = password;
    } else if (!editor?.id) {
      setError("Vui lòng nhập mật khẩu cho tài khoản mới (tối thiểu 8 ký tự).");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editor?.id) {
        await api.updateUser(token, editor.id, values);
        setNotice(`Đã cập nhật thông tin tài khoản "${fullName || email}".`);
      } else {
        await api.createUser(token, values);
        setNotice(`Đã tạo tài khoản nhân sự mới "${fullName || email}".`);
      }
      setEditor(null);
      setUsers(await api.listUsers(token));
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function executeToggleUser(user) {
    const isLocking = user.status !== "locked";
    const actionText = isLocking ? "khóa" : "khôi phục";
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (isLocking) {
        await api.lockUser(token, user.id);
      } else {
        await api.restoreUser(token, user.id);
      }
      setNotice(`Đã ${actionText} tài khoản "${user.fullName || user.email}".`);
      setConfirmAction(null);
      setUsers(await api.listUsers(token));
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar system-sidebar">
        <div className="brand">
          <div className="brand-mark">30</div>
          <div className="brand-info">
            <span className="brand-name">30SHINE</span>
            <span className="brand-badge">SYSTEM ADMIN</span>
          </div>
        </div>

        <div className="nav-caption">QUẢN TRỊ</div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${page === "dashboard" ? "active" : ""}`}
            onClick={() => setPage("dashboard")}
          >
            <span className="nav-label">Tổng quan</span>
          </button>

          <button
            className={`nav-item ${page === "users" ? "active" : ""}`}
            onClick={() => setPage("users")}
          >
            <span className="nav-label">Quản lý tài khoản</span>
            {users.length > 0 && <span className="nav-count">{users.length}</span>}
          </button>

          <div className="nav-caption" style={{ marginTop: "16px" }}>HỆ THỐNG</div>

          <button
            className={`nav-item ${page === "health" ? "active" : ""}`}
            onClick={() => setPage("health")}
          >
            <span className="nav-label">Trạng thái dịch vụ</span>
          </button>

          <button
            className={`nav-item ${page === "audit" ? "active" : ""}`}
            onClick={() => setPage("audit")}
          >
            <span className="nav-label">Nhật ký kiểm toán</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="avatar">
            {(currentUserEmail || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="account">
            <strong>System Admin</strong>
            <small title={currentUserEmail}>{currentUserEmail}</small>
          </div>
          <button
            className="quiet-button logout-btn"
            title="Đăng xuất"
            onClick={signOut}
          >
            Thoát
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span>30Shine</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-active">
                {page === "dashboard"
                  ? "Tổng quan"
                  : page === "users"
                  ? "Quản lý tài khoản"
                  : page === "health"
                  ? "Trạng thái dịch vụ"
                  : "Nhật ký kiểm toán"}
              </span>
            </div>
            <h1>
              {page === "dashboard" && "Tổng quan hệ thống"}
              {page === "users" && "Quản lý tài khoản nhân sự"}
              {page === "health" && "Trạng thái dịch vụ"}
              {page === "audit" && "Nhật ký kiểm toán"}
            </h1>
          </div>

          <div className="topbar-right">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void reload()}
            >
              {busy ? "Đang đồng bộ..." : "Làm mới"}
            </button>
          </div>
        </header>

        <section className="page-body">
          {/* ALERTS */}
          {error && (
            <div className="alert error">
              <div className="alert-content">{error}</div>
              <button className="alert-close" onClick={() => setError("")}>×</button>
            </div>
          )}

          {notice && (
            <div className="alert success">
              <div className="alert-content">{notice}</div>
              <button className="alert-close" onClick={() => setNotice("")}>×</button>
            </div>
          )}

          {/* PAGE 1: DASHBOARD */}
          {page === "dashboard" && (
            <div className="dashboard-view">
              <div className="welcome-banner">
                <div className="welcome-content">
                  <span className="badge-pill ocean">SYSTEM CONSOLE</span>
                  <h2>Quản trị hệ thống 30Shine</h2>
                  <p>
                    Theo dõi tài khoản nhân sự, phân quyền vai trò và giám sát các dịch vụ microservices.
                  </p>
                  <div className="welcome-actions">
                    <button className="primary-button" onClick={() => { setPage("users"); setEditor({}); }}>
                      Thêm tài khoản
                    </button>
                    <button className="secondary-button" onClick={() => setPage("health")}>
                      Xem trạng thái dịch vụ
                    </button>
                  </div>
                </div>
              </div>

              {/* STATS GRID */}
              <div className="stats-grid">
                <div className="stat-card" onClick={() => setPage("users")}>
                  <div className="stat-info">
                    <span className="stat-label">Tổng tài khoản nhân sự</span>
                    <strong className="stat-value">{stats.total}</strong>
                    <span className="stat-sub">{stats.active} đang hoạt động</span>
                  </div>
                </div>

                <div className="stat-card" onClick={() => { setPage("users"); setRoleFilter("stylist"); }}>
                  <div className="stat-info">
                    <span className="stat-label">Stylist</span>
                    <strong className="stat-value">{stats.stylists}</strong>
                    <span className="stat-sub">Thợ tạo mẫu tóc</span>
                  </div>
                </div>

                <div className="stat-card" onClick={() => { setPage("users"); setRoleFilter("general_manager"); }}>
                  <div className="stat-info">
                    <span className="stat-label">General Manager</span>
                    <strong className="stat-value">{stats.managers}</strong>
                    <span className="stat-sub">Quản lý chi nhánh</span>
                  </div>
                </div>

                <div className="stat-card" onClick={() => { setPage("users"); setRoleFilter("system_admin"); }}>
                  <div className="stat-info">
                    <span className="stat-label">System Admin</span>
                    <strong className="stat-value">{stats.admins}</strong>
                    <span className="stat-sub">Quản trị viên</span>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN OVERVIEW */}
              <div className="dashboard-columns">
                {/* Microservice Health Quick Widget */}
                <div className="panel widget-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Dịch vụ hệ thống</h3>
                      <p>Kết nối giữa các tiến trình</p>
                    </div>
                    <button className="text-button" onClick={() => setPage("health")}>
                      Chi tiết
                    </button>
                  </div>
                  <div className="health-quick-list">
                    <div className="health-quick-item">
                      <span className="health-name">Auth Service</span>
                      <span className={`badge-status ${health?.services?.auth?.ok ? "active" : "locked"}`}>
                        {health?.services?.auth?.ok ? "Hoạt động" : "Không khả dụng"}
                      </span>
                    </div>

                    <div className="health-quick-item">
                      <span className="health-name">Core API</span>
                      <span className={`badge-status ${health?.services?.core?.ok ? "active" : "locked"}`}>
                        {health?.services?.core?.ok ? "Hoạt động" : "Không khả dụng"}
                      </span>
                    </div>

                    <div className="health-quick-item">
                      <span className="health-name">Auth Database (MongoDB)</span>
                      <span className={`badge-status ${health?.services?.authDatabase?.ok ? "active" : "locked"}`}>
                        {health?.services?.authDatabase?.ok ? "Kết nối tốt" : "Mất kết nối"}
                      </span>
                    </div>

                    <div className="health-quick-item">
                      <span className="health-name">Core Database (MongoDB)</span>
                      <span className={`badge-status ${health?.services?.coreDatabase?.ok ? "active" : "locked"}`}>
                        {health?.services?.coreDatabase?.ok ? "Kết nối tốt" : "Mất kết nối"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activities Widget */}
                <div className="panel widget-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Hoạt động kiểm toán gần đây</h3>
                      <p>Sự kiện thay đổi quyền và tài khoản</p>
                    </div>
                    <button className="text-button" onClick={() => setPage("audit")}>
                      Xem tất cả
                    </button>
                  </div>
                  <div className="recent-audit-list">
                    {events.slice(0, 5).map((evt, idx) => (
                      <div className="recent-audit-item" key={evt._id || idx}>
                        <span className="audit-action-tag">{evt.action}</span>
                        <div className="audit-details">
                          <span className="audit-target">
                            {evt.targetType} {evt.targetId ? `(${evt.targetId.slice(-6)})` : ""}
                          </span>
                          <small className="audit-time">
                            {new Date(evt.occurredAt).toLocaleString("vi-VN")}
                          </small>
                        </div>
                        <span className={`audit-result-tag ${evt.result === "success" ? "success" : "failed"}`}>
                          {evt.result === "success" ? "Thành công" : "Thất bại"}
                        </span>
                      </div>
                    ))}
                    {!events.length && (
                      <div className="empty-inline-state">
                        Chưa có sự kiện nào được ghi nhận.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: USERS MANAGEMENT */}
          {page === "users" && (
            <div className="users-view">
              {/* STATS SUMMARY BAR */}
              <div className="user-stats-bar">
                <div className="stat-pill">
                  <span>Tổng số: <strong>{stats.total}</strong></span>
                </div>
                <div className="stat-pill">
                  <span>Stylist: <strong>{stats.stylists}</strong></span>
                </div>
                <div className="stat-pill">
                  <span>Manager: <strong>{stats.managers}</strong></span>
                </div>
                <div className="stat-pill">
                  <span>Admin: <strong>{stats.admins}</strong></span>
                </div>
                <div className="stat-pill">
                  <span>Đang hoạt động: <strong>{stats.active}</strong></span>
                </div>
              </div>

              {/* SEARCH & FILTERS TOOLBAR */}
              <div className="filter-card">
                <div className="filter-row">
                  {/* Search Input */}
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Tìm theo tên, email hoặc số điện thoại..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
                        ×
                      </button>
                    )}
                  </div>

                  {/* Role Filter */}
                  <div className="filter-select-wrapper">
                    <label>Vai trò:</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      <option value="stylist">Stylist</option>
                      <option value="general_manager">General Manager</option>
                      <option value="system_admin">System Admin</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="filter-select-wrapper">
                    <label>Trạng thái:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="locked">Đã khóa</option>
                    </select>
                  </div>

                  {/* Reset filter button */}
                  {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setSearchTerm("");
                        setRoleFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      Xóa lọc
                    </button>
                  )}

                  {/* Add User Action */}
                  <button className="primary-button add-user-btn" onClick={() => setEditor({})}>
                    Thêm tài khoản
                  </button>
                </div>

                <div className="filter-summary">
                  Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} tài khoản nhân sự
                  {searchTerm && <span> · Tìm kiếm: "<em>{searchTerm}</em>"</span>}
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="panel table-panel">
                <div className="table-wrap">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>HỌ VÀ TÊN</th>
                        <th>EMAIL</th>
                        <th>SỐ ĐIỆN THOẠI</th>
                        <th>VAI TRÒ</th>
                        <th>TRẠNG THÁI</th>
                        <th style={{ textAlign: "right" }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const isSelf = user.id === currentUserId || user.email === currentUserEmail;
                        const roleMeta = ROLE_CONFIG[user.role] || { label: user.role };

                        return (
                          <tr key={user.id} className={user.status === "locked" ? "row-locked" : ""}>
                            {/* Full Name */}
                            <td>
                              <div className="user-cell">
                                <div className="user-avatar">
                                  {(user.fullName || user.email || "?").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="user-cell-meta">
                                  <strong>{user.fullName || "Chưa cập nhật"}</strong>
                                  {isSelf && <span className="self-tag">Bạn</span>}
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td>
                              <span className="email-text">{user.email}</span>
                            </td>

                            {/* Phone Number */}
                            <td>
                              {user.phone ? (
                                <span className="phone-text">{user.phone}</span>
                              ) : (
                                <span className="empty-text">—</span>
                              )}
                            </td>

                            {/* Role */}
                            <td>
                              <span className="role-tag">
                                {roleMeta.label}
                              </span>
                            </td>

                            {/* Status */}
                            <td>
                              <span className={`badge-status ${user.status === "locked" ? "locked" : "active"}`}>
                                {user.status === "locked" ? "Đã khóa" : "Đang hoạt động"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: "right" }}>
                              <div className="table-actions">
                                <button
                                  className="action-btn edit"
                                  onClick={() => setEditor(user)}
                                >
                                  Sửa
                                </button>

                                <button
                                  className={`action-btn ${user.status === "locked" ? "restore" : "lock"}`}
                                  disabled={busy || isSelf}
                                  title={isSelf ? "Không thể tự khóa tài khoản của chính mình" : ""}
                                  onClick={() => setConfirmAction(user)}
                                >
                                  {user.status === "locked" ? "Mở khóa" : "Khóa"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {!filteredUsers.length && (
                        <tr>
                          <td colSpan="6" className="empty-table-cell">
                            <div className="empty-table-state">
                              <h4>Không tìm thấy tài khoản phù hợp</h4>
                              <p>Thử điều chỉnh lại từ khóa hoặc xóa bộ lọc.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 3: SYSTEM HEALTH */}
          {page === "health" && (
            <div className="health-view">
              <div className="health-status-banner">
                <div>
                  <h2>
                    {health
                      ? health.ok
                        ? "Hệ thống hoạt động bình thường"
                        : "Một số dịch vụ đang gián đoạn"
                      : "Đang kiểm tra kết nối..."}
                  </h2>
                  <p>
                    {health?.checkedAt
                      ? `Kiểm tra lúc: ${new Date(health.checkedAt).toLocaleString("vi-VN")}`
                      : ""}
                  </p>
                </div>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void reload("health")}
                >
                  Kiểm tra lại
                </button>
              </div>

              <div className="health-grid-cards">
                {[
                  {
                    key: "auth",
                    title: "Auth Service",
                    desc: "Xác thực phiên đăng nhập, cấp phát JWT và phân quyền",
                    port: "Port 4101",
                  },
                  {
                    key: "core",
                    title: "Core API",
                    desc: "Quản lý chi nhánh, dịch vụ salon, ca thợ và lịch hẹn",
                    port: "Port 4102",
                  },
                  {
                    key: "authDatabase",
                    title: "Auth Database",
                    desc: "Cơ sở dữ liệu MongoDB lưu trữ tài khoản nhân sự",
                    port: "shine-auth",
                  },
                  {
                    key: "coreDatabase",
                    title: "Core Database",
                    desc: "Cơ sở dữ liệu MongoDB lưu trữ catalog và nghiệp vụ",
                    port: "shine-core",
                  },
                ].map((item) => {
                  const isOk = health?.services?.[item.key]?.ok;
                  return (
                    <div className="health-card" key={item.key}>
                      <div className="health-card-head">
                        <div>
                          <h3>{item.title}</h3>
                          <span className="health-port-tag">{item.port}</span>
                        </div>
                        <span className={`badge-status ${isOk ? "active" : "locked"}`}>
                          {isOk ? "Hoạt động" : "Mất kết nối"}
                        </span>
                      </div>
                      <p className="health-desc">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAGE 4: AUDIT LOG */}
          {page === "audit" && (
            <div className="audit-view">
              <form
                className="filter-card audit-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  void reload("audit", filters);
                }}
              >
                <div className="filter-row">
                  <div className="filter-input-group">
                    <label>Hành động:</label>
                    <input
                      value={filters.action}
                      onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                      placeholder="Ví dụ: staff.create"
                    />
                  </div>

                  <div className="filter-select-wrapper">
                    <label>Kết quả:</label>
                    <select
                      value={filters.result}
                      onChange={(e) => setFilters({ ...filters, result: e.target.value })}
                    >
                      <option value="">Tất cả</option>
                      <option value="success">Thành công</option>
                      <option value="failed">Thất bại</option>
                    </select>
                  </div>

                  <div className="filter-input-group">
                    <label>Từ ngày:</label>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                    />
                  </div>

                  <div className="filter-input-group">
                    <label>Đến ngày:</label>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                    />
                  </div>

                  <button className="primary-button" type="submit" disabled={busy}>
                    Lọc
                  </button>
                </div>
              </form>

              <div className="panel table-panel">
                <div className="table-wrap">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>THỜI GIAN</th>
                        <th>HÀNH ĐỘNG</th>
                        <th>ĐỐI TƯỢNG</th>
                        <th>NGƯỜI THỰC HIỆN</th>
                        <th>KẾT QUẢ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event, index) => (
                        <tr key={event._id || index}>
                          <td>
                            <span>{new Date(event.occurredAt).toLocaleString("vi-VN")}</span>
                          </td>
                          <td>
                            <span className="audit-action-tag">{event.action}</span>
                          </td>
                          <td>
                            <span>{event.targetType}</span>
                            {event.targetId && <small style={{ display: "block", color: "#64748B" }}>{event.targetId}</small>}
                          </td>
                          <td>
                            <span>{event.actorId || "Hệ thống"}</span>
                          </td>
                          <td>
                            <span className={`badge-status ${event.result === "success" ? "active" : "locked"}`}>
                              {event.result === "success" ? "Thành công" : "Thất bại"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!events.length && (
                        <tr>
                          <td colSpan="5" className="empty-table-cell">
                            {busy ? "Đang tải dữ liệu..." : "Chưa có sự kiện kiểm toán phù hợp."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* MODAL: ADD / EDIT USER */}
      {editor && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setEditor(null)}
        >
          <form className="modal-dialog" onSubmit={(e) => void saveUser(e)}>
            <div className="modal-header">
              <h2>{editor.id ? "Sửa tài khoản" : "Tạo tài khoản nhân sự"}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditor(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-field">
                <span>Họ và tên *</span>
                <input
                  name="fullName"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  defaultValue={editor.fullName || ""}
                  autoComplete="name"
                />
              </label>

              <label className="modal-field">
                <span>Số điện thoại</span>
                <input
                  name="phone"
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  defaultValue={editor.phone || ""}
                  pattern="^(\+?[0-9\s\-().]{8,20})?$"
                  title="Nhập số điện thoại hợp lệ (từ 8 đến 20 số)"
                />
              </label>

              <label className="modal-field">
                <span>Email *</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nhansu@30shine.vn"
                  defaultValue={editor.email || ""}
                  autoComplete="email"
                />
              </label>

              <label className="modal-field">
                <span>Vai trò *</span>
                <select name="role" defaultValue={editor.role || "stylist"}>
                  {Object.entries(ROLE_CONFIG).map(([value, conf]) => (
                    <option key={value} value={value}>
                      {conf.label} ({conf.desc})
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-field">
                <span>
                  {editor.id
                    ? "Mật khẩu mới (để trống nếu giữ nguyên)"
                    : "Mật khẩu khởi tạo *"}
                </span>
                <div className="password-wrapper">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    required={!editor.id}
                    placeholder={editor.id ? "Giữ nguyên nếu không nhập" : "Tối thiểu 8 ký tự"}
                    autoComplete="new-password"
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
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditor(null)}
              >
                Hủy
              </button>
              <button
                className="primary-button"
                disabled={busy}
                type="submit"
              >
                {busy ? "Đang xử lý..." : editor.id ? "Lưu thay đổi" : "Tạo tài khoản"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM MODAL FOR LOCK / RESTORE */}
      {confirmAction && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmAction(null)}
        >
          <div className="modal-dialog confirm-dialog">
            <h3>
              {confirmAction.status === "locked"
                ? "Khôi phục tài khoản?"
                : "Khóa tài khoản nhân sự?"}
            </h3>
            <p className="confirm-message">
              {confirmAction.status === "locked" ? (
                <>
                  Khôi phục quyền truy cập cho tài khoản <strong>{confirmAction.fullName || confirmAction.email}</strong>.
                </>
              ) : (
                <>
                  Khóa truy cập của tài khoản <strong>{confirmAction.fullName || confirmAction.email}</strong>. Phiên đăng nhập hiện tại sẽ bị vô hiệu hóa.
                </>
              )}
            </p>
            <div className="modal-footer confirm-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`primary-button ${confirmAction.status === "locked" ? "btn-restore" : "btn-danger"}`}
                disabled={busy}
                onClick={() => void executeToggleUser(confirmAction)}
              >
                {busy
                  ? "Đang xử lý..."
                  : confirmAction.status === "locked"
                  ? "Khôi phục"
                  : "Xác nhận khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
