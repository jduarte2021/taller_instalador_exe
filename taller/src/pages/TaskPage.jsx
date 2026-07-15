import { useTask } from "../context/TaskContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "../api/axios";
import { generateOrderPDF } from "../utils/pdfGenerator.js";

function StatusBadge({ status }) {
  const cfg = status === "completada" ? { bg: "#052e16", text: "#4ade80", label: "✔ Completada" } : { bg: "#451a03", text: "#fb923c", label: "⏳ En curso" };
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>;
}

const ITEMS_PER_PAGE = 10;

export default function TaskPage() {
  const { getTasks, tasks, deleteTask } = useTask();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = location.state?.highlightId;
  const highlightRef = useRef(null);

  // Siempre ir al top al cargar la página
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  // Si hay orden destacada, scroll suave a ella después de un breve delay
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      const timer = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [highlightId, tasks]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const openId = location.state?.openId || null;
  const [expandedId, setExpandedId] = useState(openId);
  const [page, setPage] = useState(1);
  const isAdmin = user?.cargo?.toLowerCase() === "superadmin" || user?.cargo === "Administrador";

  useEffect(() => { getTasks(); }, []);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter !== "all") list = list.filter(tk => tk.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(tk => (`${tk.clientNombres} ${tk.clientApellidos}`).toLowerCase().includes(q) || tk.orderNumber?.toString().includes(q) || tk.carPlate?.toLowerCase().includes(q) || tk.carBrand?.toLowerCase().includes(q));
    }
    list.sort((a, b) => sortBy === "date_desc" ? new Date(b.date)-new Date(a.date) : sortBy === "date_asc" ? new Date(a.date)-new Date(b.date) : sortBy === "price_desc" ? (b.servicePrice||0)-(a.servicePrice||0) : (a.servicePrice||0)-(b.servicePrice||0));
    return list;
  }, [tasks, filter, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  const handleDelete = (id) => {
    Swal.fire({ title:"¿Eliminar orden?", text:"Esta acción no se puede deshacer", icon:"warning", background:t.bgCard, color:t.text, showCancelButton:true, confirmButtonColor:"#ef4444", cancelButtonColor:t.bgSecondary, confirmButtonText:"Sí, eliminar", cancelButtonText:"Cancelar" })
      .then(r => { if (r.isConfirmed) { deleteTask(id); if (expandedId===id) setExpandedId(null); } });
  };

  const handleComplete = async (id) => {
    try { await axios.put(`/tasks/${id}/complete`); Swal.fire({title:"¡Completada!",icon:"success",background:t.bgCard,color:t.text,timer:1500,showConfirmButton:false}); getTasks(); }
    catch { Swal.fire({title:"Error",icon:"error",background:t.bgCard,color:t.text}); }
  };

  const handlePDF = async (task) => {
    await generateOrderPDF(task, t);
  };

  const handleSendBudget = async (task) => {
    const total = task.servicePrice || 0;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;
    const fmt = n => `$${new Intl.NumberFormat("es-CL").format(n)}`;
    const { value: mensaje } = await Swal.fire({
      title: "Enviar presupuesto al cliente",
      html: `<p style="margin-bottom:8px;font-size:13px;">Se enviará a <strong>${task.clientEmail}</strong></p>
        <textarea id="budget-msg" style="width:100%;height:80px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:13px;resize:none;" placeholder="Mensaje adicional (opcional)"></textarea>
        <div style="margin-top:12px;padding:10px;background:#0f172a;border-radius:8px;text-align:left;font-size:12px;">
          <div style="color:#94a3b8;">Neto: <strong style="color:#f1f5f9;">${fmt(neto)}</strong></div>
          <div style="color:#94a3b8;">IVA (19%): <strong style="color:#f1f5f9;">${fmt(iva)}</strong></div>
          <div style="color:#94a3b8;font-size:14px;margin-top:4px;">Total: <strong style="color:#4ade80;">${fmt(total)}</strong></div>
        </div>`,
      background: t.bgCard, color: t.text,
      showCancelButton: true, confirmButtonText: "Enviar", cancelButtonText: "Cancelar",
      preConfirm: () => document.getElementById("budget-msg").value,
    });
    if (mensaje === undefined) return;
    try {
      await axios.post("/email/send", { to: task.clientEmail, subject: `Presupuesto MeQanoX — Orden #${task.orderNumber}`, message: mensaje || "", task }, { withCredentials: true });
      Swal.fire({ title:"¡Presupuesto enviado!", icon:"success", background:t.bgCard, color:t.text, timer:2000, showConfirmButton:false });
    } catch (err) {
      Swal.fire({ title:"Error al enviar", text: err.response?.data?.message || "Verifica configuración SMTP", icon:"error", background:t.bgCard, color:t.text });
    }
  };

  const handleSendWhatsApp = async (task) => {
    const total = task.servicePrice || 0;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;
    const fmt = n => `$${new Intl.NumberFormat("es-CL").format(n)} CLP`;

    // Limpiar teléfono: quitar espacios, guiones, paréntesis y asegurar código país Chile
    const rawPhone = (task.clientPhone || "").replace(/[\s\-\(\)]/g, "");
    const phone = rawPhone.startsWith("+") ? rawPhone.replace("+", "")
                : rawPhone.startsWith("56") ? rawPhone
                : rawPhone.startsWith("9") ? `56${rawPhone}`
                : rawPhone ? `56${rawPhone}` : "";

    const { value: mensaje } = await Swal.fire({
      title: "Enviar por WhatsApp",
      html: `<p style="margin-bottom:8px;font-size:13px;">
               Cliente: <strong>${task.clientNombres || ""} ${task.clientApellidos || ""}</strong><br/>
               ${phone ? `Teléfono: <strong>+${phone}</strong>` : '<span style="color:#f87171;">⚠️ Sin teléfono registrado</span>'}
             </p>
             <textarea id="wa-msg" style="width:100%;height:80px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:13px;resize:none;" placeholder="Mensaje adicional (opcional)"></textarea>
             <div style="margin-top:12px;padding:10px;background:#0f172a;border-radius:8px;text-align:left;font-size:12px;">
               <div style="color:#94a3b8;">Orden: <strong style="color:#f1f5f9;">#${task.orderNumber}</strong></div>
               <div style="color:#94a3b8;">Vehículo: <strong style="color:#f1f5f9;">${task.carBrand || ""} ${task.carModel || ""} — ${task.carPlate}</strong></div>
               <div style="color:#94a3b8;margin-top:4px;">Total c/IVA: <strong style="color:#4ade80;">${fmt(total)}</strong></div>
             </div>`,
      background: t.bgCard, color: t.text,
      showCancelButton: true, confirmButtonText: "Abrir WhatsApp", cancelButtonText: "Cancelar",
      confirmButtonColor: "#25d366",
      preConfirm: () => document.getElementById("wa-msg").value,
    });

    if (mensaje === undefined) return;

    const nombre = `${task.clientNombres || ""} ${task.clientApellidos || ""}`.trim() || "cliente";
    const vehiculo = `${task.carBrand || ""} ${task.carModel || ""}`.trim();
    const extra = mensaje ? `\n\n_${mensaje}_` : "";
    const completada = task.status === "completada";

    const secMotivo     = task.motivoIngreso     ? `\n\n*Motivo de ingreso:*\n${task.motivoIngreso}` : "";
    const secDiag       = task.diagnosticoTaller ? `\n\n*Diagnóstico:*\n${task.diagnosticoTaller}` : "";
    const secReparacion = completada && task.repairDescription ? `\n\n*Reparación realizada:*\n${task.repairDescription}` : "";
    const secObs        = completada && task.description       ? `\n\n*Observaciones:*\n${task.description}` : "";

    const texto = `Hola ${nombre}, le contactamos desde *MeQanoX* 🔧\n\n`
      + `*${completada ? "Orden completada" : "Presupuesto"} — Orden #${task.orderNumber}*\n`
      + `Vehículo: ${vehiculo} (${task.carPlate})`
      + secMotivo
      + secDiag
      + secReparacion
      + secObs
      + `\n\n*Precio del servicio*\n`
      + `• Neto: ${fmt(neto)}\n`
      + `• IVA (19%): ${fmt(iva)}\n`
      + `• *Total: ${fmt(total)}*`
      + extra
      + `\n\nQuedamos a su disposición.`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen p-6" style={{background:t.bg,color:t.text}}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{color:t.text}}>📋 Órdenes</h1>
            <p className="text-sm mt-1" style={{color:t.textMuted}}>{filtered.length} órdenes encontradas</p>
          </div>
          <button onClick={() => navigate("/add-task")} className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white" style={{background:"#0F52BA"}}>
            <span className="material-icons text-base">add_task</span> Nueva
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <div className="flex-1 min-w-48 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{color:t.textMuted}}>search</span>
            <input type="text" placeholder="Buscar cliente, patente, marca..." value={search}
              onChange={e => {setSearch(e.target.value); setPage(1);}}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{background:t.input,border:`1px solid ${t.inputBorder}`,color:t.text}} />
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{border:`1px solid ${t.border}`}}>
            {[["all","Todas"],["en curso","En curso"],["completada","Completadas"]].map(([val,label]) => (
              <button key={val} onClick={() => {setFilter(val); setPage(1);}}
                className="px-3 py-2 text-xs font-semibold transition-all"
                style={{background:filter===val?(val==="completada"?"#052e16":val==="en curso"?"#451a03":`${t.accent}20`):t.bgSecondary, color:filter===val?(val==="completada"?"#4ade80":val==="en curso"?"#fb923c":t.accent):t.textMuted}}>
                {label}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2.5 rounded-xl text-xs outline-none" style={{background:t.input,border:`1px solid ${t.inputBorder}`,color:t.text}}>
            <option value="date_desc">📅 Más recientes</option>
            <option value="date_asc">📅 Más antiguas</option>
            <option value="price_desc">💰 Mayor precio</option>
            <option value="price_asc">💰 Menor precio</option>
          </select>
        </div>

        {/* Lista */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center py-20" style={{color:t.textMuted}}>
            <span className="material-icons text-5xl mb-3">inbox</span><p className="text-lg font-semibold">No hay órdenes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map(task => {
              const isExpanded = expandedId === task.id;
              const total = task.servicePrice || 0;
              const neto = Math.round(total / 1.19);
              const iva = total - neto;
              const fmt = n => `$${new Intl.NumberFormat("es-CL").format(n)}`;

              return (
                <div key={task.id} className="rounded-2xl border transition-all" style={{background:task.status==="completada"?`${t.bgCard}`:t.bgCard, border:`1px solid ${task.status==="completada"?"#166534":t.border}`}}>
                  {/* Header siempre visible */}
                  <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded?null:task.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{color:t.textMuted}}>#{task.orderNumber}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <h3 className="font-bold truncate" style={{color:t.text}}>{task.clientNombres} {task.clientApellidos}</h3>
                      <p className="text-sm mt-0.5" style={{color:t.textMuted}}>{task.carBrand} {task.carModel} — <span className="font-mono">{task.carPlate}</span></p>
                      <p className="text-xs mt-1" style={{color:t.textMuted}}>{new Date(task.date).toLocaleDateString("es-CL")} · {task.assignedTo?`${task.assignedTo.nombres} ${task.assignedTo.apellidos}`:"Sin asignar"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{color:"#4ade80"}}>{fmt(total)}</div>
                        <div className="text-xs" style={{color:t.textMuted}}>c/IVA</div>
                      </div>
                      <span className="material-icons text-lg transition-transform duration-200" style={{color:t.textMuted, transform:isExpanded?"rotate(180deg)":"rotate(0deg)"}}>expand_more</span>
                    </div>
                  </div>

                  {/* Detalle expandible */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t" style={{borderColor:t.border}}>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4">
                        {[["RUT",task.clientRUT],["Teléfono",task.clientPhone],["Email",task.clientEmail],["Color",task.carColor],["Año",task.carYear||"—"],["KM",task.carKm||"—"],["Daños",task.carDamages||"—"],["Neto",fmt(neto)],["IVA (19%)",fmt(iva)],["Total c/IVA",fmt(total)],["Creado por",task.createdBy?.username||"—"],...(task.editedBy?[["Editado por",task.editedBy?.username||"—"]]:[])].map(([k,v]) => (
                          <div key={k} className="py-1.5 border-b" style={{borderColor:t.border}}>
                            <div className="text-xs" style={{color:t.textMuted}}>{k}</div>
                            <div className="font-medium" style={{color:t.text}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {[["Motivo de Ingreso",task.motivoIngreso],["Diagnóstico Taller",task.diagnosticoTaller],["Descripción Reparación / Cambio de Piezas",task.repairDescription],["Observaciones",task.description]].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k} className="mt-3 p-3 rounded-xl" style={{background:t.bgSecondary}}>
                          <div className="text-xs font-semibold mb-1" style={{color:t.textMuted}}>{k}</div>
                          <p className="text-sm" style={{color:t.text}}>{v}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 flex-wrap mt-4 no-print">
                        {isAdmin && (
                          <>
                            <button onClick={() => navigate(`/task/${task.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:`${t.accent}20`,color:t.accent}}>
                              <span className="material-icons text-sm">edit</span> Editar
                            </button>
                            <button onClick={() => handleDelete(task.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:"#450a0a",color:"#f87171"}}>
                              <span className="material-icons text-sm">delete</span> Borrar
                            </button>
                          </>
                        )}
                        <button onClick={() => handlePDF(task)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:"#1a2e1a",color:"#4ade80"}}>
                          <span className="material-icons text-sm">picture_as_pdf</span> PDF
                        </button>
                        <button onClick={() => handleSendBudget(task)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:`${t.accent}15`,color:t.accent,border:`1px solid ${t.accent}30`}}>
                          <span className="material-icons text-sm">send</span> Presupuesto
                        </button>
                        <button onClick={() => handleSendWhatsApp(task)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:"#dcfce7",color:"#15803d",border:"1px solid #86efac"}}>
                          <svg viewBox="0 0 24 24" style={{width:"14px",height:"14px",fill:"#15803d",flexShrink:0}} xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </button>
                        {task.status!=="completada" && (
                          <button onClick={() => handleComplete(task.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto" style={{background:"#1a2e1a",color:"#4ade80",border:"1px solid #166534"}}>
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-30" style={{background:t.bgSecondary,color:t.textMuted}}>← Anterior</button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className="w-9 h-9 rounded-lg text-sm font-bold" style={{background:p===page?`${t.accent}`:t.bgSecondary,color:p===page?"#fff":t.textMuted}}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-30" style={{background:t.bgSecondary,color:t.textMuted}}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}
