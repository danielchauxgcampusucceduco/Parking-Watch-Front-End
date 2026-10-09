import { Client } from "@stomp/stompjs";
import type { IMessage } from "@stomp/stompjs";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { WS_URL } from "../config";

interface RealtimeValue {
  client: Client | null;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeValue>({ client: null, connected: false });

/**
 * Conexión WebSocket STOMP con el backend (RF-8.2): el JWT viaja en el CONNECT. Si se cae, se
 * reconecta cada 3 s; al renovar la sesión se reconecta con el token nuevo.
 */
export function RealtimeProvider({ token, children }: { token: string; children: ReactNode }) {
  const [state, setState] = useState<RealtimeValue>({ client: null, connected: false });

  useEffect(() => {
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => setState({ client, connected: true }),
      onWebSocketClose: () => setState({ client, connected: false }),
    });
    client.activate();
    setState({ client, connected: false });
    return () => {
      void client.deactivate();
    };
  }, [token]);

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext);
}

/** Se suscribe a un tópico mientras el componente esté montado y haya conexión. */
export function useTopic(destination: string | null, onMessage: (message: IMessage) => void): void {
  const { client, connected } = useRealtime();
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  useEffect(() => {
    if (!client || !connected || !destination) {
      return undefined;
    }
    const subscription = client.subscribe(destination, (message) => handler.current(message));
    return () => subscription.unsubscribe();
  }, [client, connected, destination]);
}

/** Cuerpo JSON de un mensaje STOMP. */
export function json<T>(message: IMessage): T {
  return JSON.parse(message.body) as T;
}
