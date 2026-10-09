import { useState } from "react";
import type { FormEvent } from "react";
import { sendJson } from "../api/client";
import type { LoginResponse, MfaEnrollment } from "../api/types";
import { useSession } from "../auth/session";

/**
 * Registro del segundo factor del administrador (RNF-4.1): el secreto se agrega a una aplicación
 * de autenticación (código QR desde el enlace otpauth o copiando el secreto) y se confirma con un
 * código. Hasta entonces el administrador solo tiene permisos de operador.
 */
export function MfaSetupPage() {
  const { accept } = useSession();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      setEnrollment(await sendJson<MfaEnrollment>("POST", "/api/v1/auth/mfa/setup"));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    try {
      accept(await sendJson<LoginResponse>("POST", "/api/v1/auth/mfa/activate", { code }));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <section className="panel" aria-labelledby="mfa-title">
      <h1 id="mfa-title">Segundo factor del administrador</h1>
      <p>Las funciones de administración se habilitan al activar el segundo factor.</p>
      {!enrollment && <button onClick={start}>Generar secreto</button>}
      {enrollment && (
        <form className="row" onSubmit={activate}>
          <p>
            Secreto: <code>{enrollment.secret}</code> ·{" "}
            <a href={enrollment.otpauthUri}>Abrir en la aplicación</a>
          </p>
          <label>
            Código de 6 dígitos
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              pattern="[0-9]{6}"
              required
            />
          </label>
          <button className="primary" type="submit">
            Activar
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
