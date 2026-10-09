/** URLs del Backend en Render, definidas por entorno en Vercel (RNF-11.2). */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";
