import { z } from 'zod'

export const createTaskSchema = z.object({
    description: z.string({
        required_error: 'Descripcion es requerida',
    }),
    date: z
        .string()
        .optional()
        .transform((value) => (value ? new Date(value) : undefined)) // Transforma el string a Date
        .refine((date) => !date || !isNaN(date.getTime()), {
            message: 'Fecha no válida, debe estar en formato ISO',
        }),
});