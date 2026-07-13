import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "../api/axios";

const isElectron = typeof window !== "undefined" && !!window.electronAPI;
const BASE_URL   = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api$/, "");

export default function SettingsPage() {
  const { theme: t } = useTheme();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const isSuperAdmin = user?.cargo?.toLowerCase() === "superadmin";

  useEffect(() => { if (user && !isSuperAdmin) navigate("/dashboard"); }, [user]);

  // ── Carpetas ──────────────────────────────────────────────────────────────
  const [pdfFolder,    setPdfFolder]    = useState("");
  const [backupFolder, setBackupFolder] = useState("");
  const [folderSaved,  setFolderSaved]  = useState(false);
  const [loadingBk,    setLoadingBk]    = useState(false);

  // ── Email ─────────────────────────────────────────────────────────────────
  const [emailMethod,  setEmailMethod]  = useState("gmail");   // "gmail" | "smtp"
  const [gmailUser,    setGmailUser]    = useState("");
  const [gmailPass,    setGmailPass]    = useState("");
  const [smtpHost,     setSmtpHost]     = useState("");
  const [smtpPort,     setSmtpPort]     = useState("587");
  const [smtpSecure,   setSmtpSecure]   = useState("false");
  const [smtpUser,     setSmtpUser]     = useState("");
  const [smtpPass,     setSmtpPass]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [emailStatus,  setEmailStatus]  = useState(null);
  const [savingEmail,  setSavingEmail]  = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testTo,       setTestTo]       = useState("");

  // ── Timeout de sesión ─────────────────────────────────────────────────────
  const [sessionMinutes, setSessionMinutes] = useState(
    () => localStorage.getItem("session_timeout_minutes") || "15"
  );
  const [savedTimeout,   setSavedTimeout]   = useState(false);

  // ── Retención de logs ─────────────────────────────────────────────────────
  const [logRetentionDays, setLogRetentionDays] = useState(
    () => localStorage.getItem("log_retention_days") || "90"
  );
  const [savedRetention,   setSavedRetention]   = useState(false);

  const handleSaveRetention = async () => {
    const val = parseInt(logRetentionDays);
    if (isNaN(val) || val < 1) return;
    try {
      await axios.post("/config/retention", { days: val });
      localStorage.setItem("log_retention_days", String(val));
      setSavedRetention(true);
      setTimeout(() => setSavedRetention(false), 2500);
    } catch (e) {
      Swal.fire({ title: "Error al guardar", text: e.response?.data?.message || e.message, icon: "error", background: t.bgCard, color: t.text });
    }
  };

  const handleSaveTimeout = () => {
    const val = parseInt(sessionMinutes);
    if (isNaN(val) || val < 1) return;
    localStorage.setItem("session_timeout_minutes", String(val));
    setSavedTimeout(true);
    setTimeout(() => setSavedTimeout(false), 2500);
  };

  useEffect(() => {
    setPdfFolder(   localStorage.getItem("pdf_download_folder")    || "");
    setBackupFolder(localStorage.getItem("backup_download_folder") || "");
    // Cargar retención de logs desde backend
    axios.get("/config/retention").then(res => {
      setLogRetentionDays(String(res.data.days || 90));
    }).catch(() => {});

    axios.get("/config/email").then(res => {
      const d = res.data;
      setEmailMethod(d.method || "gmail");
      setGmailUser(d.GMAIL_USER || "");
      setSmtpHost(d.SMTP_HOST   || "");
      setSmtpPort(d.SMTP_PORT   || "587");
      setSmtpSecure(d.SMTP_SECURE || "false");
      setSmtpUser(d.SMTP_USER   || "");
      setEmailStatus(d.method === "smtp" ? (d.smtpConfigured ? "configured" : "not_configured")
                                         : (d.gmailConfigured ? "configured" : "not_configured"));
    }).catch(() => setEmailStatus("not_configured"));
  }, []);

  const flashFolder = () => { setFolderSaved(true); setTimeout(() => setFolderSaved(false), 2500); };

  // ── Carpetas ──────────────────────────────────────────────────────────────
  const selectFolder = async (type) => {
    if (!isElectron) return;
    const folder = await window.electronAPI.selectFolder();
    if (!folder) return;
    if (type === "pdf") { setPdfFolder(folder); localStorage.setItem("pdf_download_folder", folder); }
    else { setBackupFolder(folder); localStorage.setItem("backup_download_folder", folder); }
    flashFolder();
  };
  const clearFolder = (type) => {
    if (type === "pdf") { setPdfFolder(""); localStorage.removeItem("pdf_download_folder"); }
    else { setBackupFolder(""); localStorage.removeItem("backup_download_folder"); }
    flashFolder();
  };

  // ── Backup ────────────────────────────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setLoadingBk(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${BASE_URL}/api/backup`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob     = await res.blob();
      const filename = `backup_motiq_${new Date().toISOString().split("T")[0]}.zip`;
      if (isElectron && backupFolder) {
        const buffer = await blob.arrayBuffer();
        const result = await window.electronAPI.saveFile(Array.from(new Uint8Array(buffer)), backupFolder, filename);
        if (result.saved) Swal.fire({ title: "¡Backup guardado!", text: `En: ${result.filePath}`, icon: "success", background: t.bgCard, color: t.text, timer: 3000, showConfirmButton: false });
        else throw new Error(result.error || "No se pudo guardar");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        Swal.fire({ title: "¡Backup descargado!", icon: "success", background: t.bgCard, color: t.text, timer: 2000, showConfirmButton: false });
      }
    } catch (e) {
      Swal.fire({ title: "Error al generar backup", text: e.message, icon: "error", background: t.bgCard, color: t.text });
    } finally { setLoadingBk(false); }
  };

  const handleRestoreBackup = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".db";
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const confirm = await Swal.fire({
        title: "¿Restaurar base de datos?",
        html: `Desde <b>${file.name}</b>.<br><br>Reemplazará <b>TODOS</b> los datos. Se crea un respaldo previo automático.`,
        icon: "warning", showCancelButton: true,
        confirmButtonColor: "#ef4444", confirmButtonText: "Sí, restaurar", cancelButtonText: "Cancelar",
        background: t.bgCard, color: t.text,
      });
      if (!confirm.isConfirmed) return;
      setLoadingBk(true);
      try {
        const token = localStorage.getItem("token");
        const form  = new FormData(); form.append("database", file);
        const res   = await fetch(`${BASE_URL}/api/backup/restore`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
        const data  = await res.json();
        if (res.ok) await Swal.fire({ title: "¡Restauración exitosa!", text: data.message, icon: "success", background: t.bgCard, color: t.text, confirmButtonText: "Entendido" });
        else throw new Error(data.message);
      } catch (err) {
        Swal.fire({ title: "Error al restaurar", text: err.message, icon: "error", background: t.bgCard, color: t.text });
      } finally { setLoadingBk(false); }
    };
    input.click();
  };

  // ── Guardar config email ──────────────────────────────────────────────────
  const handleSaveEmail = async () => {
    if (emailMethod === "gmail" && !gmailUser.trim())
      return Swal.fire({ title: "Correo Gmail requerido", icon: "warning", background: t.bgCard, color: t.text });
    if (emailMethod === "smtp" && (!smtpHost.trim() || !smtpUser.trim()))
      return Swal.fire({ title: "Servidor y usuario SMTP requeridos", icon: "warning", background: t.bgCard, color: t.text });

    setSavingEmail(true);
    try {
      await axios.post("/config/email", {
        method: emailMethod,
        gmailUser, gmailPass,
        smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass,
      });
      setEmailStatus("configured");
      setGmailPass(""); setSmtpPass("");
      Swal.fire({ title: "¡Configuración guardada!", icon: "success", background: t.bgCard, color: t.text, timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ title: "Error al guardar", text: e.response?.data?.message || e.message, icon: "error", background: t.bgCard, color: t.text });
    } finally { setSavingEmail(false); }
  };

  // ── Enviar correo de prueba ───────────────────────────────────────────────
  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await axios.post("/email/test", { testTo: testTo.trim() || undefined });
      Swal.fire({ title: "¡Prueba exitosa!", text: res.data.message, icon: "success", background: t.bgCard, color: t.text });
    } catch (e) {
      Swal.fire({
        title: "Error en prueba de correo",
        html: `<p style="font-size:13px;text-align:left;">${e.response?.data?.message || e.message}</p>
               <p style="font-size:11px;color:#94a3b8;text-align:left;margin-top:8px;">
               Verifica: servidor correcto, puerto correcto, usuario/contraseña válidos, y que el firewall no bloquee el puerto SMTP.
               </p>`,
        icon: "error", background: t.bgCard, color: t.text,
      });
    } finally { setTestingEmail(false); }
  };

  // ── Estilos ───────────────────────────────────────────────────────────────
  const card = { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "0.75rem", padding: "1.25rem 1.5rem", marginBottom: "1rem" };
  const inp  = { background: t.bgSecondary, color: t.text, border: `1px solid ${t.border}`, borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.85rem", width: "100%", outline: "none" };
  const btn  = (color, outline) => ({
    background:   outline ? "transparent" : (color || t.bgSecondary),
    color:        outline ? (color || t.text) : (color ? "#fff" : t.text),
    border:       `1px solid ${color || t.border}`,
    borderRadius: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.85rem",
    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap",
  });

  const Label = ({ children }) => (
    <label className="text-xs font-semibold mb-1 block" style={{ color: t.textMuted }}>{children}</label>
  );

  const SectionTitle = ({ icon, children }) => (
    <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: t.text }}>
      <span className="material-icons text-base" style={{ color: t.textMuted }}>{icon}</span>
      {children}
    </h2>
  );

  const FolderRow = ({ value, type }) => (
    <>
      <div className="flex items-center gap-2 mb-2">
        <input type="text" readOnly value={value || "Sin configurar (se pedirá carpeta cada vez)"}
          style={{ ...inp, color: value ? t.text : t.textMuted }} />
        {isElectron
          ? <button onClick={() => selectFolder(type)} style={btn()}><span className="material-icons text-sm">folder_open</span>Examinar</button>
          : <span className="text-xs" style={{ color: t.textMuted }}>Solo disponible en la app de escritorio</span>}
      </div>
      {value && <button onClick={() => clearFolder(type)} className="flex items-center gap-1 text-xs"
        style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>
        <span className="material-icons text-sm">clear</span>Limpiar carpeta
      </button>}
    </>
  );

  const currentUser = emailMethod === "smtp" ? smtpUser : gmailUser;

  return (
    <div className="p-6 max-w-2xl mx-auto" style={{ color: t.text }}>
      <h1 className="text-xl font-bold mb-5 flex items-center gap-2">
        <span className="material-icons" style={{ color: t.textMuted }}>settings</span>
        Configuración
      </h1>

      {/* Carpeta PDFs */}
      <div style={card}>
        <SectionTitle icon="picture_as_pdf">Carpeta de descarga — Órdenes PDF</SectionTitle>
        <p className="text-xs mb-3" style={{ color: t.textMuted }}>El PDF se guardará aquí sin mostrar el diálogo cada vez.</p>
        <FolderRow value={pdfFolder} type="pdf" />
      </div>

      {/* Backup */}
      <div style={card}>
        <SectionTitle icon="backup">Respaldos de base de datos</SectionTitle>
        <p className="text-xs mb-4" style={{ color: t.textMuted }}>Respaldo completo (.zip con .db, JSON y CSV) o restaura desde uno anterior.</p>
        {isElectron && (
          <div className="mb-4 pb-4" style={{ borderBottom: `1px solid ${t.border}` }}>
            <Label>CARPETA DE RESPALDOS</Label>
            <FolderRow value={backupFolder} type="backup" />
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleDownloadBackup} disabled={loadingBk} style={{ ...btn(), opacity: loadingBk ? 0.6 : 1 }}>
            <span className="material-icons text-sm">download</span>{loadingBk ? "Generando..." : "Descargar Backup"}
          </button>
          <button onClick={handleRestoreBackup} disabled={loadingBk} style={{ ...btn(), color: "#f87171", borderColor: "#f8717140", opacity: loadingBk ? 0.6 : 1 }}>
            <span className="material-icons text-sm">restore</span>Restaurar Backup
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: t.textMuted }}>
          ⚠ Restaurar reemplaza <strong>todos</strong> los datos actuales.
        </p>
      </div>

      {/* Email */}
      <div style={card}>
        <SectionTitle icon="email">Configuración de correo electrónico</SectionTitle>
        <p className="text-xs mb-3" style={{ color: t.textMuted }}>
          Para enviar presupuestos por correo. Elige el método según tu proveedor.
        </p>

        {/* Estado actual */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: t.bgSecondary }}>
          <span className="material-icons text-sm" style={{ color: emailStatus === "configured" ? "#4ade80" : "#f87171" }}>
            {emailStatus === "configured" ? "check_circle" : "cancel"}
          </span>
          <span className="text-xs" style={{ color: t.textMuted }}>
            {emailStatus === "configured"
              ? `Configurado · método: ${emailMethod === "smtp" ? "SMTP" : "Gmail"} · ${currentUser}`
              : "No configurado — el envío de correos está desactivado"}
          </span>
        </div>

        {/* Selector de método */}
        <div className="mb-4">
          <Label>MÉTODO DE ENVÍO</Label>
          <div className="flex gap-2">
            {[
              { value: "gmail", label: "Gmail", icon: "mail" },
              { value: "smtp",  label: "SMTP (correo empresarial)", icon: "dns" },
            ].map(m => (
              <button key={m.value} onClick={() => setEmailMethod(m.value)}
                style={{ ...btn(emailMethod === m.value ? "#0F52BA" : null, emailMethod !== m.value), flex: 1, justifyContent: "center" }}>
                <span className="material-icons text-sm">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos Gmail */}
        {emailMethod === "gmail" && (
          <div className="space-y-3">
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
              className="text-xs flex items-center gap-1 mb-2" style={{ color: t.accent }}>
              <span className="material-icons text-sm">open_in_new</span>
              Cómo obtener una contraseña de aplicación de Google
            </a>
            <div>
              <Label>CORREO GMAIL</Label>
              <input type="email" placeholder="tucorreo@gmail.com" value={gmailUser}
                onChange={e => setGmailUser(e.target.value)} style={inp} />
            </div>
            <div>
              <Label>CONTRASEÑA DE APLICACIÓN (16 caracteres)</Label>
              <div className="flex gap-2">
                <input type={showPass ? "text" : "password"} placeholder="xxxx xxxx xxxx xxxx"
                  value={gmailPass} onChange={e => setGmailPass(e.target.value)} style={inp} />
                <button onClick={() => setShowPass(!showPass)} style={{ ...btn(), flexShrink: 0 }}>
                  <span className="material-icons text-sm">{showPass ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>Deja en blanco para mantener la contraseña actual.</p>
            </div>
          </div>
        )}

        {/* Campos SMTP */}
        {emailMethod === "smtp" && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg text-xs" style={{ background: t.bgSecondary, color: t.textMuted }}>
              <strong style={{ color: t.text }}>Datos SMTP de proveedores comunes:</strong><br />
              Outlook/Hotmail: <code>smtp.office365.com</code> puerto <code>587</code> TLS<br />
              Yahoo: <code>smtp.mail.yahoo.com</code> puerto <code>465</code> SSL<br />
              cPanel/Hosting propio: según tu proveedor (consulta con soporte)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div style={{ gridColumn: "1 / -1" }}>
                <Label>SERVIDOR SMTP</Label>
                <input type="text" placeholder="smtp.tuempresa.cl" value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)} style={inp} />
              </div>
              <div>
                <Label>PUERTO</Label>
                <select value={smtpPort} onChange={e => setSmtpPort(e.target.value)} style={inp}>
                  <option value="587">587 (TLS — recomendado)</option>
                  <option value="465">465 (SSL)</option>
                  <option value="25">25 (Sin cifrado)</option>
                </select>
              </div>
              <div>
                <Label>CIFRADO</Label>
                <select value={smtpSecure} onChange={e => setSmtpSecure(e.target.value)} style={inp}>
                  <option value="false">TLS/STARTTLS (puerto 587)</option>
                  <option value="true">SSL (puerto 465)</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label>USUARIO (correo completo)</Label>
                <input type="email" placeholder="contacto@tuempresa.cl" value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)} style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label>CONTRASEÑA</Label>
                <div className="flex gap-2">
                  <input type={showPass ? "text" : "password"} placeholder="Contraseña del correo"
                    value={smtpPass} onChange={e => setSmtpPass(e.target.value)} style={inp} />
                  <button onClick={() => setShowPass(!showPass)} style={{ ...btn(), flexShrink: 0 }}>
                    <span className="material-icons text-sm">{showPass ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>Deja en blanco para mantener la contraseña actual.</p>
              </div>
            </div>
          </div>
        )}

        {/* Botones guardar */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={handleSaveEmail} disabled={savingEmail}
            style={{ ...btn("#0F52BA"), opacity: savingEmail ? 0.6 : 1 }}>
            <span className="material-icons text-sm">save</span>
            {savingEmail ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>

        {/* Botón de prueba */}
        {emailStatus === "configured" && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
            <Label>ENVIAR CORREO DE PRUEBA</Label>
            <p className="text-xs mb-2" style={{ color: t.textMuted }}>
              Verifica que la configuración funciona enviando un correo de prueba. Si lo dejas en blanco, se enviará al correo configurado.
            </p>
            <div className="flex gap-2">
              <input type="email" placeholder={`Dejar en blanco → enviar a ${currentUser}`}
                value={testTo} onChange={e => setTestTo(e.target.value)} style={inp} />
              <button onClick={handleTestEmail} disabled={testingEmail}
                style={{ ...btn("#4ade80".replace("#4ade80", t.accent), true), flexShrink: 0, borderColor: "#4ade80", color: "#4ade80", opacity: testingEmail ? 0.6 : 1 }}>
                <span className="material-icons text-sm">{testingEmail ? "hourglass_empty" : "send"}</span>
                {testingEmail ? "Enviando..." : "Probar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Retención de logs */}
      <div style={card}>
        <SectionTitle icon="history">Retención de registros de actividad (Logs)</SectionTitle>
        <p className="text-xs mb-4" style={{ color: t.textMuted }}>
          Los registros de actividad más antiguos que este período se eliminan automáticamente al iniciar la aplicación.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {[30, 60, 90, 180, 365].map(days => (
            <button key={days} onClick={() => setLogRetentionDays(String(days))}
              style={{ ...btn(logRetentionDays === String(days) ? "#0F52BA" : null, logRetentionDays !== String(days)), minWidth: "72px", justifyContent: "center" }}>
              {days} días
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input type="number" min="1" max="3650" value={logRetentionDays}
              onChange={e => setLogRetentionDays(e.target.value)}
              style={{ ...inp, width: "80px", textAlign: "center" }} />
            <span className="text-xs" style={{ color: t.textMuted }}>días</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleSaveRetention} style={btn("#0F52BA")}>
            <span className="material-icons text-sm">save</span>
            Guardar
          </button>
          {savedRetention && (
            <span className="text-xs flex items-center gap-1" style={{ color: "#4ade80" }}>
              <span className="material-icons text-sm">check_circle</span>
              Guardado — se aplicará al próximo inicio
            </span>
          )}
        </div>
      </div>

      {/* Timeout de sesión */}
      <div style={card}>
        <SectionTitle icon="timer">Tiempo de cierre automático de sesión</SectionTitle>
        <p className="text-xs mb-4" style={{ color: t.textMuted }}>
          La sesión se cerrará automáticamente tras este tiempo sin actividad. Se mostrará un aviso 2 minutos antes.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {[5, 10, 15, 30, 60].map(min => (
            <button key={min} onClick={() => setSessionMinutes(String(min))}
              style={{ ...btn(sessionMinutes === String(min) ? "#0F52BA" : null, sessionMinutes !== String(min)), minWidth: "64px", justifyContent: "center" }}>
              {min} min
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input type="number" min="1" max="480" value={sessionMinutes}
              onChange={e => setSessionMinutes(e.target.value)}
              style={{ ...inp, width: "80px", textAlign: "center" }} />
            <span className="text-xs" style={{ color: t.textMuted }}>minutos</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleSaveTimeout} style={btn("#0F52BA")}>
            <span className="material-icons text-sm">save</span>
            Guardar
          </button>
          {savedTimeout && (
            <span className="text-xs flex items-center gap-1" style={{ color: "#4ade80" }}>
              <span className="material-icons text-sm">check_circle</span>
              Guardado — se aplicará en la próxima sesión
            </span>
          )}
        </div>
      </div>

      {folderSaved && (
        <p className="text-sm flex items-center gap-1 mt-1" style={{ color: "#4ade80" }}>
          <span className="material-icons text-sm">check_circle</span> Configuración guardada
        </p>
      )}
    </div>
  );
}
