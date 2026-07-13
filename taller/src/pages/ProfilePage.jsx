import axios from "../api/axios";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Swal from "sweetalert2";
import { getAvatarUrl } from "../schemas/api/config";

const ROLES = ["Administrador", "Jefe de Taller", "Mecánico", "Recepcionista"];

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { theme: t } = useTheme();
  const [profileImage, setProfileImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.cargo?.toLowerCase() === "superadmin" || user?.email?.includes("jimmy.duarte");

  const [formData, setFormData] = useState({
    nombre: user?.nombres || "",
    apellido: user?.apellidos || "",
    email: user?.email || "",
    cargo: user?.cargo || "",
  });

  const inp = "w-full p-3 rounded-xl text-sm outline-none transition-all";
  const is = { background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text };
  const isDisabled = { background: t.bgSecondary, border: `1px solid ${t.border}`, color: t.textMuted, cursor: "not-allowed", opacity: 0.6 };

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    data.append("nombre", formData.nombre);
    data.append("apellido", formData.apellido);
    data.append("email", formData.email);
    data.append("cargo", formData.cargo); // always send current cargo
    if (profileImage) data.append("profileImage", profileImage);

    try {
      const res = await axios.put("/profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      updateUserProfile(res.data);
      setProfileImage(null); // Clear so previewSrc recalculates from updated user.profileImage
      // Force re-render by updating formData with fresh data
      setFormData(prev => ({ ...prev, nombre: res.data.nombres, apellido: res.data.apellidos, cargo: res.data.cargo }));
      Swal.fire({ title: "¡Perfil actualizado!", icon: "success", background: t.bgCard, color: t.text, timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error("Error:", error.response?.data);
      Swal.fire({ title: "Error al guardar", text: error.response?.data?.message || "Error desconocido", icon: "error", background: t.bgCard, color: t.text });
    }
    setSaving(false);
  };

  //const BACKEND = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api","") : "http://localhost:3000";
  //const previewSrc = profileImage
    //? URL.createObjectURL(profileImage)
    //: user?.profileImage
      //? `${BACKEND}/uploads/${user.profileImage}`
      //: null;

  const previewSrc = profileImage
    ? URL.createObjectURL(profileImage)
    : getAvatarUrl(user?.profileImage) || null;
  const initials = (user?.nombres?.[0]||"")+(user?.apellidos?.[0]||"");

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: t.text }}>👤 Mi Perfil</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>Actualiza tu información y foto de perfil</p>
        </div>

        {/* Avatar */}
        <div className="rounded-2xl p-6 mb-6 flex items-center gap-6" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div className="relative flex-shrink-0">
            <img src={previewSrc} alt="Foto de perfil"
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: "3px solid "+t.accent }}
                onError={e => { e.target.style.display="none"; }} />
            {profileImage && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: t.accent }}>
                <span className="material-icons text-xs text-white">check</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black" style={{ color: t.text }}>{user?.nombres} {user?.apellidos}</h2>
            <p className="text-sm mt-0.5" style={{ color: t.accent }}>{user?.cargo}</p>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{user?.email}</p>
            <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:opacity-80"
              style={{ background: `${t.accent}20`, color: t.accent, border: `1px solid ${t.accent}40` }}>
              <span className="material-icons text-sm">photo_camera</span>
              {profileImage ? `✓ ${profileImage.name}` : "Cambiar foto de perfil"}
              <input type="file" accept="image/*" onChange={e => setProfileImage(e.target.files[0])} className="hidden" />
            </label>
            {profileImage && (
              <button type="button" onClick={() => setProfileImage(null)} className="ml-2 text-xs hover:opacity-80" style={{ color: "#f87171" }}>✕ Quitar</button>
            )}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>Información personal</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Nombres</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={inp} style={is} placeholder="Tus nombres" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Apellidos</label>
              <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} className={inp} style={is} placeholder="Tus apellidos" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Email</label>
            <input type="email" name="email" value={formData.email} disabled className={inp} style={isDisabled} />
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>El email no se puede modificar</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Cargo {isSuperAdmin && <span style={{ color: t.accent }}>(editable — Superadmin)</span>}
            </label>
            {isSuperAdmin ? (
              <select name="cargo" value={formData.cargo} onChange={handleChange} className={inp} style={is}>
                <option value="superadmin">Superadmin</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <>
                <input type="text" name="cargo" value={formData.cargo} disabled className={inp} style={isDisabled} />
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>El cargo es asignado por el administrador</p>
              </>
            )}
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: `${t.accent}` }}>
              <span className="material-icons text-sm">{saving ? "hourglass_empty" : "save"}</span>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
