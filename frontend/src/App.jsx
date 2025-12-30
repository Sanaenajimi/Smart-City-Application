// frontend/src/App.jsx
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { isAuthenticated } from "./lib/auth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Carte from "./pages/Carte";
import Predictions from "./pages/Predictions";
import Rapports from "./pages/Rapports";
import Parametres from "./pages/Parametres";

import PageShell from "./components/PageShell";

function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function AppLayout({ children }) {
  return <PageShell>{children}</PageShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Navigate to="/dashboard" replace />
          </RequireAuth>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/carte"
        element={
          <RequireAuth>
            <AppLayout>
              <Carte />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/predictions"
        element={
          <RequireAuth>
            <AppLayout>
              <Predictions />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/rapports"
        element={
          <RequireAuth>
            <AppLayout>
              <Rapports />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/parametres"
        element={
          <RequireAuth>
            <AppLayout>
              <Parametres />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
