import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CAMERA, REPORT, ZONES, mockApi, renderPage } from "../test/utils";
import { ReportsPage, filterQuery } from "./ReportsPage";

describe("reportes", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:foto");
  });

  it("arma los filtros por fecha, zona y estado", () => {
    expect(filterQuery({ from: "", to: "", zoneId: "", status: "" })).toBe("");
    const query = new URLSearchParams(
      filterQuery({ from: "2026-10-01", to: "2026-10-05", zoneId: "1", status: "NEW" }),
    );
    expect(query.get("zoneId")).toBe("1");
    expect(query.get("status")).toBe("NEW");
    expect(query.get("from")).toMatch(/^2026-10-01T/);
  });

  it("lista, muestra la evidencia y confirma en tres clics", async () => {
    const calls = mockApi({
      "GET /api/v1/reports": { content: [REPORT], page: { totalElements: 1 } },
      "GET /api/v1/cameras": [CAMERA],
      "GET /api/v1/cameras/CAM-MAQ-01/zones": ZONES,
      "GET /api/v1/reports/r1": {
        report: REPORT,
        zone: { id: 1, name: "Zona amarilla" },
        evidenceUrls: {
          entry: "/api/v1/reports/r1/evidence/entry",
          report: "/api/v1/reports/r1/evidence/report",
          plate: "/api/v1/reports/r1/evidence/plate",
        },
      },
      "GET /api/v1/reports/r1/evidence/entry": new Response("jpg"),
      "GET /api/v1/reports/r1/evidence/report": new Response("jpg"),
      "GET /api/v1/reports/r1/evidence/plate": new Response("jpg"),
      "PATCH /api/v1/reports/r1": { ...REPORT, status: "CONFIRMED" },
    });
    renderPage(<ReportsPage />, "/reportes", "/reportes/:reportId?");
    await userEvent.click(await screen.findByRole("button", { name: /2026/ }));
    expect(await screen.findByText(/confianza del modelo 94/)).toBeInTheDocument();
    expect(await screen.findByAltText("Placa ampliada")).toHaveAttribute("src", "blob:foto");
    expect(screen.getByText("Zona amarilla", { selector: "td" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirmar/ }));
    await waitFor(() => expect(calls.some((c) => c.key === "PATCH /api/v1/reports/r1")).toBe(true));
    const patch = calls.find((c) => c.key === "PATCH /api/v1/reports/r1");
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ status: "CONFIRMED" });
  });

  it("descarta con motivo y exporta a PDF", async () => {
    const calls = mockApi({
      "GET /api/v1/reports": { content: [REPORT], page: { totalElements: 1 } },
      "GET /api/v1/cameras": [CAMERA],
      "GET /api/v1/cameras/CAM-MAQ-01/zones": ZONES,
      "GET /api/v1/reports/r1": {
        report: REPORT,
        zone: { id: 1, name: "Zona amarilla" },
        evidenceUrls: {},
      },
      "PATCH /api/v1/reports/r1": { ...REPORT, status: "DISMISSED" },
      "GET /api/v1/reports/export": new Response("%PDF"),
    });
    renderPage(<ReportsPage />, "/reportes/r1", "/reportes/:reportId?");
    await userEvent.selectOptions(
      await screen.findByLabelText("Motivo del descarte"),
      "PLATE_MISREAD",
    );
    await userEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    await waitFor(() => expect(calls.some((c) => c.key === "PATCH /api/v1/reports/r1")).toBe(true));
    const patch = calls.find((c) => c.key === "PATCH /api/v1/reports/r1");
    expect(JSON.parse(String(patch?.init?.body))).toEqual({
      status: "DISMISSED",
      dismissalReason: "PLATE_MISREAD",
    });
    await userEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));
    await waitFor(() =>
      expect(calls.some((c) => c.key === "GET /api/v1/reports/export")).toBe(true),
    );
  });
});
