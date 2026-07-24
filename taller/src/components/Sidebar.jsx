import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getAvatarUrl } from "../schemas/api/config";
import meqanoxLogo from "../assets/images/meqanox-logo-sidebar.png";
import meqanoxLogoLight from "../assets/images/meqanox-logo-sidebar-light.png";
import Swal from "sweetalert2";
import axios from "../api/axios";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tallerNombre, setTallerNombre] = useState("");
  const { logout, user } = useAuth();
  const { theme: t, themeName, setThemeName, largeFonts, toggleLargeFonts, THEMES } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    axios.get("/config/taller").then(res => setTallerNombre(res.data.tallerNombre || "")).catch(() => {});
  }, []);

  const isSuperAdmin = user?.cargo?.toLowerCase() === "superadmin";
  const isAdmin      = isSuperAdmin || user?.cargo === "Administrador";

  const NAV_ITEMS = [
    { to: "/dashboard",    icon: "dashboard",          label: "Panel de Control" },
    { to: "/tasks",        icon: "list_alt",            label: "Órdenes" },
    { to: "/add-task",     icon: "add_circle_outline",  label: "Nueva Orden" },
    { to: "/search-tasks", icon: "manage_search",       label: "Buscar" },
    { to: "/clients",      icon: "people",              label: "Clientes" },
    ...(isAdmin      ? [{ to: "/stats",       icon: "bar_chart",      label: "Estadísticas" }] : []),
    ...(isAdmin      ? [{ to: "/users-admin", icon: "manage_accounts", label: "Usuarios" }] : []),
    ...(isSuperAdmin ? [{ to: "/logs",        icon: "history",        label: "Logs" }] : []),
    { to: "/profile",      icon: "account_circle",     label: "Perfil" },
  ];

  const handleLogout = async () => {
    const confirmed = await logout();
    if (confirmed) navigate("/login");
  };

  const navTextColor  = t.sidebarText;
  const navTextActive = t.sidebarTextActive;

  return (
    <aside style={{
      width:        isCollapsed ? "68px" : "230px",
      background:   t.sidebar,          // ← fondo plano, sin degradado
      borderRight:  `1px solid ${t.sidebarBorder}`,
      transition:   "width 0.3s cubic-bezier(.4,0,.2,1)",
      flexShrink:   0,
    }} className="h-screen flex flex-col sticky top-0 overflow-hidden z-50">

      {/* Franja decorativa tema taller */}
      {themeName === "taller" && (
        <div style={{ display: "flex", height: "4px", flexShrink: 0 }}>
          <div style={{ flex: 1, background: "#CC0000" }} />
          <div style={{ flex: 1, background: "#FFD700" }} />
          <div style={{ flex: 1, background: "#0A0A0A", border: "1px solid #333" }} />
        </div>
      )}

      {/* Logo + toggle */}
      <div className="flex items-center justify-between px-3 py-3"
        style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
        {!isCollapsed && (
          <div className="flex flex-col">
            <img
              src={themeName === "light" ? meqanoxLogoLight : meqanoxLogo}
              alt="MeQanoX"
              style={{ width: "180px", height: "80px", objectFit: "contain" }}
            />
            {tallerNombre && (
              <span className="text-xs font-semibold truncate max-w-[160px] mt-1"
                style={{ color: t.textMuted, letterSpacing: "0.5px" }}>
                {tallerNombre}
              </span>
            )}
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg transition-all ml-auto"
          style={{ color: navTextColor }}>
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
                className="flex-1 py-1 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: themeName === th.name ? th.accent : "rgba(255,255,255,0.08)",
                  color:      themeName === th.name ? "#fff" : navTextColor,
                  border:     `1px solid ${themeName === th.name ? th.accent : "rgba(255,255,255,0.12)"}`,
                }}>
                {th.label === "Oscuro" ? "🌙" : th.label === "Taller" ? "🔧" : "☀️"}
              </button>
            ))}
          </div>
          <button onClick={toggleLargeFonts}
            className="mt-2 w-full py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            style={{
              background: largeFonts ? t.accent : "rgba(255,255,255,0.08)",
              color:      largeFonts ? "#fff" : navTextColor,
              border:     `1px solid ${largeFonts ? t.accent : "rgba(255,255,255,0.12)"}`,
            }}>
            <span className="material-icons text-sm">text_fields</span>
            {largeFonts ? "Fuente grande" : "Fuente normal"}
          </button>
        </div>
      )}

      {/* Avatar */}
      {!isCollapsed && user && (
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div className="flex items-center gap-2">
            {user?.profileImage ? (
              <img src={getAvatarUrl(user.profileImage)}
                alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                style={{ border: `2px solid ${t.accent}` }}
                onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: t.bgSecondary, color: t.accent, border: `2px solid ${t.accent}` }}>
                {(user?.nombres?.[0] || "") + (user?.apellidos?.[0] || "")}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate" style={{ color: "#fff" }}>{user?.nombres} {user?.apellidos}</p>
              <p className="text-xs truncate"               style={{ color: navTextColor }}>{user?.cargo}</p>
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
                  style={{
                    background:  active ? `${t.accent}22` : "transparent",
                    color:       active ? navTextActive : navTextColor,
                    borderLeft:  active ? `2px solid ${t.accent}` : "2px solid transparent",
                  }}>
                  <span className="material-icons text-xl flex-shrink-0">{icon}</span>
                  {!isCollapsed && <span>{label}</span>}
                  {isCollapsed && (
                    <span className="absolute left-14 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                      style={{ background: t.bgSecondary, color: t.text, border: `1px solid ${t.border}` }}>
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Configuración + Logout */}
      <div className="p-2" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
        {isSuperAdmin && (
          <Link to="/settings"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all mb-1"
            style={{ color: t.sidebarText }}
            onMouseEnter={e => { e.currentTarget.style.background = `${t.accent}18`; e.currentTarget.style.color = t.sidebarTextActive; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent";    e.currentTarget.style.color = t.sidebarText; }}>
            <span className="material-icons text-xl flex-shrink-0">settings</span>
            {!isCollapsed && <span>Configuración</span>}
          </Link>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative"
          style={{ color: t.sidebarText }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent";           e.currentTarget.style.color = t.sidebarText; }}>
          <span className="material-icons text-xl flex-shrink-0">logout</span>
          {!isCollapsed && <span>Cerrar sesión</span>}
          {isCollapsed && (
            <span className="absolute left-14 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
              style={{ background: t.bgSecondary, color: t.text, border: `1px solid ${t.border}` }}>
              Cerrar sesión
            </span>
          )}
        </button>
      </div>

      {/* Franja decorativa inferior tema taller */}
      {themeName === "taller" && (
        <div style={{ display: "flex", height: "4px", flexShrink: 0 }}>
          <div style={{ flex: 1, background: "#0A0A0A", border: "1px solid #333" }} />
          <div style={{ flex: 1, background: "#FFD700" }} />
          <div style={{ flex: 1, background: "#CC0000" }} />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
