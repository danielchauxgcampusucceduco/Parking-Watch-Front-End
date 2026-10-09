import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "./App";
import { SessionProvider } from "./auth/session";
import { CAMERA, mockApi } from "./test/utils";

vi.mock("@stomp/stompjs", () => ({
  Client: class {
    activate() {}
    deactivate() {
      return Promise.resolve();
    }
  },
}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  TileLayer: () => null,
  Polygon: () => null,
  Tooltip: ({ children }: { children: unknown }) => <span>{children as never}</span>,
  CircleMarker: ({ children }: { children: unknown }) => <div>{children as never}</div>,
}));

function login(role: string, mfaSetupRequired = false) {
  return {
    accessToken: "jwt",
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    user: { id: "u1", username: "ana", fullName: "Ana Pérez", role },
    mfaSetupRequired,
  };
}

function renderApp() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SessionProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

async function signIn(otp?: string) {
  await userEvent.type(screen.getByLabelText("Usuario"), "ana");
  await userEvent.type(screen.getByLabelText("Contraseña"), "Clave-Segura-2026");
  if (otp) {
    await userEvent.type(screen.getByLabelText(/Código/), otp);
  }
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
}

describe("acceso privado", () => {
  it("sin sesión solo muestra el inicio de sesión y luego el mapa del operador", async () => {
    mockApi({ "POST /api/v1/auth/login": login("OPERATOR"), "GET /api/v1/cameras": [CAMERA] });
    renderApp();
    expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
    await signIn();
    expect(
      await screen.findByRole("heading", { name: "Cámaras de vigilancia" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("En línea").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Zonas" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });

  it("pide el código TOTP al administrador y le muestra la administración", async () => {
    let attempts = 0;
    mockApi({
      "POST /api/v1/auth/login": () =>
        ++attempts === 1
          ? new Response(JSON.stringify({ code: "MFA_REQUIRED", detail: "Código" }), {
              status: 401,
            })
          : login("ADMINISTRATOR"),
      "GET /api/v1/cameras": [CAMERA],
    });
    renderApp();
    await signIn();
    expect(await screen.findByLabelText(/Código de su aplicación/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Código de su aplicación/), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("link", { name: "Zonas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modelos" })).toBeInTheDocument();
  });

  it("muestra el error sin revelar qué dato falló", async () => {
    mockApi({
      "POST /api/v1/auth/login": new Response(
        JSON.stringify({ code: "UNAUTHORIZED", detail: "Usuario o contraseña incorrectos" }),
        { status: 401 },
      ),
    });
    renderApp();
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("Usuario o contraseña incorrectos");
  });

  it("el administrador sin segundo factor solo ve el registro del segundo factor", async () => {
    mockApi({
      "POST /api/v1/auth/login": login("ADMINISTRATOR", true),
      "GET /api/v1/cameras": [CAMERA],
      "POST /api/v1/auth/mfa/setup": { secret: "JBSWY3DP", otpauthUri: "otpauth://totp/x" },
      "POST /api/v1/auth/mfa/activate": login("ADMINISTRATOR"),
    });
    renderApp();
    await signIn();
    await userEvent.click(await screen.findByRole("link", { name: "Segundo factor" }));
    await userEvent.click(screen.getByRole("button", { name: "Generar secreto" }));
    expect(await screen.findByText("JBSWY3DP")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Código de 6 dígitos"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Activar" }));
    expect(await screen.findByRole("link", { name: "Usuarios" })).toBeInTheDocument();
  });
});
