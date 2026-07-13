import { useTask } from "../context/TaskContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function StatCard({ icon, label, value, sub, accent, t }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-black" style={{ color: t.text }}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: accent }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: t.textMuted }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, color, t }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-bold" style={{ color: t.text }}>
            {d.value > 0 ? `$${new Intl.NumberFormat("es-CL", { notation: "compact" }).format(d.value)}` : ""}
          </span>
          <div className="w-full rounded-t-md transition-all" style={{
            height: `${Math.max(4, (d.value / max) * 100)}px`,
            background: color,
            opacity: 0.85,
          }} />
          <span className="text-xs" style={{ color: t.textMuted }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { getTasks, tasks } = useTask();
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.cargo?.toLowerCase() === "superadmin" || user?.cargo === "Administrador" || user?.email?.includes("jimmy.duarte");
  useEffect(() => { if (!isAdmin) navigate("/dashboard"); }, [isAdmin]);
  useEffect(() => { getTasks(); }, []);

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === "completada");
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const today = now.toDateString();

    const ingresosDiarios = completed.filter(t => new Date(t.date).toDateString() === today)
      .reduce((s, t) => s + (t.servicePrice || 0), 0);

    const ingresosMensuales = completed.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((s, t) => s + (t.servicePrice || 0), 0);

    const ingresosAnuales = completed.filter(t => new Date(t.date).getFullYear() === thisYear)
      .reduce((s, t) => s + (t.servicePrice || 0), 0);

    // Mes más productivo del año
    const byMonth = Array(12).fill(0);
    completed.filter(t => new Date(t.date).getFullYear() === thisYear)
      .forEach(t => { byMonth[new Date(t.date).getMonth()] += t.servicePrice || 0; });
    const maxMonth = byMonth.indexOf(Math.max(...byMonth));
    const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    // Ingresos últimos 6 meses
    const last6 = Array(6).fill(0).map((_, i) => {
      const m = (thisMonth - 5 + i + 12) % 12;
      const y = thisMonth - 5 + i < 0 ? thisYear - 1 : thisYear;
      const val = completed.filter(t => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; })
        .reduce((s, t) => s + (t.servicePrice || 0), 0);
      return { label: months[m].slice(0, 3), value: val };
    });

    // Mecánico con más órdenes completadas
    const mecCount = {};
    completed.forEach(t => {
      if (t.assignedTo) {
        const name = `${t.assignedTo.nombres} ${t.assignedTo.apellidos}`;
        mecCount[name] = (mecCount[name] || 0) + 1;
      }
    });
    const topMec = Object.entries(mecCount).sort((a, b) => b[1] - a[1])[0];

    // Ranking mecánicos
    const mecRanking = Object.entries(mecCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { ingresosDiarios, ingresosMensuales, ingresosAnuales, mesProductivo: months[maxMonth], ingresosAnualesMax: byMonth[maxMonth], last6, topMec, mecRanking, totalCompleted: completed.length };
  }, [tasks]);

  const fmt = (n) => `$${new Intl.NumberFormat("es-CL").format(n)}`;

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: t.text }}>📊 Estadísticas de Ganancias</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>Solo visible para Administrador y Superadmin</p>
        </div>

        {/* KPIs ingresos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon="📅" label="Ingresos hoy" value={fmt(stats.ingresosDiarios)} accent={t.accent} t={t} />
          <StatCard icon="📆" label="Este mes" value={fmt(stats.ingresosMensuales)} accent="#4ade80" t={t} />
          <StatCard icon="🗓️" label="Este año" value={fmt(stats.ingresosAnuales)} accent="#a78bfa" t={t} />
          <StatCard icon="🏆" label="Mes más productivo" value={stats.mesProductivo} sub={fmt(stats.ingresosAnualesMax)} accent="#fb923c" t={t} />
        </div>

        {/* Gráfico ingresos por mes */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <h3 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: t.text }}>Ingresos últimos 6 meses (CLP)</h3>
          <BarChart data={stats.last6} color={t.accent} t={t} />
        </div>

        {/* Ranking mecánicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: t.text }}>🔧 Ranking Mecánicos</h3>
            {stats.mecRanking.length === 0 ? (
              <p className="text-sm" style={{ color: t.textMuted }}>Sin datos</p>
            ) : (
              <div className="space-y-3">
                {stats.mecRanking.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : t.bgSecondary, color: "#fff" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: t.text }}>{name}</span>
                        <span className="text-sm font-bold" style={{ color: t.accent }}>{count} órdenes</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: t.bgSecondary }}>
                        <div className="h-1.5 rounded-full" style={{
                          width: `${(count / (stats.mecRanking[0]?.[1] || 1)) * 100}%`,
                          background: i === 0 ? "#f59e0b" : t.accent
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen general */}
          <div className="rounded-2xl p-6" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: t.text }}>📋 Resumen General</h3>
            <div className="space-y-3">
              {[
                ["Total órdenes", tasks.length],
                ["Órdenes completadas", stats.totalCompleted],
                ["Tasa de completitud", `${Math.round((stats.totalCompleted / (tasks.length || 1)) * 100)}%`],
                ["Ingreso promedio/orden", fmt(Math.round(stats.ingresosAnuales / (stats.totalCompleted || 1)))],
                ["Mecánico estrella", stats.topMec ? `${stats.topMec[0]} (${stats.topMec[1]})` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
                  <span className="text-sm" style={{ color: t.textMuted }}>{k}</span>
                  <span className="text-sm font-bold" style={{ color: t.text }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
