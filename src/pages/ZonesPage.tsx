import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { getJson, sendJson } from "../api/client";
import type { CameraView, ZoneDraft, ZoneType, ZoneView } from "../api/types";
import { ZONE_TYPE } from "../labels";
import { drawOverlay } from "../live/overlay";
import { useTopic } from "../realtime/realtime";

const CANVAS_WIDTH = 960;
type Point = { x: number; y: number };

/** Convierte un clic en el lienzo a píxeles de la imagen original de la cámara. */
export function toImagePoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  imageWidth: number,
): Point {
  const scale = imageWidth / rect.width;
  return {
    x: Math.round((clientX - rect.left) * scale),
    y: Math.round((clientY - rect.top) * scale),
  };
}

/**
 * Zonas no autorizadas (PB-04): el administrador dibuja polígonos sobre una captura de la cámara,
 * con nombre, tipo, tolerancia y señalización; solo las señalizadas generan reportes. Al guardar,
 * el backend envía el cambio al Edge sin reiniciarlo (HU-4).
 */
export function ZonesPage() {
  const queries = useQueryClient();
  const canvas = useRef<HTMLCanvasElement>(null);
  const capture = useRef<ImageBitmap | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [drafts, setDrafts] = useState<ZoneDraft[] | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const cameras = useQuery({
    queryKey: ["cameras"],
    queryFn: () => getJson<CameraView[]>("/api/v1/cameras"),
  });
  const camera = cameras.data?.[0];
  const cameraId = camera?.id ?? "";
  const width = camera?.frame?.width ?? 1280;
  const height = camera?.frame?.height ?? 720;
  const scale = CANVAS_WIDTH / width;
  const zones = useQuery({
    queryKey: ["zones", cameraId],
    queryFn: () => getJson<ZoneView[]>(`/api/v1/cameras/${cameraId}/zones`),
    enabled: Boolean(cameraId),
  });
  const current = useMemo(
    () => drafts ?? (zones.data as ZoneDraft[] | undefined) ?? [],
    [drafts, zones.data],
  );
  const save = useMutation({
    mutationFn: () => sendJson("PUT", `/api/v1/cameras/${cameraId}/zones`, { zones: current }),
    onSuccess: () => {
      setDrafts(null);
      void queries.invalidateQueries({ queryKey: ["zones", cameraId] });
    },
  });

  useTopic(cameraId && !frozen ? `/topic/cameras/${cameraId}/video` : null, (message) => {
    void createImageBitmap(new Blob([message.binaryBody as BlobPart], { type: "image/jpeg" })).then(
      (bitmap) => {
        capture.current = bitmap;
        setFrozen(true);
      },
    );
  });

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, height * scale);
    if (capture.current) ctx.drawImage(capture.current, 0, 0, CANVAS_WIDTH, height * scale);
    drawOverlay(ctx, [...current, { polygon: points }] as ZoneView[], null, scale);
  }, [current, points, frozen, height, scale]);

  function addPoint(event: MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPoints([...points, toImagePoint(event.clientX, event.clientY, rect, width)]);
  }

  function closePolygon() {
    const name = `Zona ${current.length + 1}`;
    setDrafts([
      ...current,
      { name, zoneType: "YELLOW_ZONE", polygon: points, toleranceSeconds: 60, signaled: false },
    ]);
    setPoints([]);
  }

  function update(index: number, change: Partial<ZoneDraft>) {
    setDrafts(current.map((zone, i) => (i === index ? { ...zone, ...change } : zone)));
  }

  return (
    <section aria-labelledby="zones-title">
      <h1 id="zones-title">Zonas no autorizadas · {camera?.name}</h1>
      <p className="muted">
        Haga clic sobre la imagen para marcar los vértices y luego «Cerrar polígono».{" "}
        {!frozen && "Esperando una captura de la cámara…"}
      </p>
      <div className="video-wrap">
        <canvas
          ref={canvas}
          width={CANVAS_WIDTH}
          height={Math.round(height * scale)}
          onClick={addPoint}
          aria-label="Captura de la cámara para dibujar zonas"
        />
      </div>
      <div className="row">
        <button onClick={closePolygon} disabled={points.length < 3}>
          Cerrar polígono ({points.length} puntos)
        </button>
        <button onClick={() => setPoints([])} disabled={points.length === 0}>
          Borrar puntos
        </button>
        <button onClick={() => setFrozen(false)}>Nueva captura</button>
      </div>
      <table className="panel">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Tolerancia (s)</th>
            <th>Señalizada</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {current.map((zone, index) => (
            <tr key={zone.id ?? `nueva-${index}`}>
              <td>
                <input
                  aria-label="Nombre"
                  value={zone.name ?? ""}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </td>
              <td>
                <select
                  aria-label="Tipo"
                  value={zone.zoneType}
                  onChange={(e) => update(index, { zoneType: e.target.value as ZoneType })}
                >
                  {(Object.keys(ZONE_TYPE) as ZoneType[]).map((type) => (
                    <option key={type} value={type}>
                      {ZONE_TYPE[type]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  aria-label="Tolerancia"
                  type="number"
                  min={1}
                  max={3600}
                  value={zone.toleranceSeconds ?? 60}
                  onChange={(e) => update(index, { toleranceSeconds: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  aria-label="Señalizada"
                  type="checkbox"
                  checked={zone.signaled ?? false}
                  onChange={(e) => update(index, { signaled: e.target.checked })}
                />
              </td>
              <td>
                <button onClick={() => setDrafts(current.filter((_, i) => i !== index))}>
                  Quitar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button
          className="primary"
          disabled={!drafts || save.isPending}
          onClick={() => save.mutate()}
        >
          Guardar zonas
        </button>
        {save.isSuccess && <span className="status ONLINE">✔ Guardadas y enviadas al Edge</span>}
        {save.isError && <span className="error">{save.error.message}</span>}
      </div>
    </section>
  );
}
