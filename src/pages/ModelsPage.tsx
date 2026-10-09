import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, request, sendJson } from "../api/client";
import type { ModelVersionView } from "../api/types";

const percent = (value: number | undefined) => `${Math.round((value ?? 0) * 1000) / 10} %`;

/**
 * Versiones del modelo (HU-5): solo se activa una versión que cumple las métricas mínimas; se puede
 * volver a la anterior. El Edge descarga y carga el modelo activo sin detener el video.
 */
export function ModelsPage() {
  const queries = useQueryClient();
  const models = useQuery({
    queryKey: ["models"],
    queryFn: () => getJson<ModelVersionView[]>("/api/v1/models"),
  });
  const refresh = () => void queries.invalidateQueries({ queryKey: ["models"] });
  const activate = useMutation({
    mutationFn: (version: string) => sendJson("POST", `/api/v1/models/${version}/activate`),
    onSuccess: refresh,
  });
  const rollback = useMutation({
    mutationFn: () => sendJson("POST", "/api/v1/models/rollback"),
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: ({
      version,
      artifact,
      file,
    }: {
      version: string;
      artifact: string;
      file: File;
    }) => {
      const form = new FormData();
      form.append("file", file);
      return request(`/api/v1/models/${version}/artifacts/${artifact}`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: refresh,
  });
  const error = activate.error ?? rollback.error ?? upload.error ?? models.error;

  return (
    <section aria-labelledby="models-title">
      <h1 id="models-title">Versiones del modelo</h1>
      <div className="row">
        <button onClick={() => rollback.mutate()}>Volver a la versión anterior</button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error.message}
        </p>
      )}
      <table className="panel">
        <thead>
          <tr>
            <th>Versión</th>
            <th>mAP@0,5</th>
            <th>Precisión</th>
            <th>Recall</th>
            <th>Placas</th>
            <th>Metas</th>
            <th>Archivos ONNX</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(models.data ?? []).map((model) => (
            <tr key={model.version}>
              <td>
                {model.version} {model.active && <span className="status ONLINE">● Activa</span>}
              </td>
              <td>{percent(model.metrics?.map50)}</td>
              <td>{percent(model.metrics?.precision)}</td>
              <td>{percent(model.metrics?.recall)}</td>
              <td>{percent(model.metrics?.plateAccuracy)}</td>
              <td>
                {model.qualityGate?.passed
                  ? "✔ Cumple"
                  : `✕ ${(model.qualityGate?.failures ?? []).join(", ")}`}
              </td>
              <td>
                {(["detector", "plate-reader"] as const).map((artifact) => (
                  <label key={artifact}>
                    {artifact === "detector" ? "Detector" : "Placas"}{" "}
                    {(artifact === "detector" ? model.detectorSha256 : model.plateReaderSha256)
                      ? "✔"
                      : "—"}
                    <input
                      type="file"
                      accept=".onnx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && model.version)
                          upload.mutate({ version: model.version, artifact, file });
                      }}
                    />
                  </label>
                ))}
              </td>
              <td>
                <button
                  disabled={model.active || !model.qualityGate?.passed}
                  onClick={() => model.version && activate.mutate(model.version)}
                >
                  Activar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
