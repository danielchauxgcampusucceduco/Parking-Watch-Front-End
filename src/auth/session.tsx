import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { sendJson, setAccessToken, setUnauthorizedHandler } from "../api/client";
import type { AuthenticatedUser, LoginResponse } from "../api/types";

/** Margen para renovar el JWT de corta duración antes de que venza. */
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

export interface Session {
  token: string;
  user: AuthenticatedUser;
  expiresAt: string;
  mfaSetupRequired: boolean;
}

interface SessionContextValue {
  session: Session | null;
  isAdministrator: boolean;
  login: (username: string, password: string, otp?: string) => Promise<void>;
  accept: (response: LoginResponse) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function toSession(response: LoginResponse): Session {
  return {
    token: response.accessToken ?? "",
    user: response.user ?? {},
    expiresAt: response.expiresAt ?? new Date().toISOString(),
    mfaSetupRequired: response.mfaSetupRequired ?? false,
  };
}

/**
 * Sesión del funcionario (PB-05): el JWT se guarda solo en memoria (RNF-3.1) y se renueva antes de
 * vencer; recargar la página exige iniciar sesión de nuevo.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const accept = useCallback((response: LoginResponse) => {
    const next = toSession(response);
    setAccessToken(next.token);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setSession(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string, otp?: string) => {
      accept(
        await sendJson<LoginResponse>("POST", "/api/v1/auth/login", { username, password, otp }),
      );
    },
    [accept],
  );

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }
    const wait = new Date(session.expiresAt).getTime() - Date.now() - REFRESH_MARGIN_MS;
    const timer = setTimeout(
      () => {
        sendJson<LoginResponse>("POST", "/api/v1/auth/refresh").then(accept, logout);
      },
      Math.max(wait, 1000),
    );
    return () => clearTimeout(timer);
  }, [session, accept, logout]);

  const value = useMemo(
    () => ({
      session,
      isAdministrator: session?.user.role === "ADMINISTRATOR" && !session.mfaSetupRequired,
      login,
      accept,
      logout,
    }),
    [session, login, accept, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession debe usarse dentro de SessionProvider");
  }
  return value;
}
