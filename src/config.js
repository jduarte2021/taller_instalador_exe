//export const TOKEN_SECRET = process.env.TOKEN_SECRET;
export const TOKEN_SECRET = 'ThinkPad@551v'
if (!TOKEN_SECRET) {
    throw new Error('[ERROR] TOKEN_SECRET no está definido en las variables de entorno. Agrégalo en Render > Environment.');
}
