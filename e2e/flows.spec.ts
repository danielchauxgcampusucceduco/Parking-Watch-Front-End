import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const camera = {
  id: "CAM-MAQ-01",
  name: "Cámara de la maqueta",
  address: "Maqueta de vía pública",
  location: { latitude: 4.60971, longitude: -74.08175 },
  coverageArea: [],
  displayStatus: "ACTIVE_REPORT",
  frame: { width: 1280, height: 720 },
};
const report = {
  id: "7b0d3f8e-2f7a-4c1e-9f61-0c1a2b3c4d02",
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

/** Backend simulado con el contrato OpenAPI (sin WebSocket: la vista queda "Sin conexión"). */
async function mockBackend(page: Page, reviews: unknown[]) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const body = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path.endsWith("/auth/login")) {
      const login = route.request().postDataJSON();
      if (login.username === "admin" && !login.otp) {
        return body({ code: "MFA_REQUIRED", detail: "Ingrese el código" }, 401);
      }
      return body({
        accessToken: "token",
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        user: { id: "u1", username: login.username, fullName: "Ana Operadora", role: "OPERATOR" },
        mfaSetupRequired: false,
      });
    }
    if (path.endsWith("/cameras")) return body([camera]);
    if (path.endsWith("/zones")) return body([{ id: 1, name: "Zona amarilla", polygon: [] }]);
    if (path.endsWith("/reports")) return body({ content: [report], page: { totalElements: 1 } });
    if (path.endsWith(`/reports/${report.id}`) && route.request().method() === "PATCH") {
      reviews.push(route.request().postDataJSON());
      return body({ ...report, status: "CONFIRMED" });
    }
    if (path.endsWith(`/reports/${report.id}`)) {
      return body({ report, zone: { id: 1, name: "Zona amarilla" }, evidenceUrls: {} });
    }
    return body({}, 404);
  });
}

test("el operador ve la cámara en el mapa y confirma un reporte en tres clics", async ({
  page,
}) => {
  const reviews: unknown[] = [];
  await mockBackend(page, reviews);
  await page.goto("/");
  await page.getByLabel("Usuario").fill("ana");
  await page.getByLabel("Contraseña").fill("Operadora-2026");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("heading", { name: "Cámaras de vigilancia" })).toBeVisible();
  await expect(page.getByText("Con reporte activo").first()).toBeVisible();

  await page.getByRole("link", { name: "Reportes" }).click();
  await page.getByRole("button", { name: /2026/ }).click();
  await page.getByRole("button", { name: /Confirmar/ }).click();
  await expect.poll(() => reviews).toEqual([{ status: "CONFIRMED" }]);
});

test("el administrador debe ingresar el código del segundo factor", async ({ page }) => {
  await mockBackend(page, []);
  await page.goto("/");
  await page.getByLabel("Usuario").fill("admin");
  await page.getByLabel("Contraseña").fill("Maqueta-Demo-2026");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByLabel("Código de su aplicación de autenticación")).toBeVisible();
});
