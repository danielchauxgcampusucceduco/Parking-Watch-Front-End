import { NavLink, Navigate, Route, Routes } from "react-router";
import { useSession } from "./auth/session";
import { ReportAlerts } from "./components/ReportAlerts";
import { LivePage } from "./pages/LivePage";
import { LoginPage } from "./pages/LoginPage";
import { MapPage } from "./pages/MapPage";
import { MfaSetupPage } from "./pages/MfaSetupPage";
import { ModelsPage } from "./pages/ModelsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { UsersPage } from "./pages/UsersPage";
import { ZonesPage } from "./pages/ZonesPage";
import { RealtimeProvider } from "./realtime/realtime";

/**
 * Sin sesión válida no se carga ninguna otra pantalla (RF-5.1). Operador: mapa, cámara y reportes;
 * administrador: además zonas, modelos y usuarios (RF-5.2).
 */
export function App() {
  const { session, isAdministrator, logout } = useSession();
  if (!session) {
    return <LoginPage />;
  }
  return (
    <RealtimeProvider token={session.token}>
      <div className="shell">
        <nav className="nav" aria-label="Principal">
          <span className="brand">Cupo · Tránsito</span>
          <NavLink to="/">Mapa</NavLink>
          <NavLink to="/reportes">Reportes</NavLink>
          {isAdministrator && <NavLink to="/zonas">Zonas</NavLink>}
          {isAdministrator && <NavLink to="/modelos">Modelos</NavLink>}
          {isAdministrator && <NavLink to="/usuarios">Usuarios</NavLink>}
          {session.mfaSetupRequired && <NavLink to="/segundo-factor">Segundo factor</NavLink>}
          <div className="user">
            {session.user.fullName}
            <br />
            <button onClick={logout}>Cerrar sesión</button>
          </div>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/camaras/:cameraId" element={<LivePage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/reportes/:reportId" element={<ReportsPage />} />
            <Route path="/segundo-factor" element={<MfaSetupPage />} />
            {isAdministrator && <Route path="/zonas" element={<ZonesPage />} />}
            {isAdministrator && <Route path="/modelos" element={<ModelsPage />} />}
            {isAdministrator && <Route path="/usuarios" element={<UsersPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ReportAlerts />
    </RealtimeProvider>
  );
}
