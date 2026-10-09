import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { getJson } from "../api/client";
import type {
  AnalyticsSnapshot,
  CameraView,
  DetectionSnapshot,
  LiveView,
  ZoneView,
} from "../api/types";
import { CameraStatusBadge } from "../components/StatusBadge";
import { dateTime, stayMessage } from "../labels";
import { drawOverlay, stoppedInZones } from "../live/overlay";
import { json, useTopic } from "../realtime/realtime";

const CANVAS_WIDTH = 960;
/** Sin fotogramas durante este tiempo la vista muestra "Sin conexión" (HU-2). */
const STALE_MS = 5000;

/** Imagen en vivo con zonas, detecciones, indicadores y vehículos detenidos (PB-02). */
export function LivePage() {
  const { cameraId = "" } = useParams();
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<ImageBitmap | null>(null);
  const [detections, setDetections] = useState<DetectionSnapshot | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const camera = useQuery({
    queryKey: ["camera", cameraId],
    queryFn: () => getJson<CameraView>(`/api/v1/cameras/${cameraId}`),
  });
  const zones = useQuery({
    queryKey: ["zones", cameraId],
    queryFn: () => getJson<ZoneView[]>(`/api/v1/cameras/${cameraId}/zones`),
  });
  const live = useQuery({
    queryKey: ["live", cameraId],
    queryFn: () => getJson<LiveView>(`/api/v1/cameras/${cameraId}/live`),
  });

  useTopic(`/topic/cameras/${cameraId}/video`, (message) => {
    void createImageBitmap(new Blob([message.binaryBody as BlobPart], { type: "image/jpeg" })).then(
      (bitmap) => {
        frame.current?.close();
        frame.current = bitmap;
        setLastFrameAt(Date.now());
      },
    );
  });
  useTopic(`/topic/cameras/${cameraId}/detections`, (m) => setDetections(json(m)));
  useTopic(`/topic/cameras/${cameraId}/analytics`, (m) => setAnalytics(json(m)));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const width = camera.data?.frame?.width ?? 1280;
  const height = camera.data?.frame?.height ?? 720;
  const scale = CANVAS_WIDTH / width;
  const currentDetections = detections ?? live.data?.detections ?? null;
  const currentAnalytics = analytics ?? live.data?.analytics ?? null;

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, CANVAS_WIDTH, height * scale);
    if (frame.current) {
      ctx.drawImage(frame.current, 0, 0, CANVAS_WIDTH, height * scale);
    }
    drawOverlay(ctx, zones.data ?? [], currentDetections, scale);
  }, [lastFrameAt, currentDetections, zones.data, height, scale]);

  const offline = lastFrameAt === null || now - lastFrameAt > STALE_MS;
  const zoneName = (id: number | undefined) =>
    zones.data?.find((zone) => zone.id === id)?.name ?? "zona no autorizada";
  const minute = currentAnalytics?.oneMinute;

  return (
    <section aria-labelledby="live-title">
      <h1 id="live-title">
        {camera.data?.name ?? cameraId} <CameraStatusBadge status={camera.data?.displayStatus} />
      </h1>
      <div className="grid-2">
        <div className="video-wrap">
          <canvas
            ref={canvas}
            width={CANVAS_WIDTH}
            height={Math.round(height * scale)}
            role="img"
            aria-label="Imagen en vivo con zonas no autorizadas y vehículos detectados"
          />
          {offline && (
            <div className="offline-banner" role="status">
              ○ Sin conexión · última imagen:{" "}
              {lastFrameAt
                ? new Date(lastFrameAt).toLocaleTimeString("es-CO")
                : dateTime(live.data?.lastSignalAt)}
            </div>
          )}
        </div>
        <aside className="panel">
          <h2>Indicadores (último minuto)</h2>
          <div className="kpis">
            <div className="kpi">
              <strong>{minute?.vehiclesDetected ?? 0}</strong>vehículos
            </div>
            <div className="kpi">
              <strong>{minute?.reportsGenerated ?? 0}</strong>reportes
            </div>
            <div className="kpi">
              <strong>{(currentAnalytics?.fps ?? 0).toFixed(1)}</strong>fps
            </div>
          </div>
          <h3>Ocupación por zona</h3>
          <ul>
            {(minute?.zoneOccupancy ?? []).map((zone) => (
              <li key={zone.zoneId}>
                {zoneName(zone.zoneId)}: {Math.round(zone.occupancyPct ?? 0)} %
              </li>
            ))}
          </ul>
          <h2>Detenidos en zona no autorizada</h2>
          <ul aria-live="polite">
            {stoppedInZones(currentDetections).map((vehicle) => (
              <li key={vehicle.trackId} className="status ACTIVE_REPORT">
                ▲{" "}
                {stayMessage(
                  vehicle.vehicleType ?? "",
                  undefined,
                  vehicle.stationarySeconds ?? 0,
                  zoneName(vehicle.zoneId),
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
