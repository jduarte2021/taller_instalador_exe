import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

const ACTION_COLORS = {
  LOGIN: { bg: "#052e16", text: "#4ade80", icon: "login" },
  REGISTER: { bg: "#1e1b4b", text: "#818cf8", icon: "person_add" },
  ADMIN_REGISTER: { bg: "#1e1b4b", text: "#a78bfa", icon: "admin_panel_settings" },
  CREATE_TASK: { bg: "#0c1a2e", text: "#38bdf8", icon: "add_task" },
  UPDATE_TASK: { bg: "#1a1200", text: "#fbbf24", icon: "edit" },
  DELETE_TASK: { bg: "#450a0a", text: "#f87171", icon: "delete" },
  COMPLETE_TASK: { bg: "#052e16", text: "#4ade80", icon: "check_circle" },
  BACKUP: { bg: "#1a0a2e", text: "#c084fc", icon: "backup" },
  SEND_EMAIL: { bg: "#0a1a2e", text: "#67e8f9", icon: "email" },
};

export default function LogsPage() {
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState("all");

  const isSuperAdmin = user?.cargo?.toLowerCase() === "superadmin";
  useEffect(() => { if (!isSuperAdmin) navigate("/dashboard"); }, [isSuperAdmin]);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`/logs?page=${p}&limit=50`, { withCredentials: true });
      setLogs(res.data.logs);
      setTotalPages(res.data.pages);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const filtered = filterAction === "all" ? logs : logs.filter(l => l.action === filterAction);

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: t.text }}>📜 Logs del Sistema</h1>
            <p className="text-sm mt-1" style={{ color: t.textMuted }}>Registro de actividad — solo visible para Superadmin</p>
          </div>
          <button onClick={() => fetchLogs(page)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: t.bgSecondary, color: t.textMuted }}>
            <span className="material-icons text-sm">refresh</span> Actualizar
          </button>
        </div>

        {/* Filtro por acción */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setFilterAction("all")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: filterAction === "all" ? t.accent : t.bgSecondary, color: filterAction === "all" ? "#fff" : t.textMuted }}>
            Todos ({logs.length})
          </button>
          {uniqueActions.map(action => {
            const cfg = ACTION_COLORS[action] || { bg: t.bgSecondary, text: t.textMuted };
            const count = logs.filter(l => l.action === action).length;
            return (
              <button key={action} onClick={() => setFilterAction(action)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: filterAction === action ? cfg.bg : t.bgSecondary, color: filterAction === action ? cfg.text : t.textMuted, border: filterAction === action ? `1px solid ${cfg.text}40` : `1px solid ${t.border}` }}>
                {action} ({count})
              </button>
            );
          })}
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${t.accent}40`, borderTopColor: t.accent }} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20" style={{ color: t.textMuted }}>
            <span className="material-icons text-5xl mb-3">history</span>
            <p>No hay logs registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => {
              const cfg = ACTION_COLORS[log.action] || { bg: t.bgSecondary, text: t.textMuted, icon: "info" };
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl"
                  style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                  {/* Ícono acción */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg }}>
                    <span className="material-icons text-sm" style={{ color: cfg.text }}>{cfg.icon}</span>
                  </div>
                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.text }}>{log.action}</span>
                      <span className="text-xs font-semibold" style={{ color: t.accent }}>
                        {log.username || "Sistema"}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: t.text }}>{log.description}</p>
                    {log.ip && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>IP: {log.ip}</p>}
                  </div>
                  {/* Fecha */}
                  <div className="text-xs text-right flex-shrink-0" style={{ color: t.textMuted }}>
                    <div>{new Date(log.createdAt).toLocaleDateString("es-CL")}</div>
                    <div>{new Date(log.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-30"
              style={{ background: t.bgSecondary, color: t.textMuted }}>← Anterior</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-9 h-9 rounded-lg text-sm font-bold"
                style={{ background: p === page ? `${t.accent}` : t.bgSecondary, color: p === page ? "#fff" : t.textMuted }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-30"
              style={{ background: t.bgSecondary, color: t.textMuted }}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}
