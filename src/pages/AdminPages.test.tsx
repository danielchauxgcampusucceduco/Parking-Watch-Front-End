import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CAMERA, ZONES, mockApi, renderPage } from "../test/utils";
import { ModelsPage } from "./ModelsPage";
import { UsersPage } from "./UsersPage";
import { ZonesPage, toImagePoint } from "./ZonesPage";

const MODELS = [
  {
    version: "det-1.0",
    active: true,
    metrics: { map50: 0.92, precision: 0.96, recall: 0.91, plateAccuracy: 0.9 },
    qualityGate: { passed: true, failures: [] },
    detectorSha256: "a",
  },
  {
    version: "det-bad",
    active: false,
    metrics: { map50: 0.4 },
    qualityGate: { passed: false, failures: ["mAP@0,5"] },
  },
  {
    version: "det-1.1",
    active: false,
    metrics: { map50: 0.93 },
    qualityGate: { passed: true, failures: [] },
  },
];

describe("administración", () => {
  it("convierte clics del lienzo a píxeles de la imagen", () => {
    const rect = { left: 10, top: 20, width: 640 } as DOMRect;
    expect(toImagePoint(330, 120, rect, 1280)).toEqual({ x: 640, y: 200 });
  });

  it("edita y guarda las zonas de la cámara", async () => {
    const calls = mockApi({
      "GET /api/v1/cameras": [CAMERA],
      "GET /api/v1/cameras/CAM-MAQ-01/zones": ZONES,
      "PUT /api/v1/cameras/CAM-MAQ-01/zones": ZONES,
    });
    renderPage(<ZonesPage />);
    const tolerance = await screen.findByLabelText("Tolerancia");
    await userEvent.clear(tolerance);
    await userEvent.type(tolerance, "15");
    await userEvent.click(screen.getByLabelText("Señalizada"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar zonas" }));
    await waitFor(() =>
      expect(screen.getByText(/Guardadas y enviadas al Edge/)).toBeInTheDocument(),
    );
    const put = calls.find((c) => c.key === "PUT /api/v1/cameras/CAM-MAQ-01/zones");
    const body = JSON.parse(String(put?.init?.body));
    expect(body.zones[0]).toMatchObject({ toleranceSeconds: 15, signaled: false });
    expect(screen.getByRole("button", { name: /Cerrar polígono/ })).toBeDisabled();
  });

  it("solo permite activar versiones que cumplen las metas", async () => {
    const calls = mockApi({
      "GET /api/v1/models": MODELS,
      "POST /api/v1/models/det-1.1/activate": MODELS[2],
      "POST /api/v1/models/rollback": MODELS[0],
    });
    renderPage(<ModelsPage />);
    expect(await screen.findByText(/✕ mAP@0,5/)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Activar" });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    await userEvent.click(buttons[2]!);
    await userEvent.click(screen.getByRole("button", { name: "Volver a la versión anterior" }));
    await waitFor(() => expect(calls.map((c) => c.key)).toContain("POST /api/v1/models/rollback"));
    expect(calls.map((c) => c.key)).toContain("POST /api/v1/models/det-1.1/activate");
  });

  it("crea usuarios", async () => {
    const calls = mockApi({
      "GET /api/v1/users": [
        { id: "1", username: "admin", fullName: "Admin", role: "ADMINISTRATOR" },
      ],
      "POST /api/v1/users": { id: "2" },
    });
    renderPage(<UsersPage />);
    expect(await screen.findByText("Administrador")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Usuario"), "operador2");
    await userEvent.type(screen.getByLabelText("Nombre completo"), "Operador Dos");
    await userEvent.type(screen.getByLabelText(/Contraseña/), "Operador-Dos-2026");
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    await waitFor(() => expect(calls.map((c) => c.key)).toContain("POST /api/v1/users"));
  });
});
