import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import motiqLogo from "../assets/images/motiq-logo.png";

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { signin, errors: signinErrors } = useAuth();
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signin(data);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
    }
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0D0D0D" }}>

      {/* Logo grande centrado */}
      <img src={motiqLogo} alt="MotiQ"
        style={{ width: "600px", maxWidth: "90vw", height: "auto", objectFit: "contain", marginBottom: "8px" }} />

      {/* Subtítulo */}
      <p style={{ color: "#5BBCB8", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "40px", fontWeight: 600 }}>
        Software para Servicios Técnicos Automotrices
      </p>

      {/* Errores */}
      {signinErrors.map((error, i) => (
        <div key={i} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: "10px", padding: "10px 20px", marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>
          {error}
        </div>
      ))}

      {/* Formulario sin marco */}
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>

        <div style={{ width: "100%" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#888", textTransform: "uppercase", textAlign: "center", marginBottom: "8px" }}>
            EMAIL
          </label>
          <input type="email" {...register("email", { required: true })}
            autoComplete="email"
            style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "14px", outline: "none", textAlign: "center", boxSizing: "border-box" }}
          />
          {errors.email && <p style={{ color: "#f87171", fontSize: "11px", textAlign: "center", marginTop: "4px" }}>Email es requerido</p>}
        </div>

        <div style={{ width: "100%" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#888", textTransform: "uppercase", textAlign: "center", marginBottom: "8px" }}>
            CONTRASEÑA
          </label>
          <input type="password" {...register("password", { required: true })}
            autoComplete="current-password"
            style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "14px", outline: "none", textAlign: "center", boxSizing: "border-box" }}
          />
          {errors.password && <p style={{ color: "#f87171", fontSize: "11px", textAlign: "center", marginTop: "4px" }}>Contraseña es requerida</p>}
        </div>

        <button type="submit"
          style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#5BBCB8", color: "#0D0D0D", fontSize: "14px", fontWeight: 800, letterSpacing: "1px", border: "none", cursor: "pointer", textTransform: "uppercase", marginTop: "8px" }}>
          Iniciar Sesión
        </button>
      </form>

      <p style={{ color: "#444", fontSize: "11px", marginTop: "32px", textAlign: "center" }}>
        Para registrarte contacta al administrador del sistema
      </p>

      {/* Footer Qodeya */}
      <p style={{ color: "#333", fontSize: "10px", marginTop: "48px", letterSpacing: "1px" }}>
        UN SOFTWARE DE QODEYA © 2025
      </p>
    </div>
  );
}
