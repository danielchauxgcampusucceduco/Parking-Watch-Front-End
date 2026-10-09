/** URLs públicas del Backend, definidas por entorno durante la compilación (RNF-11.2). */
export const API_URL: string =
  import.meta.env.VITE_BACKEND_API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8080";
export const WS_URL: string =
  import.meta.env.VITE_BACKEND_WS_URL ??
  import.meta.env.VITE_WS_URL ??
  "ws://localhost:8080/ws";
