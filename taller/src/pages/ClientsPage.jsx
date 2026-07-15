import { useState, useMemo, useEffect } from "react";
import { useTask } from "../context/TaskContext";
import { useTheme } from "../context/ThemeContext";
import axios from "../api/axios";
import Swal from "sweetalert2";

export default function ClientsPage() {
  const { getTasks, tasks } = useTask();
  const { theme: t } = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [emailSubject, setEmailSubject] = useState("Contacto desde MeQanoX");
  const [emailMsg, setEmailMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { getTasks(); }, []);

  const clients = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      const key = task.clientRUT;
      if (!map[key]) map[key] = { name: `${task.clientNombres} ${task.clientApellidos}`, rut: task.clientRUT, phone: task.clientPhone, email: task.clientEmail, orders: [] };
      map[key].orders.push(task);
    });
    // Recopilar patentes únicas por cliente
    Object.values(map).forEach(c => {
      c.plates = [...new Set(c.orders.map(o => o.carPlate).filter(Boolean))];
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.rut.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q) || c.orders.some(o => o.orderNumber?.toString().includes(q)) || c.plates.some(p => p.toLowerCase().includes(q)));
  }, [clients, search]);

  const handleSendEmail = async () => {
    if (!emailMsg.trim()) return;
    setSending(true);
    try {
      await axios.post("/email/send", { to: selected.email, subject: emailSubject, message: emailMsg }, { withCredentials: true });
      Swal.fire({ title: "¡Correo enviado!", text: `Email enviado a ${selected.email}`, icon: "success", background: t.bgCard, color: t.text, timer: 2000, showConfirmButton: false });
      setEmailMsg("");
    } catch (err) {
      Swal.fire({ title: "Error", text: err.response?.data?.message || "No se pudo enviar el correo. Verifica la configuración SMTP en el .env", icon: "error", background: t.bgCard, color: t.text });
    }
    setSending(false);
  };

  const totalIngresos = (client) => client.orders.filter(o => o.status === "completada").reduce((s, o) => s + (o.servicePrice || 0), 0);

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: t.text }}>👥 Clientes</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>{clients.length} clientes registrados</p>
        </div>

        <div className="relative mb-6">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: t.textMuted }}>search</span>
          <input type="text" placeholder="Buscar por nombre, RUT, teléfono, email, patente o N° de orden..."
            value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista */}
          <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12" style={{ color: t.textMuted }}>
                <span className="material-icons text-4xl mb-2">person_search</span><p>No se encontraron clientes</p>
              </div>
            ) : filtered.map(client => (
              <button key={client.rut} onClick={() => { setSelected(client); setEmailMsg(""); }}
                className="w-full text-left p-4 rounded-xl transition-all"
                style={{ background: selected?.rut === client.rut ? `${t.accent}15` : t.bgCard, border: `1px solid ${selected?.rut === client.rut ? t.accent : t.border}` }}>
                <div className="font-semibold text-sm truncate" style={{ color: t.text }}>{client.name}</div>
                <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>{client.rut}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${t.accent}20`, color: t.accent }}>{client.orders.length} visita{client.orders.length !== 1 ? "s" : ""}</span>
                  <span className="text-xs" style={{ color: "#4ade80" }}>{client.orders.filter(o => o.status === "completada").length} completadas</span>
                </div>
                {client.plates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {client.plates.map(p => (
                      <span key={p} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: `${t.bgSecondary}`, color: t.textMuted }}>🚗 {p}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Detalle */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-64 rounded-2xl" style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}>
                <span className="material-icons text-5xl mb-3">person</span><p>Selecciona un cliente para ver su historial</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info */}
                <div className="rounded-2xl p-5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black" style={{ color: t.text }}>{selected.name}</h2>
                      <p className="text-sm" style={{ color: t.textMuted }}>{selected.rut}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black" style={{ color: "#4ade80" }}>${new Intl.NumberFormat("es-CL").format(totalIngresos(selected))}</div>
                      <div className="text-xs" style={{ color: t.textMuted }}>ingresos generados</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[["📞 Teléfono", selected.phone], ["✉️ Email", selected.email],
                      ["🔢 Total visitas", selected.orders.length],
                      ["✅ Completadas", selected.orders.filter(o => o.status === "completada").length],
                      ["⏳ En curso", selected.orders.filter(o => o.status === "en curso").length],
                      ["📅 Primera visita", new Date(Math.min(...selected.orders.map(o => new Date(o.date)))).toLocaleDateString("es-CL")],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col p-2 rounded-lg" style={{ background: t.bgSecondary }}>
                        <span className="text-xs" style={{ color: t.textMuted }}>{k}</span>
                        <span className="font-semibold" style={{ color: t.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enviar email via SMTP */}
                <div className="rounded-2xl p-5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: t.text }}>
                    <span className="material-icons text-base">email</span> Contactar cliente
                    <span className="text-xs font-normal ml-1" style={{ color: t.textMuted }}>— se envía desde el servidor SMTP configurado</span>
                  </h3>
                  <div className="mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: t.textMuted }}>Para</label>
                    <input value={selected.email} disabled className="w-full text-sm p-2 rounded-lg outline-none" style={{ background: t.bgSecondary, color: t.textMuted, border: `1px solid ${t.border}` }} />
                  </div>
                  <div className="mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: t.textMuted }}>Asunto</label>
                    <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full text-sm p-2 rounded-lg outline-none" style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text }} />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: t.textMuted }}>Mensaje</label>
                    <textarea value={emailMsg} onChange={e => setEmailMsg(e.target.value)} placeholder="Escribe el mensaje para el cliente..." rows={4}
                      className="w-full text-sm p-3 rounded-xl outline-none resize-none"
                      style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text }} />
                  </div>
                  <button onClick={handleSendEmail} disabled={sending || !emailMsg.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ background: `${t.accent}` }}>
                    <span className="material-icons text-sm">{sending ? "hourglass_empty" : "send"}</span>
                    {sending ? "Enviando..." : "Enviar correo"}
                  </button>
                  <p className="text-xs mt-2" style={{ color: t.textMuted }}>Configura SMTP_HOST, SMTP_USER y SMTP_PASS en tu archivo .env para habilitar el envío.</p>
                </div>

                {/* Historial */}
                <div className="rounded-2xl p-5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                  <h3 className="font-bold text-sm mb-3" style={{ color: t.text }}>📋 Historial de órdenes</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selected.orders.sort((a, b) => new Date(b.date) - new Date(a.date)).map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: t.bgSecondary }}>
                        <div>
                          <span className="text-xs font-mono" style={{ color: t.textMuted }}>#{o.orderNumber}</span>
                          <p className="text-sm font-medium" style={{ color: t.text }}>{o.carBrand} {o.carModel} — {o.carPlate}</p>
                          <p className="text-xs" style={{ color: t.textMuted }}>{new Date(o.date).toLocaleDateString("es-CL")}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color: o.status === "completada" ? "#4ade80" : "#fb923c" }}>{o.status === "completada" ? "✔" : "⏳"} {o.status}</div>
                          <div className="text-xs" style={{ color: t.textMuted }}>${new Intl.NumberFormat("es-CL").format(o.servicePrice || 0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
