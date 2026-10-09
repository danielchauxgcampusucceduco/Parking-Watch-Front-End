import type { DetectionSnapshot, ZoneView } from "../api/types";
import { drawOverlay, stoppedInZones, vehicleLabel } from "./overlay";

const detections: DetectionSnapshot = {
  capturedAt: "2026-10-05T15:00:00Z",
  vehicles: [
    {
      trackId: 1,
      vehicleType: "CAR",
      confidence: 0.94,
      zoneId: 1,
      stationarySeconds: 12,
      box: { x1: 10, y1: 30, x2: 50, y2: 60 },
    },
    {
      trackId: 2,
      vehicleType: "BUS",
      confidence: 0.8,
      stationarySeconds: 0,
      box: { x1: 0, y1: 0, x2: 5, y2: 5 },
    },
    {
      trackId: 3,
      vehicleType: "MOTORCYCLE",
      confidence: 0.7,
      zoneId: 2,
      stationarySeconds: 40,
      box: {},
    },
  ],
};

/** Lienzo falso que registra las llamadas de dibujo. */
function fakeContext() {
  const calls: string[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      calls.push(`${name}(${args.join(",")})`);
  const ctx = {
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    closePath: record("closePath"),
    fill: record("fill"),
    stroke: record("stroke"),
    strokeRect: record("strokeRect"),
    fillRect: record("fillRect"),
    fillText: record("fillText"),
    measureText: () => ({ width: 40 }),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("dibujo sobre el video", () => {
  it("etiqueta tipo, confianza y tiempo detenido", () => {
    expect(vehicleLabel(detections.vehicles![0]!)).toBe("Carro 94% · 12 s");
    expect(vehicleLabel(detections.vehicles![1]!)).toBe("Bus 80%");
  });

  it("lista los detenidos en zona, el de más tiempo primero", () => {
    expect(stoppedInZones(detections).map((v) => v.trackId)).toEqual([3, 1]);
    expect(stoppedInZones(null)).toEqual([]);
  });

  it("dibuja zonas escaladas y un recuadro por vehículo", () => {
    const { ctx, calls } = fakeContext();
    const zones: ZoneView[] = [
      {
        polygon: [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
          { x: 200, y: 200 },
        ],
      },
      { polygon: [{ x: 1, y: 1 }] },
    ];
    drawOverlay(ctx, zones, detections, 0.5);
    expect(calls).toContain("moveTo(50,50)");
    expect(calls.filter((c) => c.startsWith("fill()"))).toHaveLength(1);
    expect(calls).toContain("strokeRect(5,15,20,15)");
    expect(calls.filter((c) => c.startsWith("fillText"))).toHaveLength(3);
  });
});
