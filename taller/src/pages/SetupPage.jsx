import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import meqanoxLogo from "../assets/images/meqanox-logo.png";

export default function SetupPage() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(1); // 1: taller, 2: admin
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState([]);

  const [form, setForm] = useState({
    tallerNombre:    "",
    nombres:         "",
    apellidos:       "",
    username:        "",
    email:           "",
    password:        "",
    confirmPassword: "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setErrors([]);
    setLoading(true);
    try {
      await axios.post("/setup", form);
      navigate("/login", { replace: true });
    } catch (e) {
      const msg = e.response?.data?.message || "Error al configurar";
      setErrors([msg]);
    } finally {
      setLoading(false);
    }
  };

  // ── Estilos ──────────────────────────────────────────────────────────────
  const container = {
    minHeight: "100vh", background: "#0D0D0D",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "24px",
  };
  const card = {
    background: "#1A1A1A", border: "1px solid #333", borderRadius: "16px",
    padding: "36px 40px", width: "100%", maxWidth: "480px",
  };
  const inp = {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    background: "#242424", border: "1px solid #444", color: "#E0E0E0",
    fontSize: "14px", outline: "none", boxSizing: "border-box", marginTop: "6px",
  };
  const label = {
    fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
    color: "#888", textTransform: "uppercase", display: "block",
  };
  const btnPrimary = {
    width: "100%", padding: "14px", borderRadius: "10px",
    background: "#E35335", color: "#fff", fontSize: "14px",
    fontWeight: 800, border: "none", cursor: "pointer",
    marginTop: "24px", opacity: loading ? 0.6 : 1,
  };
  const btnSecondary = {
    width: "100%", padding: "12px", borderRadius: "10px",
    background: "transparent", color: "#888", fontSize: "13px",
    fontWeight: 600, border: "1px solid #333", cursor: "pointer", marginTop: "12px",
  };

  return (
    <div style={container}>
      <img src={meqanoxLogo} alt="MeQanoX"
        style={{ width: "320px", maxWidth: "85vw", height: "auto", marginBottom: "32px" }} />

      <div style={card}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: "3px", borderRadius: "2px",
                background: step >= s ? "#E35335" : "#333",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <h1 style={{ color: "#E0E0E0", fontSize: "20px", fontWeight: 800, margin: 0 }}>
            {step === 1 ? "Datos del Taller" : "Crear cuenta de administrador"}
          </h1>
          <p style={{ color: "#888", fontSize: "13px", marginTop: "6px" }}>
            {step === 1
              ? "Paso 1 de 2 — Información de tu servicio técnico"
              : "Paso 2 de 2 — Esta será tu cuenta principal de acceso"}
          </p>
        </div>

        {/* Errores */}
        {errors.map((e, i) => (
          <div key={i} style={{
            background: "rgba(227,83,53,0.15)", border: "1px solid rgba(227,83,53,0.3)",
            color: "#f87171", borderRadius: "8px", padding: "10px 14px",
            fontSize: "13px", marginBottom: "16px",
          }}>{e}</div>
        ))}

        {/* Paso 1 — Datos del taller */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={label}>Nombre del Taller / Servicio Técnico</label>
              <input style={inp} type="text" placeholder="Ej: Servicio Técnico Duarte e Hijos"
                value={form.tallerNombre} onChange={e => set("tallerNombre", e.target.value)} />
            </div>
            <button style={btnPrimary} disabled={loading}
              onClick={() => {
                if (!form.tallerNombre.trim()) { setErrors(["El nombre del taller es requerido"]); return; }
                setErrors([]); setStep(2);
              }}>
              Continuar →
            </button>
          </div>
        )}

        {/* Paso 2 — Datos del admin */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={label}>Nombres</label>
                <input style={inp} type="text" placeholder="Juan"
                  value={form.nombres} onChange={e => set("nombres", e.target.value)} />
              </div>
              <div>
                <label style={label}>Apellidos</label>
                <input style={inp} type="text" placeholder="Pérez"
                  value={form.apellidos} onChange={e => set("apellidos", e.target.value)} />
              </div>
            </div>
            <div>
              <label style={label}>Usuario de acceso</label>
              <input style={inp} type="text" placeholder="admin"
                value={form.username} onChange={e => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))} />
            </div>
            <div>
              <label style={label}>Email</label>
              <input style={inp} type="email" placeholder="correo@taller.cl"
                value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <label style={label}>Contraseña (mín. 8 caracteres)</label>
              <input style={inp} type="password"
                value={form.password} onChange={e => set("password", e.target.value)} />
            </div>
            <div>
              <label style={label}>Confirmar contraseña</label>
              <input style={inp} type="password"
                value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} />
            </div>
            <button style={btnPrimary} disabled={loading} onClick={handleSubmit}>
              {loading ? "Configurando..." : "✓ Crear mi cuenta y comenzar"}
            </button>
            <button style={btnSecondary} onClick={() => { setErrors([]); setStep(1); }}>
              ← Volver
            </button>
          </div>
        )}
      </div>

      <p style={{ color: "#333", fontSize: "11px", marginTop: "32px" }}>
        MeQanoX — Software para Servicios Técnicos Automotrices · Qodeya © 2025
      </p>
    </div>
  );
}
