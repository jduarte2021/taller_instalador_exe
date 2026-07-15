import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { generateOrderPDF } from "../utils/pdfGenerator.js";

const SEARCH_TYPES = [
  { key: "plate",  icon: "directions_car", label: "Patente",    placeholder: "Ej: ABCD12" },
  { key: "name",   icon: "person",         label: "Nombre",     placeholder: "Nombre del cliente" },
  { key: "order",  icon: "tag",            label: "N° Orden",   placeholder: "Ej: 1001" },
  { key: "phone",  icon: "phone",          label: "Teléfono",   placeholder: "Ej: +56 9 1234 5678" },
];

export default function TaskSearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("plate");
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const isAdmin = user?.cargo?.toLowerCase() === "superadmin" || user?.cargo === "Administrador";

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem("taskSearchParams") || "null");
    if (saved) { setQuery(saved.value); setSearchType(saved.type); doSearch(saved.type, saved.value); }
  }, []);

  const doSearch = async (type, val) => {
    const v = (val !== undefined ? val : query).trim();
    if (!v) return;
    setLoading(true); setError(""); setTasks([]);
    try {
      let res;
      const populate = ".populate('assignedTo','nombres apellidos')";
      if (type === "plate")  res = await axios.get(`/tasks/search?carPlate=${v.toUpperCase()}`);
      else if (type === "name")  res = await axios.get(`/tasks/search/name?clientName=${encodeURIComponent(v)}`);
      else if (type === "order") res = await axios.get(`/tasks/search/order?orderNumber=${v}`);
      else if (type === "phone") res = await axios.get(`/tasks/search/phone?phone=${encodeURIComponent(v)}`);
      setTasks(res.data);
      sessionStorage.setItem("taskSearchParams", JSON.stringify({ type, value: v }));
    } catch (err) {
      setError(err.response?.data?.message || "No se encontraron resultados.");
    }
    setLoading(false);
  };

  const handleDelete = async (taskId) => {
    const r = await Swal.fire({ title:"¿Eliminar?", icon:"warning", background:t.bgCard, color:t.text,
      showCancelButton:true, confirmButtonColor:"#ef4444", cancelButtonColor:t.bgSecondary,
      confirmButtonText:"Sí, eliminar", cancelButtonText:"Cancelar" });
    if (!r.isConfirmed) return;
    await axios.delete(`/tasks/${taskId}`, { withCredentials: true });
    setTasks(prev => prev.filter(tk => tk.id !== taskId));
    Swal.fire({ title:"Eliminado", icon:"success", background:t.bgCard, color:t.text, timer:1500, showConfirmButton:false });
  };

  const handleComplete = async (taskId) => {
    await axios.put(`/tasks/${taskId}/complete`, {}, { withCredentials: true });
    setTasks(prev => prev.map(tk => tk.id === taskId ? {...tk, status:"completada"} : tk));
    Swal.fire({ title:"¡Completada!", icon:"success", background:t.bgCard, color:t.text, timer:1500, showConfirmButton:false });
  };

  const handleSendBudget = async (task) => {
    const total = task.servicePrice || 0;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;
    const fmt = n => `$${new Intl.NumberFormat("es-CL").format(n)}`;

    const { value: mensaje } = await Swal.fire({
      title: "Enviar presupuesto al cliente",
      html: `
        <p style="margin-bottom:8px;font-size:13px;">Se enviará a <strong>${task.clientEmail}</strong></p>
        <textarea id="budget-msg" style="width:100%;height:80px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:13px;resize:none;"
          placeholder="Mensaje adicional (opcional)"></textarea>
        <div style="margin-top:12px;padding:10px;background:#0f172a;border-radius:8px;text-align:left;font-size:12px;color:#94a3b8;">
          <div>Neto: <strong style="color:#f1f5f9;">${fmt(neto)}</strong></div>
          <div>IVA (19%): <strong style="color:#f1f5f9;">${fmt(iva)}</strong></div>
          <div style="font-size:14px;margin-top:4px;">Total: <strong style="color:#4ade80;">${fmt(total)}</strong></div>
        </div>`,
      background: t.bgCard, color: t.text,
      showCancelButton: true, confirmButtonText: "Enviar", cancelButtonText: "Cancelar",
      preConfirm: () => document.getElementById("budget-msg").value,
    });

    if (mensaje === undefined) return;

    const msg = `Estimado/a ${task.clientNombres} ${task.clientApellidos},

Le enviamos el presupuesto para su vehículo ${task.carBrand} ${task.carModel} (${task.carPlate}):

Motivo: ${task.motivoIngreso || task.repairDescription || "Servicio de taller"}

— Precio neto:  ${fmt(neto)}
— IVA (19%):    ${fmt(iva)}
— TOTAL:        ${fmt(total)}

${mensaje ? `\nObservaciones: ${mensaje}` : ""}

Quedamos a su disposición.
MeQanoX — Software para Servicios Técnicos Automotrices`;

    try {
      await axios.post("/email/send", {
        to: task.clientEmail,
        subject: `Presupuesto MeQanoX — Orden #${task.orderNumber}`,
        message: msg,
      }, { withCredentials: true });
      Swal.fire({ title:"¡Presupuesto enviado!", icon:"success", background:t.bgCard, color:t.text, timer:2000, showConfirmButton:false });
    } catch (err) {
      Swal.fire({ title:"Error al enviar", text: err.response?.data?.message || "Verifica configuración SMTP", icon:"error", background:t.bgCard, color:t.text });
    }
  };

  const currentType = SEARCH_TYPES.find(s => s.key === searchType);

  return (
    <div className="min-h-screen" style={{ background: t.bg, color: t.text }}>

      {/* Barra superior fija */}
      <div className="sticky top-0 z-30 p-6 pb-4" style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}>
        <h1 className="text-2xl font-black tracking-tight mb-4" style={{ color: t.text }}>🔍 Buscar Órdenes</h1>

        {/* Tabs tipo de búsqueda */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {SEARCH_TYPES.map(({ key, icon, label }) => (
            <button key={key} onClick={() => { setSearchType(key); setQuery(""); setTasks([]); setError(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: searchType === key ? t.accent : t.bgSecondary,
                color: searchType === key ? "#fff" : t.textMuted,
                border: `1px solid ${searchType === key ? t.accent : t.border}`,
              }}>
              <span className="material-icons text-sm">{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* Campo de búsqueda */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: t.textMuted }}>
              {currentType?.icon}
            </span>
            <input type={searchType === "order" ? "number" : "text"}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch(searchType)}
              placeholder={currentType?.placeholder}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text }} />
          </div>
          <button onClick={() => doSearch(searchType)}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: `${t.accent}` }}>
            Buscar
          </button>
          {tasks.length > 0 && (
            <button onClick={() => { setTasks([]); setQuery(""); setError(""); sessionStorage.removeItem("taskSearchParams"); }}
              className="px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: t.bgSecondary, color: t.textMuted }}>
              Limpiar
            </button>
          )}
        </div>
        {tasks.length > 0 && (
          <p className="text-xs mt-2" style={{ color: t.textMuted }}>
            {tasks.length} resultado{tasks.length !== 1 ? "s" : ""} encontrado{tasks.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Resultados */}
      <div className="p-6 pt-4 max-w-4xl mx-auto">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: `${t.accent}40`, borderTopColor: t.accent }} />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center py-12" style={{ color: t.textMuted }}>
            <span className="material-icons text-5xl mb-3">search_off</span><p>{error}</p>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map(task => {
              const isExpanded = expandedId === task.id;
              const total = task.servicePrice || 0;
              const neto = Math.round(total / 1.19);
              const iva = total - neto;
              const fmt = n => `$${new Intl.NumberFormat("es-CL").format(n)}`;

              return (
                <div key={task.id} className="rounded-2xl border transition-all"
                  style={{ background: task.status === "completada" ? `${t.bgCard}` : t.bgCard, border: `1px solid ${task.status === "completada" ? "#166534" : t.border}` }}>

                  {/* Header */}
                  <div className="p-4 flex items-start justify-between gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{ color: t.textMuted }}>#{task.orderNumber}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: task.status === "completada" ? "#052e16" : "#451a03", color: task.status === "completada" ? "#4ade80" : "#fb923c" }}>
                          {task.status === "completada" ? "✔ Completada" : "⏳ En curso"}
                        </span>
                      </div>
                      <h3 className="font-bold truncate" style={{ color: t.text }}>
                        {task.clientNombres} {task.clientApellidos}
                      </h3>
                      <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>
                        {task.carBrand} {task.carModel} — <span className="font-mono">{task.carPlate}</span>
                      </p>
                      <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                        {new Date(task.date).toLocaleDateString("es-CL")} · {task.clientPhone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: "#4ade80" }}>{fmt(total)}</div>
                        <div className="text-xs" style={{ color: t.textMuted }}>c/IVA</div>
                      </div>
                      <span className="material-icons text-lg transition-transform duration-200"
                        style={{ color: t.textMuted, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Detalle */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: t.border }}>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4">
                        {[
                          ["RUT", task.clientRUT],
                          ["Teléfono", task.clientPhone],
                          ["Email", task.clientEmail],
                          ["Color", task.carColor],
                          ["Año", task.carYear || "—"],
                          ["KM", task.carKm || "—"],
                          ["Daños", task.carDamages || "—"],
                        ].map(([k, v]) => (
                          <div key={k} className="py-1.5 border-b" style={{ borderColor: t.border }}>
                            <div className="text-xs" style={{ color: t.textMuted }}>{k}</div>
                            <div className="font-medium" style={{ color: t.text }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Precio con IVA */}
                      <div className="mt-3 p-3 rounded-xl" style={{ background: t.bgSecondary }}>
                        <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: t.textMuted }}>Precio</div>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: t.textMuted }}>Neto</span>
                          <span style={{ color: t.text }}>{fmt(neto)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: t.textMuted }}>IVA (19%)</span>
                          <span style={{ color: t.text }}>{fmt(iva)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold mt-1 pt-1" style={{ borderTop: `1px solid ${t.border}` }}>
                          <span style={{ color: t.text }}>Total</span>
                          <span style={{ color: "#4ade80" }}>{fmt(total)}</span>
                        </div>
                      </div>

                      {[["Motivo de Ingreso", task.motivoIngreso], ["Diagnóstico Taller", task.diagnosticoTaller],
                        ["Reparación / Cambio de Piezas", task.repairDescription]].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="mt-2 p-3 rounded-xl" style={{ background: t.bgSecondary }}>
                          <div className="text-xs font-semibold mb-1" style={{ color: t.textMuted }}>{k}</div>
                          <p className="text-sm" style={{ color: t.text }}>{v}</p>
                        </div>
                      ))}

                      {/* Acciones */}
                      <div className="flex gap-2 flex-wrap mt-4">
                        {isAdmin && (
                          <>
                            <button onClick={() => navigate(`/task/${task.id}`, { state: { returnTo: "/search-tasks" } })}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: `${t.accent}20`, color: t.accent }}>
                              <span className="material-icons text-sm">edit</span> Editar
                            </button>
                            <button onClick={() => handleDelete(task.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: "#450a0a", color: "#f87171" }}>
                              <span className="material-icons text-sm">delete</span> Borrar
                            </button>
                          </>
                        )}
                        <button onClick={() => generateOrderPDF(task)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "#1a2e1a", color: "#4ade80" }}>
                          <span className="material-icons text-sm">picture_as_pdf</span> PDF
                        </button>
                        <button onClick={() => handleSendBudget(task)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: `${t.accent}15`, color: t.accent, border: `1px solid ${t.accent}30` }}>
                          <span className="material-icons text-sm">send</span> Presupuesto
                        </button>
                        {task.status !== "completada" && (
                          <button onClick={() => handleComplete(task.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto"
                            style={{ background: "#1a2e1a", color: "#4ade80", border: "1px solid #166534" }}>
                            <span className="material-icons text-sm">check_circle</span> Completar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
