import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getBlob, getJson } from "../api/client";
import type { CameraView, ReportPage, ReportStatus, ZoneView } from "../api/types";
import { ReportDetailPanel } from "../components/ReportDetailPanel";
import { ReportStatusBadge } from "../components/StatusBadge";
import { REPORT_STATUS, VEHICLE, dateTime, duration, secondsBetween } from "../labels";

export interface ReportFilters {
  from: string;
  to: string;
  zoneId: string;
  status: string;
}

/** Parámetros de consulta de los filtros (fechas locales a ISO). */
export function filterQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) params.set("to", new Date(`${filters.to}T23:59:59`).toISOString());
  if (filters.zoneId) params.set("zoneId", filters.zoneId);
  if (filters.status) params.set("status", filters.status);
  return params.toString();
}

/** Descarga un archivo del backend con un nombre dado. */
async function download(path: string, filename: string) {
  const url = URL.createObjectURL(await getBlob(path));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Reportes de parqueo no autorizado con filtros, detalle, revisión y exportación (PB-03). */
export function ReportsPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilters>({
    from: "",
    to: "",
    zoneId: "",
    status: "",
  });
  const query = filterQuery(filters);
  const reports = useQuery({
    queryKey: ["reports", query],
    queryFn: () => getJson<ReportPage>(`/api/v1/reports?size=100&${query}`),
  });
  const zones = useQuery({
    queryKey: ["all-zones"],
    queryFn: async () => {
      const cameras = await getJson<CameraView[]>("/api/v1/cameras");
      const lists = await Promise.all(
        cameras.map((c) => getJson<ZoneView[]>(`/api/v1/cameras/${c.id}/zones`)),
      );
      return lists.flat();
    },
  });
  const zoneName = (id: number | undefined) =>
    zones.data?.find((zone) => zone.id === id)?.name ?? `Zona ${id}`;
  const set = (key: keyof ReportFilters) => (value: string) =>
    setFilters({ ...filters, [key]: value });

  return (
    <section aria-labelledby="reports-title">
      <h1 id="reports-title">Reportes de parqueo no autorizado</h1>
      <div className="panel row" role="search">
        <label>
          Desde
          <input type="date" value={filters.from} onChange={(e) => set("from")(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={filters.to} onChange={(e) => set("to")(e.target.value)} />
        </label>
        <label>
          Zona
          <select value={filters.zoneId} onChange={(e) => set("zoneId")(e.target.value)}>
            <option value="">Todas</option>
            {(zones.data ?? []).map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={filters.status} onChange={(e) => set("status")(e.target.value)}>
            <option value="">Todos</option>
            {(Object.keys(REPORT_STATUS) as ReportStatus[]).map((status) => (
              <option key={status} value={status}>
                {REPORT_STATUS[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => download(`/api/v1/reports/export?format=PDF&${query}`, "reportes.pdf")}
        >
          Descargar PDF
        </button>
        <button
          onClick={() => download(`/api/v1/reports/export?format=XLSX&${query}`, "reportes.xlsx")}
        >
          Descargar Excel
        </button>
      </div>
      <div className="grid-2">
        <div className="panel">
          {reports.isError && <p className="error">{reports.error.message}</p>}
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Cámara</th>
                <th>Zona</th>
                <th>Vehículo</th>
                <th>Placa</th>
                <th>Tiempo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(reports.data?.content ?? []).map((report) => (
                <tr key={report.id} className={report.id === reportId ? "selected" : undefined}>
                  <td>
                    <button onClick={() => navigate(`/reportes/${report.id}`)}>
                      {dateTime(report.generatedAt)}
                    </button>
                  </td>
                  <td>{report.cameraId}</td>
                  <td>{zoneName(report.zoneId)}</td>
                  <td>{VEHICLE[report.vehicleType ?? ""] ?? report.vehicleType}</td>
                  <td>{report.plate ?? "Por confirmar"}</td>
                  <td>
                    {duration(
                      report.totalSeconds ?? secondsBetween(report.enteredAt, report.generatedAt),
                    )}
                  </td>
                  <td>
                    <ReportStatusBadge status={report.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.data?.content?.length === 0 && (
            <p className="muted">No hay reportes con estos filtros.</p>
          )}
        </div>
        {reportId ? (
          <ReportDetailPanel reportId={reportId} />
        ) : (
          <p className="panel muted">Seleccione un reporte.</p>
        )}
      </div>
    </section>
  );
}
