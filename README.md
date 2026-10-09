# cupo-frontend

Página web privada de la oficina de tránsito (Módulo 1 del documento v6): React 19 + TypeScript

- Vite, publicada en **Vercel** como sitio estático. Consume la API REST del Backend (tipos
  generados desde su OpenAPI) y el WebSocket STOMP para el video en vivo, las detecciones y los
  reportes nuevos.

| Pantalla                                                                                 | Rol                              |
| ---------------------------------------------------------------------------------------- | -------------------------------- |
| Mapa de cámaras con estado (color, texto e ícono)                                        | Operador                         |
| Cámara en vivo: video, zonas, recuadros, indicadores y vehículos detenidos               | Operador                         |
| Reportes: filtros, detalle con fotos, confirmar/descartar, PDF y Excel, aviso con sonido | Operador                         |
| Zonas (dibujo sobre la captura), modelos (ONNX, activar, volver atrás) y usuarios        | Administrador con segundo factor |

```bash
cp .env.example .env.local      # VITE_API_URL y VITE_WS_URL
pnpm install
pnpm dev                        # http://localhost:5173
pnpm lint && pnpm typecheck
pnpm test:coverage              # Vitest, cobertura >= 70 %
pnpm test:e2e                   # Playwright (E2E_BASE_URL para probar un despliegue)
pnpm gen:api                    # regenera src/api/schema.d.ts desde ../cupo-backend/docs/openapi.json
```

El JWT se guarda solo en memoria (recargar la página pide iniciar sesión de nuevo) y se renueva
antes de vencer. `vercel.json` define la reescritura de la SPA y las cabeceras de seguridad.
