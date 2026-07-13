import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/logo.jsx";

function RegisterPage() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { signup, errors: signupErrors } = useAuth();
    const navigate = useNavigate();
    const cargos = ["Administrador", "Mecánico", "Recepcionista", "Supervisor"];

    const onSubmit = handleSubmit(async (data) => {
        try {
            await signup(data); // Envía los datos del formulario
            navigate("/tasks"); // Redirige al usuario después del registro
        } catch (error) {
            console.error("Error al registrar usuario:", error.message);
        }
    });

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
            {/* Logo */}
            <div className="mb-4">
                <Logo />
            </div>

            {/* Contenedor de registro */}
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    Registro
                </h1>

                {/* Mostrar errores */}
                {signupErrors?.map((error, i) => (
                    <div key={i} className="bg-red-500 text-white p-2 mb-2 rounded text-center">
                        {error}
                    </div>
                ))}

                {/* Formulario */}
                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <input
                            type="text"
                            {...register("nombres", { required: "Nombres es requerido" })}
                            placeholder="Nombres"
                            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.nombres && <p className="text-red-500 text-sm">{errors.nombres.message}</p>}
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            {...register("apellidos", { required: "Apellidos es requerido" })}
                            placeholder="Apellidos"
                            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.apellidos && <p className="text-red-500 text-sm">{errors.apellidos.message}</p>}
                    </div>

                    <div className="mb-4">
                        <select
                            {...register("cargo", { required: "El cargo es obligatorio" })}
                            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="" disabled>Selecciona un cargo</option>
                            {cargos.map((item, index) => (
                                <option key={index} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                        {errors.cargo && <p className="text-red-500 text-sm">{errors.cargo.message}</p>}

                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            {...register("username", { required: "Usuario es requerido" })}
                            placeholder="Nombre de usuario"
                            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
                    </div>

                    <div className="mb-4">
                        <input
                            type="email"
                            {...register("email", { required: "Correo electrónico es requerido" })}
                            placeholder="Correo electrónico"
                            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                    </div>

                    <div className="mb-6">
                        <input
                            type="password"
                            {...register("password", { required: "Contraseña es requerida", minLength: { value: 6, message: "La contraseña debe tener al menos 6 caracteres" } })}
                            placeholder="Contraseña"
                            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
                    >
                        Registrarse
                    </button>
                </form>

                <p className="text-gray-700 mt-4 text-center">
                    ¿Ya tienes una cuenta?{" "}
                    <Link to="/login" className="text-blue-500 hover:underline">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;
