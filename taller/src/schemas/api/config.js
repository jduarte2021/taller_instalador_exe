// URL base del backend - usa variable de entorno en producción, localhost en dev
export const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3000';

// Construye URL de imagen de perfil
export const getAvatarUrl = (profileImage) => {
  if (!profileImage) return null;
  // Si ya es una URL completa (http/https), usarla directo
  if (profileImage.startsWith('http')) return profileImage;
  // Si ya viene con /uploads/ (guardado desde profile.routes.js), no duplicar
  if (profileImage.startsWith('/uploads/')) return `${API_BASE}${profileImage}`;
  return `${API_BASE}/uploads/${profileImage}`;
};
