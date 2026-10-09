import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getBlob, getJson, sendJson } from "../api/client";
import type { CameraView, DismissalReason, ReportDetail } from "../api/types";
import { DISMISSAL_REASON, VEHICLE, dateTime, duration, secondsBetween } from "../labels";
import { ReportStatusBadge } from "./StatusBadge";

const PHOTOS = [
  ["entry", "Al entrar a la zona"],
  ["report", "Al cumplirse la tolerancia"],
  ["plate", "Placa ampliada"],
] as const;

/** Foto de evidencia descargada con la sesión (las fotos nunca son públicas). */
function EvidencePhoto({ path, alt }: { path: string | undefined; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) {
      return undefined;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(path)
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return url ? <img src={url} alt={alt} /> : <div className="muted">{alt}: cargando…</div>;
}

/**
 * Detalle del reporte con su evidencia y revisión (RF-3.2, RF-3.3): confirmar o descartar con
 * motivo en máximo 3 clics (RNF-1.1). El descarte alimenta el reentrenamiento (PB-16).
 */
export function ReportDetailPanel({ reportId }: { reportId: string }) {
  const queries = useQueryClient();
  const [reason, setReason] = useState<DismissalReason>("FALSE_POSITIVE");
  const detail = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getJson<ReportDetail>(`/api/v1/reports/${reportId}`),
  });
  const cameras = useQuery({
    queryKey: ["cameras"],
    queryFn: () => getJson<CameraView[]>("/api/v1/cameras"),
  });
  const review = useMutation({
    mutationFn: (body: { status: string; dismissalReason?: DismissalReason }) =>
      sendJson("PATCH", `/api/v1/reports/${reportId}`, body),
    onSuccess: () => {
      void queries.invalidateQueries({ queryKey: ["reports"] });
      void queries.invalidateQueries({ queryKey: ["report", reportId] });
    },
  });

  if (detail.isLoading) return <p className="panel">Cargando reporte…</p>;
  if (detail.isError) return <p className="panel error">{detail.error.message}</p>;
  const report = detail.data?.report ?? {};
  const camera = cameras.data?.find((c) => c.id === report.cameraId);
  const isNew = report.status === "NEW";
  return (
    <article className="panel" aria-labelledby="detail-title">
      <h2 id="detail-title">
        {VEHICLE[report.vehicleType ?? ""] ?? "Vehículo"} {report.plate ?? "(placa por confirmar)"}{" "}
        <ReportStatusBadge status={report.status} />
      </h2>
      <p>
        {detail.data?.zone?.name} · {camera?.name} · {dateTime(report.generatedAt)}
      </p>
      <p className="muted">
        Detenido{" "}
        {duration(report.totalSeconds ?? secondsBetween(report.enteredAt, report.generatedAt))} ·
        confianza del modelo {Math.round((report.detectionConfidence ?? 0) * 100)} % · placa{" "}
        {Math.round((report.plateConfidence ?? 0) * 100)} % · modelo {report.modelVersion}
      </p>
      <p className="muted">
        Ubicación: {camera?.address} ({camera?.location?.latitude?.toFixed(5)},{" "}
        {camera?.location?.longitude?.toFixed(5)})
      </p>
      <div className="photos">
        {PHOTOS.map(([kind, alt]) => (
          <figure key={kind}>
            <EvidencePhoto path={detail.data?.evidenceUrls?.[kind]} alt={alt} />
            <figcaption className="muted">{alt}</figcaption>
          </figure>
        ))}
      </div>
      {report.status === "DISMISSED" && (
        <p>Motivo: {DISMISSAL_REASON[report.dismissalReason ?? "FALSE_POSITIVE"]}</p>
      )}
      {isNew && (
        <div className="row">
          <button
            className="primary"
            disabled={review.isPending}
            onClick={() => review.mutate({ status: "CONFIRMED" })}
          >
            ✔ Confirmar
          </button>
          <label>
            Motivo del descarte
            <select value={reason} onChange={(e) => setReason(e.target.value as DismissalReason)}>
              {(Object.keys(DISMISSAL_REASON) as DismissalReason[]).map((key) => (
                <option key={key} value={key}>
                  {DISMISSAL_REASON[key]}
                </option>
              ))}
            </select>
          </label>
          <button
            className="danger"
            disabled={review.isPending}
            onClick={() => review.mutate({ status: "DISMISSED", dismissalReason: reason })}
          >
            ✕ Descartar
          </button>
        </div>
      )}
      {review.isError && <p className="error">{review.error.message}</p>}
    </article>
  );
}
