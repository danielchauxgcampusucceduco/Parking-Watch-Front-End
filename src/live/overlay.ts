import type { DetectionSnapshot, ZoneView } from "../api/types";
import { VEHICLE, duration } from "../labels";

type Vehicle = NonNullable<DetectionSnapshot["vehicles"]>[number];

/** Texto del recuadro de un vehículo: tipo, confianza y tiempo detenido (RF-2.2). */
export function vehicleLabel(vehicle: Vehicle): string {
  const type = VEHICLE[vehicle.vehicleType ?? ""] ?? "Vehículo";
  const confidence = Math.round((vehicle.confidence ?? 0) * 100);
  const stopped = vehicle.stationarySeconds ? ` · ${duration(vehicle.stationarySeconds)}` : "";
  return `${type} ${confidence}%${stopped}`;
}

/** Vehículos detenidos dentro de una zona no autorizada, el que más tiempo lleva primero. */
export function stoppedInZones(detections: DetectionSnapshot | null): Vehicle[] {
  return (detections?.vehicles ?? [])
    .filter((v) => v.zoneId != null && (v.stationarySeconds ?? 0) > 0)
    .sort((a, b) => (b.stationarySeconds ?? 0) - (a.stationarySeconds ?? 0));
}

/**
 * Dibuja sobre el video las zonas no autorizadas (polígonos rojos semitransparentes) y un recuadro
 * por vehículo. Las coordenadas llegan en píxeles de la imagen original (1280 x 720); {@code
 * scale} las lleva al tamaño del lienzo.
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  zones: ZoneView[],
  detections: DetectionSnapshot | null,
  scale: number,
): void {
  ctx.lineWidth = 2;
  for (const zone of zones) {
    const points = zone.polygon ?? [];
    if (points.length < 3) {
      continue;
    }
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = (p.x ?? 0) * scale;
      const y = (p.y ?? 0) * scale;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 60, 60, 0.25)";
    ctx.strokeStyle = "rgba(255, 90, 90, 0.9)";
    ctx.fill();
    ctx.stroke();
  }
  ctx.font = "bold 14px system-ui";
  for (const vehicle of detections?.vehicles ?? []) {
    const box = vehicle.box ?? {};
    const x = (box.x1 ?? 0) * scale;
    const y = (box.y1 ?? 0) * scale;
    const inZone = vehicle.zoneId != null;
    ctx.strokeStyle = inZone ? "#ff6b6b" : "#4ade80";
    ctx.strokeRect(
      x,
      y,
      ((box.x2 ?? 0) - (box.x1 ?? 0)) * scale,
      ((box.y2 ?? 0) - (box.y1 ?? 0)) * scale,
    );
    const label = vehicleLabel(vehicle);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x, Math.max(0, y - 20), ctx.measureText(label).width + 8, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + 4, Math.max(14, y - 5));
  }
}
