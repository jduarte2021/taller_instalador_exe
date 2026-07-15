import { useTask } from "../context/TaskContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "../api/axios";
import { generateOrderPDF } from "../utils/pdfGenerator.js";

const BAR_COLORS = ["#056875", "#50C2E5", "#D46600", "#C9495E"];

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(tm); }, []);
  const colW = 300 / data.length;
  return (
    <svg viewBox="0 0 300 110" className="w-full h-40">
      {data.map((d, i) => {
        const color = BAR_COLORS[i % BAR_COLORS.length];
        const fullH = Math.max(6, (d.value / max) * 72);
        const h = animated ? fullH : 0;
        const x = i * colW + 4;
        const barW = colW - 8;
        return (
          <g key={i}>
            {/* Background track */}
            <rect x={x} y={12} width={barW} height={72} rx="5" fill="rgba(255,255,255,0.04)" />
            {/* Animated bar */}
            <rect x={x} y={84 - h} width={barW} height={h} rx="5"
              fill={color} opacity="0.88"
              style={{ transition: `y 0.9s cubic-bezier(.4,0,.2,1) ${i*0.06}s, height 0.9s cubic-bezier(.4,0,.2,1) ${i*0.06}s` }}
            />
            {/* Value on top */}
            {d.value > 0 && (
              <text x={x + barW / 2} y={animated ? 84 - fullH - 5 : 84} textAnchor="middle"
                fontSize="11" fontWeight="800" fill={color}
                style={{ transition: `opacity 0.4s ease ${0.5 + i*0.06}s, y 0.9s ease`, opacity: animated ? 1 : 0 }}>
                {d.value}
              </text>
            )}
            {/* Month label */}
            <text x={x + barW / 2} y={100} textAnchor="middle"
              fontSize="11" fontWeight="700" fill="#94a3b8">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ slices }) {
  const total = slices.reduce((s, c) => s + c.value, 0) || 1;
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 250); return () => clearTimeout(tm); }, []);
  const r = 64, cx = 84, cy = 84, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 168 168" className="w-56 h-56">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="18" />
      {slices.map((s, i) => {
        const dash = animated ? (s.value / total) * circ : 0;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: `stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1) ${i * 0.25}s` }}
          />
        );
        offset += (s.value / total) * circ;
        return el;
      })}
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28" fontWeight="900" fill="#f1f5f9">{total}</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize="13" fontWeight="600" fill="#94a3b8">órdenes</text>
    </svg>
  );
}

function KPICard({ icon, label, value, sub, accent, t }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), 80); return () => clearTimeout(tm); }, []);
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden"
      style={{
        background: `${t.bgCard}`,
        border: `1px solid ${t.border}`,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.5s cubic-bezier(.4,0,.2,1), opacity 0.5s ease",
      }}>
      <div className="absolute inset-0 opacity-10 rounded-2xl"
        style={{ background: "transparent" }} />
      <div className="z-10 text-2xl">{icon}</div>
      <div className="z-10">
        <div className="text-4xl font-black tracking-tight" style={{ color: t.text }}>{value}</div>
        <div className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: accent }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completada: { bg: "#052e16", text: "#4ade80", label: "✔ Completada" },
    "en curso": { bg: "#451a03", text: "#fb923c", label: "⏳ En curso" },
  };
  const s = map[status] || { bg: "#1e293b", text: "#94a3b8", label: status };
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
}

export default function DashboardPage() {
  const { getTasks, tasks, deleteTask } = useTask();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const navigate = useNavigate();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showIngresos, setShowIngresos] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const TASKS_PER_PAGE = 6;

  const isAdmin = user?.cargo?.toLowerCase() === "superadmin" || user?.cargo === "Administrador";

  useEffect(() => { getTasks(); }, []);

  useEffect(() => {
    if (!tasks.length) return;
    const now = new Date();
    const notifs = tasks.filter(t => t.status !== "completada" && (now - new Date(t.date)) / 86400000 > 5)
      .map(t => ({ id: t.id, msg: `Orden #${t.orderNumber} lleva ${Math.floor((now - new Date(t.date)) / 86400000)} días sin completar` }));
    setNotifications(notifs.slice(0, 5));
  }, [tasks]);

  const kpis = useMemo(() => {
    const total = tasks.length;
    const completadas = tasks.filter(t => t.status === "completada").length;
    const enCurso = tasks.filter(t => t.status === "en curso").length;
    const ingresos = tasks.filter(t => t.status === "completada").reduce((s, t) => s + (Number(t.servicePrice) || 0), 0);
    return { total, completadas, enCurso, ingresos };
  }, [tasks]);

  const monthData = useMemo(() => {
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const counts = Array(12).fill(0);
    tasks.forEach(t => { counts[new Date(t.date).getMonth()]++; });
    const now = new Date().getMonth();
    return months.slice(Math.max(0, now - 5), now + 1).map((label, i) => ({ label, value: counts[Math.max(0, now - 5) + i] }));
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter !== "all") list = list.filter(t => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => (`${t.clientNombres} ${t.clientApellidos}`).toLowerCase().includes(q) || t.orderNumber?.toString().includes(q) || t.carPlate?.toLowerCase().includes(q) || t.carBrand?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "date_asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "price_desc") return (b.servicePrice||0) - (a.servicePrice||0);
      return (a.servicePrice||0) - (b.servicePrice||0);
    });
    return list;
  }, [tasks, filter, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / TASKS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * TASKS_PER_PAGE, currentPage * TASKS_PER_PAGE);

  const handleDelete = (id) => {
    Swal.fire({
      title: "¿Eliminar orden?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      background: t.bgCard, color: t.text,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: t.bgSecondary,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(r => {
      if (r.isConfirmed) {
        deleteTask(id);
        Swal.fire({
          title: "🗑️ Orden eliminada",
          text: "La orden fue eliminada correctamente.",
          icon: "success",
          confirmButtonText: "OK",
          background: t.bgCard,
          color: t.text,
          confirmButtonColor: t.accent,
          timer: 3000,
          timerProgressBar: true,
        });
      }
    });
  };

  const handleComplete = async (id) => {
    try {
      await axios.put(`/tasks/${id}/complete`);
      getTasks();
      Swal.fire({
        title: "✅ Orden completada",
        text: "La orden fue marcada como completada.",
        icon: "success",
        confirmButtonText: "OK",
        background: t.bgCard,
        color: t.text,
        confirmButtonColor: "#4ade80",
        timer: 3000,
        timerProgressBar: true,
      });
    } catch { Swal.fire({ title: "Error", icon: "error", background: t.bgCard, color: t.text }); }
  };

    const generatePDF = async (task) => {
    await generateOrderPDF(task);
  };

  return (
    <div className="min-h-screen" style={{ background: t.bg, color: t.text, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div className="relative z-10 p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: t.text }}>Panel de Control</h1>
            <p className="text-sm mt-1" style={{ color: t.textMuted }}>{new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-xl transition-all" style={{ background: t.bgSecondary }}>
              <span className="material-icons" style={{ color: t.textMuted }}>notifications</span>
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-xs font-bold text-white flex items-center justify-center">{notifications.length}</span>}
            </button>
            <button onClick={() => navigate("/add-task")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:opacity-90 text-white"
              style={{ background: `${t.accent}` }}>
              <span className="material-icons text-base">add_task</span> Nueva Orden
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {showNotif && (
          <div className="mb-6 rounded-2xl p-4" style={{ background: "#110f00", border: "1px solid rgba(234,179,8,0.2)" }}>
            <div className="flex items-center gap-2 mb-3"><span className="material-icons text-yellow-400">warning</span>
              <h3 className="font-bold text-yellow-300">Alertas ({notifications.length})</h3></div>
            {notifications.length === 0 ? <p className="text-sm" style={{ color: t.textMuted }}>Sin alertas.</p> :
              <ul className="space-y-2">{notifications.map((n, i) => (
                <li key={i} className="text-sm text-yellow-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />{n.msg}
                </li>))}</ul>}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard icon="📋" label="Total órdenes" value={kpis.total} accent={t.accent} t={t} />
          <KPICard icon="✅" label="Completadas" value={kpis.completadas} accent="#4ade80" sub={`${Math.round((kpis.completadas/(kpis.total||1))*100)}% del total`} t={t} />
          <KPICard icon="⏳" label="En curso" value={kpis.enCurso} accent="#fb923c" t={t} />
          {isAdmin
            ? <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden"
                style={{ background: `${t.bgCard}`, border: `1px solid ${t.border}` }}>
                <div className="absolute inset-0 opacity-10 rounded-2xl"
                  style={{ background: "transparent" }} />
                <div className="z-10 text-2xl">💰</div>
                <div className="z-10">
                  <div className="text-4xl font-black tracking-tight" style={{ color: t.text }}>
                    {showIngresos
                      ? `$${new Intl.NumberFormat("es-CL").format(kpis.ingresos)}`
                      : <span className="tracking-widest text-3xl">••••••</span>}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#a78bfa" }}>Ingresos completados</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: t.textMuted }}>CLP</span>
                    <button onClick={() => setShowIngresos(v => !v)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold transition-all hover:opacity-80"
                      style={{ background: `${t.bgSecondary}`, color: "#a78bfa", border: "1px solid #a78bfa44" }}>
                      <span className="material-icons text-sm">{showIngresos ? "visibility_off" : "visibility"}</span>
                      {showIngresos ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>
              </div>
            : <KPICard icon="🔧" label="Mis asignadas" value={tasks.filter(tk => tk.assignedTo?.nombres === user?.nombres).length} accent="#a78bfa" t={t} />
          }
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 rounded-2xl p-5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-1" style={{ color: t.text }}>Órdenes por mes</h3>
            <p className="text-xs mb-2" style={{ color: t.textMuted }}>Últimos 6 meses</p>
            <BarChart data={monthData} />
          </div>
          <div className="rounded-2xl p-5 flex flex-col items-center justify-center gap-4" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <h3 className="font-bold text-sm uppercase tracking-widest w-full" style={{ color: t.text }}>Por estado</h3>
            <DonutChart slices={[{ value: kpis.completadas, color: "#4ade80" }, { value: kpis.enCurso, color: "#fb923c" }]} />
            <div className="flex flex-col gap-2 text-sm w-full">
              {[["#4ade80","Completadas",kpis.completadas],["#fb923c","En curso",kpis.enCurso]].map(([c,l,v]) => (
                <div key={l} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: c }} /><span className="font-medium" style={{ color: t.textMuted }}>{l}</span></div>
                  <span className="font-bold text-base" style={{ color: t.text }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="flex-1 min-w-48 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: t.textMuted }}>search</span>
            <input type="text" placeholder="Buscar por cliente, patente, marca..." value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text }} />
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
            {[["all","Todas"],["en curso","En curso"],["completada","Completadas"]].map(([val, label]) => (
              <button key={val} onClick={() => { setFilter(val); setCurrentPage(1); }}
                className="px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: filter === val ? (val === "completada" ? "#052e16" : val === "en curso" ? "#451a03" : `${t.accent}20`) : t.bgSecondary,
                  color: filter === val ? (val === "completada" ? "#4ade80" : val === "en curso" ? "#fb923c" : t.accent) : t.textMuted }}>
                {label}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-xs outline-none"
            style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text }}>
            <option value="date_desc">📅 Más recientes</option>
            <option value="date_asc">📅 Más antiguas</option>
            <option value="price_desc">💰 Mayor precio</option>
            <option value="price_asc">💰 Menor precio</option>
          </select>
        </div>

        <p className="text-xs mb-4" style={{ color: t.textMuted }}>
          Mostrando <span className="font-semibold" style={{ color: t.text }}>{filtered.length}</span> órdenes
        </p>

        {/* Tarjetas */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: t.textMuted }}>
            <span className="material-icons text-5xl mb-3">inbox</span>
            <p className="text-lg font-semibold">No hay órdenes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginated.map(task => (
              <div key={task.id} id={`task-${task.id}`}
                className="rounded-2xl p-5 border transition-all"
                style={{ background: task.status === "completada"
                  ? (t.name === "light" ? "#dcfce7" : t.bgCard)
                  : t.bgCard,
                  border: `1px solid ${task.status === "completada" ? (t.name === "light" ? "#86efac" : "#166534") : t.border}` }}>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-mono mb-0.5" style={{ color: t.textMuted }}>ORDEN #{task.orderNumber}</div>
                    <h3 className="font-bold text-lg leading-tight" style={{ color: t.text }}>{`${task.clientNombres} ${task.clientApellidos}`}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: t.textMuted }}>{task.carBrand} {task.carModel}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: t.bgSecondary, color: t.textMuted }}>{task.carPlate}</span>
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>

                {/* Grid de datos completo */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  {[
                    ["RUT", task.clientRUT],
                    ["Teléfono", task.clientPhone],
                    ["Email", task.clientEmail],
                    ["Color", task.carColor],
                    ["Detalles", task.carDetails],
                    ["Precio", task.servicePrice !== undefined ? `$${new Intl.NumberFormat("es-CL").format(task.servicePrice)} CLP` : "—"],
                    ["Mecánico", task.assignedTo ? `${task.assignedTo.nombres} ${task.assignedTo.apellidos}` : "No asignado"],
                    ["Fecha", new Date(task.date).toLocaleDateString("es-CL")],
                    ["Creado por", task.createdBy?.username || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span style={{ color: t.textMuted }}>{k}</span>
                      <span className="font-medium truncate" style={{ color: t.text }}>{v}</span>
                    </div>
                  ))}
                </div>

                {task.repairDescription && (
                  <p className="text-xs italic mb-3 line-clamp-2" style={{ color: t.textMuted }}>"{task.repairDescription}"</p>
                )}

                {/* Botones */}
                <div className="flex gap-2 flex-wrap no-print">
                  <button onClick={() => navigate(`/task/${task.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: `${t.accent}20`, color: t.accent }}>
                    <span className="material-icons text-sm">edit</span> Editar
                  </button>
                  <button onClick={() => handleDelete(task.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "#450a0a", color: "#f87171" }}>
                    <span className="material-icons text-sm">delete</span> Borrar
                  </button>
                  <button onClick={() => generatePDF(task)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "#1a2e1a", color: "#4ade80" }}>
                    <span className="material-icons text-sm">picture_as_pdf</span> PDF
                  </button>
                  {task.status !== "completada" && (
                    <button onClick={() => handleComplete(task.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 ml-auto"
                      style={{ background: "#1a2e1a", color: "#4ade80", border: "1px solid #166534" }}>
                      <span className="material-icons text-sm">check_circle</span> Completar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-30"
              style={{ background: t.bgSecondary, color: t.textMuted }}>← Anterior</button>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className="w-9 h-9 rounded-lg text-sm font-bold"
                style={{ background: p === currentPage ? `${t.accent}` : t.bgSecondary, color: p === currentPage ? "#fff" : t.textMuted }}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-30"
              style={{ background: t.bgSecondary, color: t.textMuted }}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}
