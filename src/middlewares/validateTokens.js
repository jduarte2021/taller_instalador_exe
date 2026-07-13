import jwt from 'jsonwebtoken';
import { TOKEN_SECRET } from '../config.js';

export const authRequired = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = headerToken || req.cookies.token;

    if (!token)
        return res.status(401).json({ message: "No hay token, autorizacion denegada" });

    jwt.verify(token, TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token invalido" });
        req.user = user;
        next();
    });
};

export const superadminRequired = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "No autenticado" });
    if ((req.user.cargo || '').toLowerCase() !== 'superadmin')
        return res.status(403).json({ message: "Acceso denegado: se requiere rol superadmin" });
    next();
};
