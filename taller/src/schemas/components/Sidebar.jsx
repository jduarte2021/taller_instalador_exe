import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { API_BASE, getAvatarUrl } from "../api/config.js";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const { theme: t, themeName, setThemeName, largeFonts, toggleLargeFonts, THEMES } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.cargo === "Administrador" || user?.email?.includes("jimmy.duarte");
  const isSuperAdmin = user?.username === "jduarte" || user?.email?.includes("jimmy.duarte");

  const NAV_ITEMS = [
    { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/tasks", icon: "list_alt", label: "Órdenes" },
    { to: "/add-task", icon: "add_circle_outline", label: "Nueva Orden" },
    { to: "/search-tasks", icon: "manage_search", label: "Buscar" },
    { to: "/clients", icon: "people", label: "Clientes" },
    ...(isAdmin ? [{ to: "/stats", icon: "bar_chart", label: "Estadísticas" }] : []),
    ...(isAdmin ? [{ to: "/users-admin", icon: "manage_accounts", label: "Usuarios" }] : []),
    ...(isSuperAdmin ? [{ to: "/logs", icon: "history", label: "Logs" }] : []),
    { to: "/profile", icon: "account_circle", label: "Perfil" },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };
  const navTextColor = t.sidebarText;
  const navTextActive = t.sidebarTextActive;
  const avatarSrc = getAvatarUrl(user?.profileImage);
  const initials = `${user?.nombres?.[0] || ""}${user?.apellidos?.[0] || ""}`;

  return (
    <aside style={{ width: isCollapsed ? "68px" : "230px", background: `linear-gradient(180deg, ${t.sidebar} 0%, ${t.sidebar}ee 100%)`, borderRight: `1px solid ${t.sidebarBorder}`, transition: "width 0.3s cubic-bezier(.4,0,.2,1)", flexShrink: 0 }}
      className="h-screen flex flex-col sticky top-0 overflow-hidden z-50">

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
        {!isCollapsed && <div><span className="text-sm font-black tracking-widest uppercase" style={{ color: "#fff" }}>Taller</span><span className="text-sm font-black tracking-widest" style={{ color: t.accent }}>Data</span></div>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 rounded-lg ml-auto" style={{ color: navTextColor }}>
          <span className="material-icons text-xl">{isCollapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
      </div>

      {/* Theme switcher */}
      {!isCollapsed && (
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <p className="text-xs mb-1.5 font-semibold uppercase tracking-widest" style={{ color: navTextColor }}>Tema</p>
          <div className="flex gap-1">
            {Object.values(THEMES).map(th => (
              <button key={th.name} onClick={() => setThemeName(th.name)} title={th.label}
                className="flex-1 py-1 rounded-lg text-xs font-bold"
                style={{ background: themeName === th.name ? th.accent : "rgba(255,255,255,0.1)", color: themeName === th.name ? "#fff" : navTextColor, border: `1px solid ${themeName === th.name ? th.accent : "rgba(255,255,255,0.15)"}` }}>
                {th.label === "Oscuro" ? "🌙" : th.label === "Taller" ? "🔧" : "☀️"}
              </button>
            ))}
          </div>
          <button onClick={toggleLargeFonts}
            className="mt-2 w-full py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: largeFonts ? t.accent : "rgba(255,255,255,0.1)", color: largeFonts ? "#fff" : navTextColor, border: `1px solid ${largeFonts ? t.accent : "rgba(255,255,255,0.15)"}` }}>
            <span className="material-icons text-sm">text_fields</span>
            {largeFonts ? "Fuente grande" : "Fuente normal"}
          </button>
        </div>
      )}

      {/* Avatar */}
      {!isCollapsed && user && (
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div className="flex items-center gap-2">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                style={{ border: `2px solid ${t.accent}` }}
                onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${t.accent}30`, color: t.accent, border: `2px solid ${t.accent}` }}>{initials}</div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate" style={{ color: "#fff" }}>{user?.nombres} {user?.apellidos}</p>
              <p className="text-xs truncate" style={{ color: navTextColor }}>{user?.cargo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ to, icon, label }) => {
            const active = location.pathname === to;
            return (
              <li key={to}>
                <Link to={to} title={isCollapsed ? label : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group"
                  style={{ background: active ? `${t.accent}25` : "transparent", color: active ? navTextActive : navTextColor, borderLeft: active ? `2px solid ${t.accent}` : "2px solid transparent" }}>
                  <span className="material-icons text-xl flex-shrink-0">{icon}</span>
                  {!isCollapsed && <span>{label}</span>}
                  {isCollapsed && (
                    <span className="absolute left-14 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50"
                      style={{ background: t.bgSecondary, color: t.text }}>{label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Backup */}
      {isAdmin && !isCollapsed && (
        <div className="px-3 py-2" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
          <button onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/api/tasks/backup`, { credentials: "include" });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = `respaldo_${new Date().toISOString().split("T")[0]}.zip`; a.click();
            } catch { alert("Error al generar respaldo"); }
          }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: `${t.accent}20`, color: t.accent, border: `1px solid ${t.accent}40` }}>
            <span className="material-icons text-sm">backup</span> Respaldo ZIP
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="p-2" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ color: navTextColor }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = navTextColor; }}>
          <span className="material-icons text-xl flex-shrink-0">logout</span>
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
