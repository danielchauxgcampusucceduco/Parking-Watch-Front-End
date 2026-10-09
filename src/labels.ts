import type { CameraStatus, DismissalReason, ReportStatus, ZoneType } from "./api/types";

export const VEHICLE: Record<string, string> = {
  CAR: "Carro",
  MOTORCYCLE: "Moto",
  BUS: "Bus",
  TRUCK: "Camión",
};

export const ZONE_TYPE: Record<ZoneType, string> = {
  SIDEWALK: "Andén",
  CORNER: "Esquina",
  GARAGE_ENTRANCE: "Garaje",
  YELLOW_ZONE: "Zona amarilla",
  TRAFFIC_LANE: "Carril",
};

export const REPORT_STATUS: Record<ReportStatus, string> = {
  NEW: "Nuevo",
  CONFIRMED: "Confirmado",
  DISMISSED: "Descartado",
};

export const DISMISSAL_REASON: Record<DismissalReason, string> = {
  FALSE_POSITIVE: "Falso positivo",
  MOMENTARY_STOP: "Detención momentánea",
  EMERGENCY_VEHICLE: "Vehículo de emergencia",
  PLATE_MISREAD: "Placa mal leída",
};

/** Estado de la cámara con texto e ícono, además del color (RF-1.2, RNF-1.2). */
export const CAMERA_STATUS: Record<CameraStatus, { text: string; icon: string }> = {
  ONLINE: { text: "En línea", icon: "●" },
  OFFLINE: { text: "Sin conexión", icon: "○" },
  ACTIVE_REPORT: { text: "Con reporte activo", icon: "▲" },
};

/** Duración legible: "45 s", "2 min", "1 h 5 min". */
export function duration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) {
    return `${total} s`;
  }
  const minutes = Math.floor(total / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

/** Lenguaje claro: "Carro ABC123 lleva 2 min en zona amarilla". */
export function stayMessage(
  vehicleType: string,
  plate: string | undefined,
  seconds: number,
  zoneName: string,
): string {
  const vehicle = VEHICLE[vehicleType] ?? "Vehículo";
  const who = plate ? `${vehicle} ${plate}` : vehicle;
  return `${who} lleva ${duration(seconds)} en ${zoneName.toLowerCase()}`;
}

/** Segundos entre dos fechas ISO (0 si falta alguna). */
export function secondsBetween(from: string | undefined, to: string | undefined): number {
  return from && to ? (new Date(to).getTime() - new Date(from).getTime()) / 1000 : 0;
}

/** Fecha y hora local de Colombia. */
export function dateTime(iso: string | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota" });
}
