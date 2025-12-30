// frontend/src/components/PageShell.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import NavTabs from "./NavTabs";
import { apiGet } from "../lib/api";
import { getUser, logout } from "../lib/auth";
import { aqiLabel, toneClasses, getMockSnapshot } from "../lib/mockData";

export default function PageShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => getUser(), []);

  const [snapshot, setSnapshot] = useState(() => getMockSnapshot());
  const [apiStatus, setApiStatus] = useState("demo"); // demo | live

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const data = await apiGet("/api/snapshot");
        if (!alive) return;
        // Merge with demo defaults for missing fields
        const base = getMockSnapshot();
        setSnapshot({
          ...base,
          updatedAt: data?.updatedAt || base.updatedAt,
          kpis: { ...base.kpis, ...(data?.kpis || {}) },
          alerts: Array.isArray(data?.alerts) ? data.alerts : base.alerts,
        });
        setApiStatus("live");
      } catch {
        // stay on demo
        if (!alive) return;
        setApiStatus("demo");
      }
    }

    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const aqi = snapshot?.kpis?.aqi ?? 0;
  const tone = aqiLabel(aqi).tone;

  function onLogout() {
    logout();
    navigate("/login", { replace: true, state: { from: location } });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        brandTitle="Smart City Air Quality"
        brandSubtitle="Surveillance en temps réel"
        updatedAt={snapshot?.updatedAt}
        apiStatus={apiStatus}
        onLogout={onLogout}
        userName={user?.name || "Utilisateur"}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-4">
          <NavTabs />
        </div>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}