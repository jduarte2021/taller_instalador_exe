import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); // Llamar a la función de logout
        navigate("/login"); // Redirigir al login después de cerrar sesión
    };

    return (
        <nav className="bg-gray-800 text-white p-4">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold">
                    MeQanoX
                </Link>
                <div className="flex items-center gap-4">
                    <Link to="/tasks" className="hover:text-gray-300">
                        Tareas
                    </Link>
                    <Link to="/add-task" className="hover:text-gray-300">
                        Agregar tareas
                    </Link>
                    <Link to="/search-tasks" className="text-white hover:text-gray-300">
                        Buscar Tareas
                    </Link>
                    <Link to="/profile" className="text-white hover:text-gray-300">
                        Perfil
                    </Link>
                    {user && (
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;

