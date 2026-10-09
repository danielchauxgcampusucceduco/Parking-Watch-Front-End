import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client";
import { useSession } from "../auth/session";

/** Inicio de sesión con usuario, contraseña y, para administradores, código TOTP (RF-5.1). */
export function LoginPage() {
  const { login } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password, needsOtp ? otp : undefined);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "MFA_REQUIRED") {
        setNeedsOtp(true);
      } else {
        setError(failure instanceof Error ? failure.message : "No se pudo iniciar sesión");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login panel" onSubmit={submit}>
      <h1>Oficina de Tránsito</h1>
      <p className="muted">Acceso solo para funcionarios autorizados.</p>
      <label>
        Usuario
        <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {needsOtp && (
        <label>
          Código de su aplicación de autenticación
          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            autoFocus
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={busy}>
        Ingresar
      </button>
    </form>
  );
}
