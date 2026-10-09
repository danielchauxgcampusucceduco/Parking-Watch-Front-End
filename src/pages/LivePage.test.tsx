import { act, screen } from "@testing-library/react";
import type { IMessage } from "@stomp/stompjs";
import { CAMERA, ZONES, mockApi, renderPage } from "../test/utils";
import { LivePage } from "./LivePage";

const handlers = new Map<string, (message: IMessage) => void>();
vi.mock("../realtime/realtime", async (original) => ({
  ...(await original<typeof import("../realtime/realtime")>()),
  useTopic: (destination: string | null, handler: (message: IMessage) => void) => {
    if (destination) handlers.set(destination, handler);
  },
}));

describe("imagen en vivo", () => {
  it("muestra indicadores, vehículos detenidos y el aviso sin conexión", async () => {
    mockApi({
      "GET /api/v1/cameras/CAM-MAQ-01": CAMERA,
      "GET /api/v1/cameras/CAM-MAQ-01/zones": ZONES,
      "GET /api/v1/cameras/CAM-MAQ-01/live": {
        connected: false,
        lastSignalAt: "2026-10-05T15:00:00Z",
        analytics: {
          fps: 12.5,
          oneMinute: {
            vehiclesDetected: 4,
            reportsGenerated: 1,
            zoneOccupancy: [{ zoneId: 1, occupancyPct: 50 }],
          },
        },
      },
    });
    renderPage(<LivePage />, "/camaras/CAM-MAQ-01", "/camaras/:cameraId");
    expect(
      await screen.findByRole("heading", { name: /Cámara de la maqueta/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("12.5")).toBeInTheDocument();
    expect(screen.getByText("Zona amarilla: 50 %")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión");

    const detections = {
      vehicles: [
        {
          trackId: 41,
          vehicleType: "CAR",
          confidence: 0.9,
          zoneId: 1,
          stationarySeconds: 125,
          box: {},
        },
      ],
    };
    act(() =>
      handlers.get("/topic/cameras/CAM-MAQ-01/detections")!({
        body: JSON.stringify(detections),
      } as IMessage),
    );
    expect(await screen.findByText(/Carro lleva 2 min en zona amarilla/)).toBeInTheDocument();
    act(() =>
      handlers.get("/topic/cameras/CAM-MAQ-01/analytics")!({
        body: JSON.stringify({ fps: 9, oneMinute: { vehiclesDetected: 7, zoneOccupancy: [] } }),
      } as IMessage),
    );
    expect(await screen.findByText("7")).toBeInTheDocument();
  });
});
