import { createContext, useState, useEffect, useRef, useContext } from "react";
import axios from "../api/axios";
import PropTypes from 'prop-types';
import Swal from "sweetalert2";

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
    return context;
};

// Timeout de sesión: lee de localStorage, default 15 minutos
function getSessionTimeout() {
  const stored = localStorage.getItem("session_timeout_minutes");
  const minutes = stored ? parseInt(stored) : 15;
  return (isNaN(minutes) || minutes < 1 ? 15 : minutes) * 60 * 1000;
}
const WARNING_BEFORE = 2 * 60 * 1000; // Aviso 2 min antes

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("motiq_user");
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);

    const timeoutRef       = useRef(null);
    const warningRef       = useRef(null);
    const warnShownRef     = useRef(false);
    const isAuthenticatedRef = useRef(false);

    // Mantener ref sincronizado con estado
    useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);

    // ── Persistir usuario ─────────────────────────────────────────────────────
    useEffect(() => {
        if (user) localStorage.setItem("motiq_user", JSON.stringify(user));
        else localStorage.removeItem("motiq_user");
    }, [user]);

    // ── Limpiar errores ───────────────────────────────────────────────────────
    useEffect(() => {
        if (errors.length > 0) {
            const t = setTimeout(() => setErrors([]), 5000);
            return () => clearTimeout(t);
        }
    }, [errors]);

    // ── Logout ────────────────────────────────────────────────────────────────
    const doLogout = async (reason = "manual") => {
        if (reason === "manual") {
            const result = await Swal.fire({
                title: "¿Cerrar sesión?",
                text: "¿Estás seguro de que deseas salir?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Sí, salir",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#ef4444",
            });
            if (!result.isConfirmed) return false;
        }
        clearTimeout(timeoutRef.current);
        clearTimeout(warningRef.current);
        warnShownRef.current = false;
        try { await axios.post('/logout'); } catch {}
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("motiq_user");
        localStorage.removeItem("token");
        if (reason === "timeout") {
            await Swal.fire({
                title: "Sesión cerrada",
                text: "Tu sesión fue cerrada por inactividad.",
                icon: "warning",
                confirmButtonText: "Iniciar sesión",
                allowOutsideClick: false,
            });
        }
        return true;
    };

    // ── Temporizador de inactividad ───────────────────────────────────────────
    const resetTimer = () => {
        if (!isAuthenticatedRef.current) return;
        clearTimeout(timeoutRef.current);
        clearTimeout(warningRef.current);
        warnShownRef.current = false;

        // Advertencia 2 min antes del cierre
        warningRef.current = setTimeout(async () => {
            if (warnShownRef.current) return;
            warnShownRef.current = true;
            const result = await Swal.fire({
                title: "⚠️ Sesión por expirar",
                html: "Tu sesión se cerrará en <strong>2 minutos</strong> por inactividad.<br>¿Deseas continuar?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, continuar",
                cancelButtonText: "Cerrar sesión",
                timer: WARNING_BEFORE,
                timerProgressBar: true,
                allowOutsideClick: false,
            });
            if (result.isConfirmed) {
                resetTimer(); // Reiniciar al confirmar
            } else {
                doLogout("timeout");
            }
        }, getSessionTimeout() - WARNING_BEFORE);

        // Cierre automático
        timeoutRef.current = setTimeout(() => {
            doLogout("timeout");
        }, getSessionTimeout());
    };

    // ── Eventos de actividad del usuario ─────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;

        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        const handler = () => resetTimer();

        events.forEach(e => window.addEventListener(e, handler, { passive: true }));
        resetTimer(); // Arrancar al autenticar

        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
            clearTimeout(timeoutRef.current);
            clearTimeout(warningRef.current);
        };
    }, [isAuthenticated]);

    // ── Verificar token al montar ─────────────────────────────────────────────
    useEffect(() => {
        const checkLogin = async () => {
            try {
                const res = await axios.get('/verify');
                if (!res.data) { setIsAuthenticated(false); setLoading(false); return; }
                const userData = {
                    id: res.data.id,
                    username: res.data.username,
                    nombres: res.data.nombres,
                    apellidos: res.data.apellidos,
                    cargo: res.data.cargo,
                    email: res.data.email,
                    profileImage: res.data.profileImage,
                };
                setUser(userData);
                setIsAuthenticated(true);
            } catch {
                setIsAuthenticated(false);
                setUser(null);
                localStorage.removeItem("motiq_user");
                localStorage.removeItem("token");
            } finally {
                setLoading(false);
            }
        };
        checkLogin();
    }, []);

    // ── signup ────────────────────────────────────────────────────────────────
    const signup = async (userData) => {
        try {
            const res = await axios.post('/register', userData);
            if (res.data.token) localStorage.setItem("token", res.data.token);
            setUser(res.data);
            setIsAuthenticated(true);
        } catch (error) {
            setErrors(error.response?.data || ["Error al registrar"]);
        }
    };

    // ── signin ────────────────────────────────────────────────────────────────
    const signin = async (credentials) => {
        try {
            const res = await axios.post('/login', credentials);
            if (res.data.token) localStorage.setItem("token", res.data.token);
            const userData = {
                id: res.data.id,
                username: res.data.username,
                nombres: res.data.nombres,
                apellidos: res.data.apellidos,
                cargo: res.data.cargo,
                email: res.data.email,
                profileImage: res.data.profileImage,
            };
            setUser(userData);
            setIsAuthenticated(true);
            setErrors([]);
        } catch (error) {
            const msg = error.response?.data?.message || "Error al iniciar sesión";
            setErrors([msg]);
            throw error;
        }
    };

    const logout = () => doLogout("manual");

    const updateUserProfile = (updatedData) => {
        setUser(prev => ({ ...prev, ...updatedData }));
    };

    return (
        <AuthContext.Provider value={{
            signup, signin, logout, updateUserProfile,
            user, isAuthenticated, setIsAuthenticated, errors, loading,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
