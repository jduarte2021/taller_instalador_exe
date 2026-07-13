import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTask } from "../context/TaskContext";
import { useTheme } from "../context/ThemeContext";
import { carBrands } from "../components/carBrands.jsx";
import axios from "../api/axios";
import Swal from "sweetalert2";

// ── Validador RUT chileno ─────────────────────────────────────────────────────
function validarRUT(rut) {
  if (!rut || typeof rut !== "string") return false;
  const clean = rut.replace(/[\.\-\s]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let suma = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalc =
    dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : String(dvEsperado);
  return dv === dvCalc;
}

// Auto-formatea mientras escribe: 12345678 → 12.345.678-9
function formatRUT(value) {
  const clean = value.replace(/[\.\-\s]/g, "").toUpperCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}

// ── Componentes de UI ─────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  const { theme: t } = useTheme();
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: t.textMuted }}>{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
        <span className="material-icons text-sm">error_outline</span>{error}
      </p>}
    </div>
  );
}

function Section({ icon, title, children }) {
  const { theme: t } = useTheme();
  return (
    <div className="rounded-2xl p-6" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
        style={{ color: t.accent }}>
        <span className="material-icons text-base">{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}


// ── Componente principal ──────────────────────────────────────────────────────
export default function TaskFormPage() {
  const { register, handleSubmit, setValue, watch, formState: { errors }, setError, clearErrors } = useForm();
  const { getTasks, updateTask, tasks, createTask } = useTask();
  const { theme: t } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  const [rutValue, setRutValue] = useState("");
  const [rutValid, setRutValid] = useState(null);
  const selectedBrand = watch("carBrand");
  const [users, setUsers] = useState([]);

  const inp = `w-full p-3 rounded-xl text-sm outline-none transition-all`;
  const is = { background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text };

  // Cargar usuarios usando cookies (sin localStorage)
  useEffect(() => {
    axios.get("/users/all", { withCredentials: true })
      .then(r => setUsers(r.data))
      .catch(err => {
        if (err.response?.status === 401) navigate('/login');
      });
  }, [navigate]);

  // Cargar datos de la tarea si es edición
  useEffect(() => {
    if (!id) return;
    const task = tasks.find(t => t.id === id);
    if (task) {
      Object.entries(task).forEach(([key, val]) => setValue(key, val));
      // assignedTo viene como objeto {nombres, apellidos} desde el backend,
      // pero el select necesita el id → usar assignedToId
      setValue("assignedTo", task.assignedToId || "");
      if (task.clientRUT) {
        setRutValue(task.clientRUT);
        setRutValid(validarRUT(task.clientRUT));
      }
    } else {
      getTasks();
    }
  }, [id]);

  // Manejo del RUT con formato y validación en tiempo real
  const handleRutChange = (e) => {
    const raw = e.target.value;
    if (raw.length < rutValue.length && !raw.includes("-")) {
      setRutValue(raw);
      setRutValid(null);
      setValue("clientRUT", raw);
      clearErrors("clientRUT");
      return;
    }
    const formatted = formatRUT(raw.replace(/[\.\-]/g, ""));
    setRutValue(formatted);
    setValue("clientRUT", formatted);
    const valid = validarRUT(formatted);
    setRutValid(valid);
    if (!valid && formatted.length > 3) {
      setError("clientRUT", { type: "manual", message: "RUT inválido" });
    } else {
      clearErrors("clientRUT");
    }
  };

  const onSubmit = async (data) => {
    const missing = [];
    if (!data.carPlate?.trim()) missing.push("Patente del vehículo");
    if (missing.length > 0) {
      await Swal.fire({
        title: "⚠️ Campos obligatorios faltantes",
        html: `<div style="text-align:left;margin-top:12px;">${missing.map(m =>
          `<div style="padding:8px 12px;margin-bottom:6px;background:#1e3a5f;border-left:3px solid #38bdf8;border-radius:4px;font-size:14px;">📋 ${m}</div>`
        ).join("")}</div>`,
        icon: "warning",
        confirmButtonText: "Entendido",
        background: "#0f172a",
        color: "#f1f5f9",
        confirmButtonColor: "#38bdf8",
      });
      return;
    }
    if (data.clientRUT && data.clientRUT.trim().length > 0 && !validarRUT(data.clientRUT)) {
      setError("clientRUT", { type: "manual", message: "RUT inválido — verifica el número" });
      return;
    }
    const finalData = {
      ...data,
      carBrand: selectedBrand === "Otro" ? customBrand : data.carBrand,
      assignedToId: data.assignedTo && data.assignedTo !== "" ? data.assignedTo : null,
      assignedTo: undefined,
    };

    if (id) {
      // EDITAR
      await updateTask(id, finalData);
      await Swal.fire({
        title: "✅ Orden actualizada",
        text: "Los cambios se guardaron correctamente.",
        icon: "success",
        confirmButtonText: "OK",
        background: t.bgCard,
        color: t.text,
        confirmButtonColor: t.accent,
        timer: 3000,
        timerProgressBar: true,
      });
      navigate(location.state?.returnTo || "/tasks");
    } else {
      // CREAR
      const newTask = await createTask(finalData);
      const result = await Swal.fire({
        title: "🎉 Orden creada",
        text: `Orden #${newTask?.orderNumber || ""} creada exitosamente.`,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "👁 Ver orden",
        cancelButtonText: "🏠 Ir a Panel de Control",
        background: t.bgCard,
        color: t.text,
        confirmButtonColor: t.accent,
        cancelButtonColor: t.accentSecondary,
      });
      if (result.isConfirmed && newTask?.id) {
        navigate("/tasks", { state: { highlightId: newTask.id, openId: newTask.id } });
      } else {
        navigate("/dashboard");
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: t.bg, color: t.text }}>
      Cargando...
    </div>
  );

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: t.text }}>
            {id ? "✏️ Editar Orden" : "➕ Nueva Orden"}
          </h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>Complete todos los campos requeridos</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Datos del cliente ── */}
          <Section icon="person" title="Datos del Cliente">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombres">
                <input
                  {...register("clientNombres", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })}
                  placeholder="Nombres del cliente"
                  className={inp} style={is}
                />
              </Field>
              <Field label="Apellidos">
                <input
                  {...register("clientApellidos", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })}
                  placeholder="Apellidos del cliente"
                  className={inp} style={is}
                />
              </Field>
              <Field label="RUT">
                <div className="relative">
                  <input
                    {...register("clientRUT")}
                    value={rutValue}
                    onChange={handleRutChange}
                    placeholder="12.345.678-9"
                    maxLength={12}
                    className={inp}
                    style={{
                      ...is,
                      border: `1px solid ${
                        rutValid === true ? "#4ade80" :
                        rutValid === false ? "#f87171" :
                        t.inputBorder
                      }`,
                      paddingRight: "40px",
                    }}
                  />
                  {rutValid !== null && (
                    <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                      style={{ color: rutValid ? "#4ade80" : "#f87171" }}>
                      {rutValid ? "check_circle" : "cancel"}
                    </span>
                  )}
                </div>
                {rutValid === true && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <span className="material-icons text-sm">check_circle</span> RUT válido
                  </p>
                )}
              </Field>
              <Field label="Teléfono">
                <input
                  {...register("clientPhone")}
                  placeholder="+56 9 1234 5678"
                  className={inp} style={is}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  {...register("clientEmail")}
                  placeholder="correo@ejemplo.com"
                  className={inp} style={is}
                />
              </Field>
            </div>
          </Section>

          {/* ── Datos del vehículo ── */}
          <Section icon="directions_car" title="Datos del Vehículo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Patente" error={errors.carPlate && "Requerido"}>
                <input {...register("carPlate", { required: true })} placeholder="ABCD12"
                  className={inp} style={{ ...is, textTransform: "uppercase" }} />
              </Field>
              <Field label="Marca">
                <select {...register("carBrand")} className={inp} style={is}>
                  <option value="">Selecciona una marca</option>
                  {carBrands.map((b, i) => <option key={i} value={b}>{b}</option>)}
                </select>
              </Field>
              {selectedBrand === "Otro" && (
                <Field label="Otra marca">
<input type="text" placeholder="Escribe la marca" value={customBrand}
                    onChange={e => setCustomBrand(e.target.value.toUpperCase())} className={inp} style={is} />
                </Field>
              )}
              <Field label="Modelo">
<input {...register("carModel", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} placeholder="Corolla, Civic, etc."
                  className={inp} style={is} />
              </Field>
              <Field label="Color">
<input {...register("carColor", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} placeholder="Color del vehículo"
                  className={inp} style={is} />
              </Field>
              <Field label="Año">
                <input {...register("carYear")} placeholder="Ej: 2020" className={inp} style={is} />
              </Field>
              <Field label="Kilometraje">
                <input {...register("carKm")} placeholder="Ej: 45.000 km" className={inp} style={is} />
              </Field>
              <Field label="Daños Visibles">
<input {...register("carDamages", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} placeholder="Descripción de daños visibles"
                  className={inp} style={is} />
              </Field>
              <Field label="Detalles Extraordinarios">
<input {...register("carDetails", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} placeholder="Cualquier detalle importante"
                  className={inp} style={is} />
              </Field>
            </div>
          </Section>

          {/* ── Datos de la orden ── */}
          <Section icon="build" title="Datos de la Orden">
            <div className="space-y-4">
              <Field label="Motivo de Ingreso">
<textarea {...register("motivoIngreso", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} rows={3}
                  placeholder="¿Por qué ingresa el vehículo al taller?" className={inp} style={is} />
              </Field>
              <Field label="Diagnóstico Taller">
<textarea {...register("diagnosticoTaller", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} rows={3}
                  placeholder="Diagnóstico técnico del taller..." className={inp} style={is} />
              </Field>
              <Field label="Descripción de la Reparación / Cambio de Piezas">
<textarea {...register("repairDescription", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} rows={3}
                  placeholder="Detalle de trabajos, repuestos y piezas utilizadas..." className={inp} style={is} />
              </Field>
              <Field label="Observaciones Generales">
<textarea {...register("description", { onChange: (e) => { const el = e.target, s = el.selectionStart, en = el.selectionEnd; el.value = el.value.toUpperCase(); requestAnimationFrame(() => el.setSelectionRange(s, en)); } })} rows={2}
                  placeholder="Observaciones adicionales..." className={inp} style={is} />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Precio del Servicio (CLP)">
                  <input type="number" step="1" placeholder="85000"
                    {...register("servicePrice", { min: { value: 0, message: "No puede ser negativo" } })}
                    className={inp} style={is} />
                  {watch("servicePrice") > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg text-xs space-y-1" style={{ background: t.bgSecondary }}>
                      <div className="flex justify-between" style={{ color: t.textMuted }}>
                        <span>Neto</span>
                        <span>${new Intl.NumberFormat("es-CL").format(Math.round(Number(watch("servicePrice")) / 1.19))} CLP</span>
                      </div>
                      <div className="flex justify-between" style={{ color: t.textMuted }}>
                        <span>IVA (19%)</span>
                        <span>${new Intl.NumberFormat("es-CL").format(Number(watch("servicePrice")) - Math.round(Number(watch("servicePrice")) / 1.19))} CLP</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1" style={{ borderTop: `1px solid ${t.border}`, color: "#4ade80" }}>
                        <span>Total c/IVA</span>
                        <span>${new Intl.NumberFormat("es-CL").format(Number(watch("servicePrice")))} CLP</span>
                      </div>
                    </div>
                  )}
                </Field>
                <Field label="Mecánico / Personal Asignado">
                  <select {...register("assignedTo")} className={inp} style={is}>
                    <option value="">Selecciona un usuario</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </Section>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate("/dashboard")}
              className="px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: t.bgSecondary, color: t.textMuted }}>
              ← Panel de Control
            </button>
            <button type="submit"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90"
              style={{ background: `${t.accent}` }}>
              {id ? "Actualizar Orden" : "Crear Orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
