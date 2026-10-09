import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import { SessionProvider } from "../auth/session";

type Handler = unknown | ((init: RequestInit | undefined) => unknown);

/** Respuestas simuladas del backend por "MÉTODO /ruta" (sin query string). */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { key: string; init: RequestInit | undefined }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    calls.push({ key, init });
    if (!(key in routes)) {
      return new Response(JSON.stringify({ code: "NOT_FOUND", detail: key }), { status: 404 });
    }
    const handler = routes[key];
    const data =
      typeof handler === "function" ? (handler as (i?: RequestInit) => unknown)(init) : handler;
    if (data instanceof Response) {
      return data;
    }
    return new Response(data === undefined ? "" : JSON.stringify(data), { status: 200 });
  });
  return calls;
}

/** Renderiza con React Query, sesión y enrutador en la ruta indicada. */
export function renderPage(ui: ReactElement, route = "/", path = "*") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

export const CAMERA = {
  id: "CAM-MAQ-01",
  name: "Cámara de la maqueta",
  address: "Maqueta de vía pública",
  location: { latitude: 4.60971, longitude: -74.08175 },
  coverageArea: [{ latitude: 4.6, longitude: -74.08 }],
  displayStatus: "ONLINE",
  frame: { width: 1280, height: 720 },
};

export const ZONES = [
  {
    id: 1,
    name: "Zona amarilla",
    zoneType: "YELLOW_ZONE",
    polygon: [
      { x: 820, y: 420 },
      { x: 1180, y: 420 },
      { x: 1180, y: 560 },
    ],
    toleranceSeconds: 10,
    signaled: true,
  },
];

export const REPORT = {
  id: "r1",
  cameraId: "CAM-MAQ-01",
  zoneId: 1,
  vehicleType: "CAR",
  plate: "ABC123",
  plateConfidence: 0.91,
  detectionConfidence: 0.94,
  enteredAt: "2026-10-05T15:00:00Z",
  generatedAt: "2026-10-05T15:00:11Z",
  status: "NEW",
  modelVersion: "det-1.0-maqueta",
};
