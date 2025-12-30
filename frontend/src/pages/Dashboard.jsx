// frontend/src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Thermometer, Wind, Droplets, Activity } from "lucide-react";
import KpiCard from "../components/KpiCard";
import AlertCard from "../components/AlertCard";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiGet } from "../lib/api";
import { getUser } from "../lib/auth";
import { getMockSnapshot, getDashboardData, POLLUTANTS, ZONES } from "../lib/mockData.js";

/** Pills cliquables (filtres) */
function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 " +
        (active
          ? "bg-gray-900 text-white border-gray-900 shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300")
      }
    >
      {children}
    </button>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 " +
        (active
          ? "bg-gray-900 text-white border-gray-900 shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300")
      }
    >
      {children}
    </button>
  );
}

function SmallKpi({ title, value, unit, delta, badgeLabel, badgeTone }) {
  const badge =
    badgeTone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : badgeTone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : badgeTone === "danger"
          ? "bg-rose-50 text-rose-700 border-rose-100"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-gray-700">{title}</div>
        <div className={`text-xs px-2 py-1 rounded-full border ${badge}`}>{badgeLabel ?? "Normal"}</div>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        {unit ? <div className="text-sm text-gray-500 mb-1">{unit}</div> : null}
      </div>

      <div className="text-xs text-gray-500 mt-2">{delta}</div>
    </div>
  );
}

export default function Dashboard() {
  const user = useMemo(() => getUser(), []);
  const persona = user?.persona || "env";

  // Snapshot (KPIs capteurs + alertes)
  const baseSnapshot = useMemo(() => getMockSnapshot(), []);
  const [snapshot, setSnapshot] = useState(baseSnapshot);
  const [alerts, setAlerts] = useState(baseSnapshot.alerts);
  const [tab, setTab] = useState("unread"); // all | unread | critical

  // Filtres analytics
  const [period, setPeriod] = useState("24h"); // 1h | 6h | 24h | 7d
  const [zone, setZone] = useState("all");
  const [pollutant, setPollutant] = useState("PM25");

  // Analytics data (from API if available, otherwise mock)
  const [analytics, setAnalytics] = useState(() => getDashboardData({ period, zone, pollutant }));

  // refresh snapshot from backend (non-blocking)
  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const data = await apiGet("/api/snapshot");
        if (!alive) return;

        const merged = {
          ...baseSnapshot,
          updatedAt: data?.updatedAt || baseSnapshot.updatedAt,
          kpis: { ...baseSnapshot.kpis, ...(data?.kpis || {}) },
          alerts: Array.isArray(data?.alerts) ? data.alerts : baseSnapshot.alerts,
        };

        setSnapshot(merged);
        setAlerts(merged.alerts);
      } catch {
        // keep mock
      }
    }

    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [baseSnapshot]);

  // refresh analytics when filters change
  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const qs = new URLSearchParams({ period, zone, pollutant }).toString();
        const data = await apiGet(`/api/dashboard?${qs}`);
        if (!alive) return;

        // Backend returns the same shape as mockData.getDashboardData
        setAnalytics(data);
      } catch {
        if (!alive) return;
        setAnalytics(getDashboardData({ period, zone, pollutant }));
      }
    }

    refresh();
    return () => {
      alive = false;
    };
  }, [period, zone, pollutant]);

  const filteredAlerts = useMemo(() => {
    if (tab === "all") return alerts;
    if (tab === "critical") return alerts.filter((a) => a.critical);
    return alerts.filter((a) => !a.read);
  }, [alerts, tab]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  function ack(id) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }

  function dismiss(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const zoneLabel = ZONES.find((z) => z.id === zone)?.label ?? "—";
  const pollutantLabel = pollutant === "PM25" ? "PM2.5" : pollutant;

  const title =
    persona === "citizen"
      ? "Tableau citoyen — Qualité de l’air"
      : persona === "elected"
        ? "Tableau décisionnel — Qualité de l’air"
        : "Tableau de bord environnemental";

  const subtitle =
    persona === "citizen"
      ? "Suivez la qualité de l’air dans votre zone et adaptez vos activités."
      : persona === "elected"
        ? "Vue synthèse pour piloter les actions et la communication."
        : "Analyse et suivi en temps réel des polluants et alertes.";

  // Couleurs “douces” segments pie (clair, cohérent)
  const pieColors = ["#22c55e", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Header page */}
      <div className="animate-fade-up">
        <div className="text-sm text-gray-500">Bonjour {user?.name || snapshot?.user?.name || "Utilisateur"}</div>
        <div className="text-2xl font-semibold mt-1 text-gray-900">{title}</div>
        <div className="text-sm text-gray-500 mt-2">{subtitle}</div>
      </div>

      {/* KPI “capteurs / météo” */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Capteurs actifs"
          value={`${snapshot?.kpis?.sensors?.active ?? 3}/${snapshot?.kpis?.sensors?.total ?? 3}`}
          Icon={Activity}
          iconTone="text-sky-600"
        />
        <KpiCard
          title="Température"
          value={`${snapshot?.kpis?.temperature ?? 15}°C`}
          Icon={Thermometer}
          iconTone="text-orange-600"
        />
        <KpiCard title="Vent" value={`${snapshot?.kpis?.wind ?? 5} km/h`} Icon={Wind} iconTone="text-emerald-600" />
        <KpiCard
          title="Humidité"
          value={`${snapshot?.kpis?.humidity ?? 52}%`}
          Icon={Droplets}
          iconTone="text-sky-600"
        />
      </div>

      {/* Système d’alertes */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-gray-900">Système d’Alertes</div>
            <span className="text-xs font-semibold bg-rose-600 text-white px-2 py-0.5 rounded-full">
              {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm transition">
              Notifications
            </button>
            <button className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm transition">
              Auto
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                Toutes ({alerts.length})
              </TabButton>
              <TabButton active={tab === "unread"} onClick={() => setTab("unread")}>
                Non lues ({alerts.filter((a) => !a.read).length})
              </TabButton>
              <TabButton active={tab === "critical"} onClick={() => setTab("critical")}>
                Critiques ({alerts.filter((a) => a.critical).length})
              </TabButton>
            </div>
            <div className="text-xs text-gray-500">Seuil : Moyen</div>
          </div>

          <div className="mt-4 space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-8 text-center">Aucune alerte pour ce filtre.</div>
            ) : (
              filteredAlerts.map((a) => <AlertCard key={a.id} alert={a} onAck={ack} onDismiss={dismiss} />)
            )}
          </div>
        </div>
      </div>

      {/* Bloc Analytics */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-700 px-6 py-12 text-center relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_50%)]" />
          <div className="relative">
            <div className="text-white text-3xl font-semibold">Surveillance de la Qualité de l’Air</div>
            <div className="text-white/80 mt-2 text-sm">Données temps réel pour une ville plus propre</div>
          </div>
        </div>

        <div className="bg-white p-6">
          {/* Filtres */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 animate-fade-up">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span>Filtres d’analyse</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-gray-500 mb-2">Période</div>
                <div className="flex gap-2 flex-wrap">
                  <FilterPill active={period === "1h"} onClick={() => setPeriod("1h")}>
                    1h
                  </FilterPill>
                  <FilterPill active={period === "6h"} onClick={() => setPeriod("6h")}>
                    6h
                  </FilterPill>
                  <FilterPill active={period === "24h"} onClick={() => setPeriod("24h")}>
                    24h
                  </FilterPill>
                  <FilterPill active={period === "7d"} onClick={() => setPeriod("7d")}>
                    7d
                  </FilterPill>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Zone</div>
                <div className="flex gap-2 flex-wrap">
                  {ZONES.map((z) => (
                    <FilterPill key={z.id} active={zone === z.id} onClick={() => setZone(z.id)}>
                      {z.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Polluant</div>
                <div className="flex gap-2 flex-wrap">
                  {POLLUTANTS.map((p) => (
                    <FilterPill key={p} active={pollutant === p} onClick={() => setPollutant(p)}>
                      {p}
                    </FilterPill>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Filtre actif : <span className="font-semibold">{zoneLabel}</span> •{" "}
              <span className="font-semibold">{pollutantLabel}</span> •{" "}
              <span className="font-semibold">{period}</span>
            </div>
          </div>

          {/* KPI row (dynamiques) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <SmallKpi
              title="PM2.5 Moyen"
              value={analytics?.kpis?.PM25?.value}
              unit={analytics?.kpis?.PM25?.unit}
              delta={analytics?.kpis?.PM25?.delta}
              badgeLabel="Normal"
              badgeTone="ok"
            />
            <SmallKpi
              title="PM10 Moyen"
              value={analytics?.kpis?.PM10?.value}
              unit={analytics?.kpis?.PM10?.unit}
              delta={analytics?.kpis?.PM10?.delta}
              badgeLabel="Normal"
              badgeTone="ok"
            />
            <SmallKpi
              title="NO2 Moyen"
              value={analytics?.kpis?.NO2?.value}
              unit={analytics?.kpis?.NO2?.unit}
              delta={analytics?.kpis?.NO2?.delta}
              badgeLabel="Normal"
              badgeTone="warn"
            />
            <SmallKpi
              title="AQI Global"
              value={analytics?.kpis?.AQI?.value}
              unit=""
              delta={analytics?.kpis?.AQI?.delta}
              badgeLabel={analytics?.kpis?.AQI?.value <= 50 ? "Bon" : analytics?.kpis?.AQI?.value <= 100 ? "Modéré" : "Dégradé"}
              badgeTone={analytics?.kpis?.AQI?.tone}
            />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <div className="card animate-fade-up">
              <div className="font-semibold mb-3">Évolution temporelle – {pollutantLabel}</div>
              <div className="h-[260px] text-sky-600">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.series || []}>
                    <defs>
                      <linearGradient id="areaFillDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} µg/m³`, pollutantLabel]} />
                    <Area type="monotone" dataKey="value" stroke="currentColor" fill="url(#areaFillDash)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card animate-fade-up">
              <div className="font-semibold mb-3">Comparaison par zone – AQI</div>
              <div className="h-[260px] text-indigo-600">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.barZones || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`AQI ${v}`, "AQI"]} />
                    <Bar dataKey="aqi" fill="currentColor" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card animate-fade-up">
              <div className="font-semibold mb-3">Répartition des polluants</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                    <Pie
                      data={analytics?.pie || []}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={({ name, value }) => `${name} ${value}%`}
                    >
                      {(analytics?.pie || []).map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card animate-fade-up">
              <div className="font-semibold mb-3">Comparaison multi-polluants</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.multi || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="NO2" dot={false} stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="O3" dot={false} stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="PM10" dot={false} stroke="#0ea5e9" strokeWidth={2} />
                    <Line type="monotone" dataKey="PM25" dot={false} stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card mt-6 animate-fade-up">
            <div className="font-semibold mb-3">Recommandations personnalisées</div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="font-semibold">Zone à surveiller</div>
                <div className="text-gray-600 mt-1">
                  {(analytics?.barZones || []).slice().sort((a, b) => b.aqi - a.aqi)[0]?.name} présente des niveaux d’AQI plus élevés.{" "}
                  {persona === "citizen"
                    ? "Évitez les zones les plus exposées et privilégiez des itinéraires alternatifs."
                    : persona === "elected"
                      ? "Ajustez la communication préventive et envisagez des mesures ciblées."
                      : "Considérez un renforcement des mesures de contrôle et de communication."}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="font-semibold">Tendance</div>
                <div className="text-gray-600 mt-1">
                  Sur {period}, {pollutantLabel} fluctue.{" "}
                  {persona === "elected"
                    ? "Préparez des messages publics et des indicateurs de suivi pour la journée."
                    : "Surveillez les pics et adaptez vos activités (populations sensibles en priorité)."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paramètres notification */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 animate-fade-up">
        <div className="font-semibold mb-3">Paramètres de notification</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-2">Canaux de notification</div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-semibold">Push mobile</span>
              <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold">
                Activé
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold">
                Email
              </span>
              <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold">
                Configuré
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">Fréquence</div>
            <div>Immédiate : Alertes critiques</div>
            <div>Quotidienne : Résumé à 8h</div>
            <div>Hebdomadaire : Rapport le lundi</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">Personnalisation</div>
            <div>Rôle : {persona === "env" ? "Resp. Env." : persona === "elected" ? "Élu" : "Citoyen"}</div>
            <div>Seuil : Moyen</div>
          </div>
        </div>
      </div>
    </div>
  );
}
