import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const ROLES = ["superadmin", "Administrador", "Jefe de Taller", "Mecánico", "Recepcionista"];

export default function UsersAdminPage() {
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState({ username: "", email: "", password: "", nombres: "", apellidos: "", cargo: "Mecánico" });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.cargo === "Administrador" || user?.cargo?.toLowerCase() === "superadmin";
  const isSuperAdmin = user?.username === "jduarte" || user?.cargo?.toLowerCase() === "superadmin";

  useEffect(() => { if (!isAdmin) navigate("/dashboard"); }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ambos roles usan /users/all — único endpoint disponible en el backend
      const res = await axios.get("/users/all", { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("No se pudieron cargar los usuarios. Verifica tu sesión.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newCargo) => {
    try {
      await axios.put(`/users/${userId}/role`, { cargo: newCargo }, { withCredentials: true });
      Swal.fire({ title: "Rol actualizado", icon: "success", background: t.bgCard, color: t.text, timer: 1500, showConfirmButton: false });
      fetchUsers();
    } catch {
      Swal.fire({ title: "Error al actualizar rol", icon: "error", background: t.bgCard, color: t.text });
    }
  };

  const handleDelete = async (u) => {
    const result = await Swal.fire({
      title: `¿Eliminar a ${u.nombres || u.username}?`,
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      cancelButtonColor: "#718096",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      background: t.bgCard,
      color: t.text,
    });
    if (!result.isConfirmed) return;
    try {
      await axios.delete(`/users/${u.id}`, { withCredentials: true });
      Swal.fire({ title: "Usuario eliminado", icon: "success", background: t.bgCard, color: t.text, timer: 1500, showConfirmButton: false });
      fetchUsers();
    } catch {
      Swal.fire({ title: "Error al eliminar", icon: "error", background: t.bgCard, color: t.text });
    }
  };

  const handleChangePassword = async (u) => {
    const { value: newPassword } = await Swal.fire({
      title: `Cambiar contraseña`,
      html: `<p style="margin-bottom:8px;font-size:13px;">Usuario: <b>${u.nombres || u.username}</b></p>`,
      input: "password",
      inputLabel: "Nueva contraseña (mín. 6 caracteres)",
      inputPlaceholder: "Nueva contraseña",
      inputAttributes: { autocomplete: "new-password", minlength: 6 },
      showCancelButton: true,
      confirmButtonText: "Cambiar",
      cancelButtonText: "Cancelar",
      background: t.bgCard,
      color: t.text,
      preConfirm: (val) => {
        if (!val || val.length < 6) { Swal.showValidationMessage("Mínimo 6 caracteres"); return false; }
        return val;
      }
    });
    if (!newPassword) return;
    try {
      await axios.put(`/users/${u.id}/password`, { newPassword }, { withCredentials: true });
      Swal.fire({ title: "Contraseña actualizada", icon: "success", background: t.bgCard, color: t.text, timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: "Error", text: err?.response?.data?.message || "No se pudo cambiar la contraseña", icon: "error", background: t.bgCard, color: t.text });
    }
  };

  const handleCreateUser = async () => {
    if (!form.username || !form.email || !form.password) {
      Swal.fire({ title: "Completa todos los campos requeridos", icon: "warning", background: t.bgCard, color: t.text });
      return;
    }
    setSaving(true);
    try {
      await axios.post("/register-admin", form, { withCredentials: true });
      Swal.fire({ title: "Usuario creado", icon: "success", background: t.bgCard, color: t.text, timer: 1500, showConfirmButton: false });
      setForm({ username: "", email: "", password: "", nombres: "", apellidos: "", cargo: "Mecánico" });
      setTab("list");
      fetchUsers();
    } catch (err) {
      Swal.fire({ title: "Error", text: err?.response?.data?.message || "No se pudo crear el usuario", icon: "error", background: t.bgCard, color: t.text });
    } finally {
      setSaving(false);
    }
  };

  const inp = `w-full p-3 rounded-xl text-sm outline-none`;
  const is = { background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: t.bg, color: t.text }}>
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p>Cargando usuarios...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black" style={{ color: t.text }}>👥 Usuarios</h1>
            <p className="text-sm mt-1" style={{ color: t.textMuted }}>{users.length} usuarios registrados</p>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-2">
              <button onClick={() => setTab("list")}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: tab === "list" ? t.accent : t.bgSecondary, color: tab === "list" ? "#fff" : t.text }}>
                Lista
              </button>
              <button onClick={() => setTab("create")}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: tab === "create" ? t.accent : t.bgSecondary, color: tab === "create" ? "#fff" : t.text }}>
                + Nuevo Usuario
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        {tab === "list" && (
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-12" style={{ color: t.textMuted }}>No hay usuarios para mostrar</div>
            ) : users.map((u) => (
              <div key={u.id} className="rounded-2xl p-4 flex items-center justify-between gap-4"
                style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ background: t.accent }}>
                    {(u.nombres || u.username || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{u.nombres} {u.apellidos}</p>
                    <p className="text-xs" style={{ color: t.textMuted }}>@{u.username} · {u.email}</p>
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: "10px" }}>
                  {/* Columna ROL — ancho fijo */}
                  <div style={{ width: "148px" }}>
                    {isSuperAdmin ? (
                      <select value={u.cargo} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs p-2 rounded-lg w-full"
                        style={{ background: t.input, color: t.text, border: `1px solid ${t.inputBorder}` }}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full block text-center"
                        style={{ background: t.bgSecondary, color: t.textMuted }}>{u.cargo}</span>
                    )}
                  </div>
                  {/* Columna 🔑 — ancho fijo */}
                  <div style={{ width: "36px", display: "flex", justifyContent: "center" }}>
                    {isSuperAdmin ? (
                      <button onClick={() => handleChangePassword(u)}
                        title="Cambiar contraseña"
                        className="text-xs p-2 rounded-lg transition w-full"
                        style={{ background: t.bgSecondary, color: t.accent }}>
                        🔑
                      </button>
                    ) : <span style={{ display: "inline-block", width: "36px" }} />}
                  </div>
                  {/* Columna 🗑 — ancho fijo */}
                  <div style={{ width: "36px", display: "flex", justifyContent: "center" }}>
                    {isSuperAdmin && u.cargo?.toLowerCase() !== "superadmin" ? (
                      <button onClick={() => handleDelete(u)}
                        title="Eliminar usuario"
                        className="text-sm p-2 rounded-lg transition w-full"
                        style={{ background: t.bgSecondary, color: "#f87171" }}>
                        🗑
                      </button>
                    ) : <span style={{ display: "inline-block", width: "36px" }} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "create" && isSuperAdmin && (
          <div className="rounded-2xl p-6 space-y-4" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <h2 className="font-bold text-lg">Crear nuevo usuario</h2>
            {[
              { key: "username", label: "Username *", type: "text" },
              { key: "email", label: "Email *", type: "email" },
              { key: "password", label: "Contraseña *", type: "password" },
              { key: "nombres", label: "Nombres", type: "text" },
              { key: "apellidos", label: "Apellidos", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className={inp} style={is} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Cargo</label>
              <select value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} className={inp} style={is}>
                {ROLES.filter(r => isSuperAdmin ? true : r !== "superadmin").map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setTab("list")} className="px-5 py-2.5 rounded-xl text-sm"
                style={{ background: t.bgSecondary, color: t.textMuted }}>Cancelar</button>
              <button onClick={handleCreateUser} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: `${t.accent}`, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
