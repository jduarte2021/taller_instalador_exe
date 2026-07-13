import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,  // CRÍTICO: envía cookie en cada request
});

export default instance;
