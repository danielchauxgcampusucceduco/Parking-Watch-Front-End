import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip } from "react-leaflet";
import { useNavigate } from "react-router";
import { getJson } from "../api/client";
import type { CameraStatus, CameraView } from "../api/types";
import { CameraStatusBadge } from "../components/StatusBadge";
import { CAMERA_STATUS } from "../labels";
import { useTopic } from "../realtime/realtime";

const COLOR: Record<CameraStatus, string> = {
  ONLINE: "#4ade80",
  OFFLINE: "#a3acb9",
  ACTIVE_REPORT: "#ff6b6b",
};

/** Mapa de cámaras con su estado (PB-01): clic en una cámara abre su imagen en vivo. */
export function MapPage() {
  const navigate = useNavigate();
  const queries = useQueryClient();
  const cameras = useQuery({
    queryKey: ["cameras"],
    queryFn: () => getJson<CameraView[]>("/api/v1/cameras"),
    refetchInterval: 30_000,
  });
  useTopic("/topic/cameras", () => void queries.invalidateQueries({ queryKey: ["cameras"] }));

  if (cameras.isError) {
    return <p className="error">No se pudieron cargar las cámaras: {cameras.error.message}</p>;
  }
  const list = cameras.data ?? [];
  const first = list[0]?.location;
  return (
    <section aria-labelledby="map-title">
      <h1 id="map-title">Cámaras de vigilancia</h1>
      <div className="grid-2">
        <MapContainer
          className="map"
          center={[first?.latitude ?? 4.60971, first?.longitude ?? -74.08175]}
          zoom={17}
          aria-label="Mapa de cámaras"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {list.map((camera) => {
            const status = camera.displayStatus ?? "OFFLINE";
            return (
              <CircleMarker
                key={camera.id}
                center={[camera.location?.latitude ?? 0, camera.location?.longitude ?? 0]}
                radius={12}
                pathOptions={{ color: COLOR[status], fillOpacity: 0.8 }}
                eventHandlers={{ click: () => navigate(`/camaras/${camera.id}`) }}
              >
                <Tooltip>
                  {CAMERA_STATUS[status].icon} {camera.name} · {CAMERA_STATUS[status].text}
                </Tooltip>
              </CircleMarker>
            );
          })}
          {list.map((camera) => (
            <Polygon
              key={`area-${camera.id}`}
              positions={(camera.coverageArea ?? []).map((p) => [
                p.latitude ?? 0,
                p.longitude ?? 0,
              ])}
              pathOptions={{ color: "#60a5fa", weight: 1 }}
            />
          ))}
        </MapContainer>
        <ul className="panel" aria-label="Lista de cámaras">
          {list.map((camera) => (
            <li key={camera.id}>
              <button onClick={() => navigate(`/camaras/${camera.id}`)}>{camera.name}</button>
              <div className="muted">{camera.address}</div>
              <CameraStatusBadge status={camera.displayStatus} />
            </li>
          ))}
          {cameras.isLoading && <li>Cargando…</li>}
        </ul>
      </div>
    </section>
  );
}
