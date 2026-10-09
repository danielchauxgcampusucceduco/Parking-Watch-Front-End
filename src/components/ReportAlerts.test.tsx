import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IMessage } from "@stomp/stompjs";
import { renderPage } from "../test/utils";
import { ReportAlerts } from "./ReportAlerts";

const handlers = new Map<string, (message: IMessage) => void>();
vi.mock("../realtime/realtime", async (original) => ({
  ...(await original<typeof import("../realtime/realtime")>()),
  useTopic: (destination: string | null, handler: (message: IMessage) => void) => {
    if (destination) handlers.set(destination, handler);
  },
}));

describe("aviso de reporte nuevo", () => {
  it("muestra el aviso con sonido al llegar por WebSocket", async () => {
    const start = vi.fn();
    vi.stubGlobal(
      "AudioContext",
      class {
        currentTime = 0;
        destination = {};
        createOscillator() {
          return { frequency: { value: 0 }, connect: () => {}, start, stop: () => {} };
        }
      },
    );
    renderPage(<ReportAlerts />);
    const message = {
      body: JSON.stringify({
        type: "report.created",
        payload: { id: "r9", plate: "XYZ987", vehicleType: "MOTORCYCLE", cameraId: "CAM-MAQ-01" },
      }),
    } as IMessage;
    act(() => handlers.get("/topic/reports")!(message));
    expect(await screen.findByRole("alert")).toHaveTextContent("Moto XYZ987 en CAM-MAQ-01");
    expect(start).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
