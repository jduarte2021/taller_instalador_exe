import { z } from 'zod'

export const registerSchema = z.object({
    username: z.string({
        required_error: 'Nombre de usuario es requerido'
    }),
    email: z.string({
        required_error: 'Correo electrónico es requerido',
    }).email({
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
        message: 'Correo electrónico no válido'
    }),
    password: z.string({
        required_error: 'Contraseña es requerida',
    }).min(6, {
        message: 'Contraseña debe tener al menos 6 caracteres',

    }),

});

export const loginSchema = z.object({
    username: z.string({
        required_error: 'Nombre de usuario es requerido',
    }).min(1, {
        message: 'Nombre de usuario es requerido',
    }),
    password: z.string({
        required_error: 'Contraseña es requerida',
    }).min(6, {
        message: 'Contraseña debe tener al menos 6 caracteres',
    }),
});