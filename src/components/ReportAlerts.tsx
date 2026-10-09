import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { json, useTopic } from "../realtime/realtime";
import { VEHICLE } from "../labels";

interface ReportEvent {
  type: string;
  payload: { id: string; plate?: string; vehicleType?: string; cameraId?: string };
}

/** Tono corto con Web Audio (sin archivos de sonido). */
export function beep(): void {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) {
    return;
  }
  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  oscillator.frequency.value = 880;
  oscillator.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.35);
}

/** Aviso en pantalla y con sonido al llegar un reporte nuevo por WebSocket (RF-3.4). */
export function ReportAlerts() {
  const [latest, setLatest] = useState<ReportEvent["payload"] | null>(null);
  const queries = useQueryClient();
  useTopic("/topic/reports", (message) => {
    const event = json<ReportEvent>(message);
    void queries.invalidateQueries({ queryKey: ["reports"] });
    void queries.invalidateQueries({ queryKey: ["cameras"] });
    if (event.type === "report.created") {
      setLatest(event.payload);
      beep();
    }
  });
  if (!latest) {
    return null;
  }
  const vehicle = VEHICLE[latest.vehicleType ?? ""] ?? "Vehículo";
  return (
    <div className="toast" role="alert">
      <strong>▲ Reporte nuevo</strong>
      <p>
        {vehicle} {latest.plate ?? "sin placa"} en {latest.cameraId}
      </p>
      <div className="row">
        <Link to={`/reportes/${latest.id}`} onClick={() => setLatest(null)}>
          Revisar
        </Link>
        <button onClick={() => setLatest(null)}>Cerrar</button>
      </div>
    </div>
  );
}
