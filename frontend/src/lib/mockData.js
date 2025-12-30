// frontend/src/lib/mockData.js
// Mock data utilities for the Smart City Air Quality Platform (demo mode).
// Deterministic + side-effect free. Values evolve slowly (minute) so the UI feels "live".

export const ZONES = [
  { id: "all", label: "Toutes" },
  { id: "centre", label: "Centre-ville" },
  { id: "industrie", label: "Zone Industrielle" },
  { id: "nord", label: "Résidentiel Nord" },
];

export const POLLUTANTS = ["PM25", "PM10", "NO2", "O3", "SO2"];

/**
 * AQI labeling (simplified).
 * Returns: { label, tone }
 */
export function aqiLabel(aqi) {
  if (aqi <= 50) return { label: "Bon", tone: "ok" };
  if (aqi <= 100) return { label: "Modéré", tone: "warn" };
  if (aqi <= 150) return { label: "Mauvais", tone: "danger" };
  return { label: "Très mauvais", tone: "danger" };
}

/** Tailwind classes for KPI/Badge tones. */
export function toneClasses(tone) {
  if (tone === "ok") return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (tone === "warn") return "bg-amber-50 text-amber-800 border border-amber-200";
  return "bg-rose-50 text-rose-800 border border-rose-200";
}

/* ----------------------------- deterministic RNG ----------------------------- */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nowClock() {
  const d = new Date();
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function minuteKey() {
  const d = new Date();
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

/* ------------------------------- snapshot mock ------------------------------- */
export function getMockSnapshot() {
  // changes slowly (minute)
  const r = mulberry32(hashString(minuteKey()));
  const aqi = Math.round(65 + r() * 35); // 65–100

  const alerts = [
    {
      id: "a1",
      title: "Alerte PM10 – Zone Industrielle",
      message: "Niveau PM10 élevé : 82µg/m³ (seuil : 80µg/m³).",
      zone: "Zone Industrielle",
      time: nowClock(),
      people: 15000,
      pollutant: "PM10",
      value: 82,
      unit: "µg/m³",
      threshold: 80,
      critical: true,
      read: false,
    },
    {
      id: "a2",
      title: "Alerte PM2.5 – Zone Industrielle",
      message: "Niveau PM2.5 élevé : 52µg/m³ (seuil : 50µg/m³).",
      zone: "Zone Industrielle",
      time: nowClock(),
      people: 15000,
      pollutant: "PM25",
      value: 52,
      unit: "µg/m³",
      threshold: 50,
      critical: true,
      read: false,
    },
    {
      id: "a3",
      title: "Prédiction : Pic de pollution probable",
      message: "Conditions météo défavorables. Pic attendu dans les 6 prochaines heures.",
      zone: "Centre-ville",
      time: nowClock(),
      people: 22000,
      pollutant: "PM25",
      value: 48,
      unit: "µg/m³",
      threshold: 50,
      critical: false,
      read: true,
    },
  ];

  return {
    user: { name: "Marie Dubois", role: "Responsable Environnement" },
    updatedAt: nowClock(),
    kpis: {
      aqi,
      temperature: Math.round(14 + r() * 14), // 14–28
      wind: Math.round(5 + r() * 18), // 5–23
      humidity: Math.round(45 + r() * 35), // 45–80
      sensors: { active: 3, total: 3 },
    },
    alerts,
  };
}

/* -------------------------- dashboard analytics mock ------------------------- */
function buildTimeAxis(periodKey) {
  const now = new Date();
  const out = [];
  if (periodKey === "1h") {
    for (let i = 11; i >= 0; i -= 1) {
      const t = new Date(now.getTime() - i * 5 * 60 * 1000);
      out.push(t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }
    return out;
  }
  if (periodKey === "6h") {
    for (let i = 23; i >= 0; i -= 1) {
      const t = new Date(now.getTime() - i * 15 * 60 * 1000);
      out.push(t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }
    return out;
  }
  if (periodKey === "7d") {
    for (let i = 6; i >= 0; i -= 1) {
      const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      out.push(t.toLocaleDateString("fr-FR", { weekday: "short" }));
    }
    return out;
  }
  // 24h default (every 30 min)
  for (let i = 47; i >= 0; i -= 1) {
    const t = new Date(now.getTime() - i * 30 * 60 * 1000);
    out.push(t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
  }
  return out;
}

function pollutantBase(p) {
  if (p === "PM25") return 38;
  if (p === "PM10") return 58;
  if (p === "NO2") return 50;
  if (p === "O3") return 42;
  return 30; // SO2
}

function zoneFactor(zoneId) {
  if (zoneId === "industrie") return 1.18;
  if (zoneId === "centre") return 1.0;
  if (zoneId === "nord") return 0.85;
  return 1.0;
}

/**
 * Builds all datasets for dashboard charts based on selected filters.
 * @param {{period: '1h'|'6h'|'24h'|'7d', zone: string, pollutant: string}} filters
 */
export function getDashboardData(filters) {
  const period = filters?.period ?? "24h";
  const zone = filters?.zone ?? "all";
  const pollutant = filters?.pollutant ?? "PM25";

  // evolve with minute so it doesn't look frozen
  const seed = hashString(`${period}|${zone}|${pollutant}|${minuteKey()}`);
  const r = mulberry32(seed);

  const axis = buildTimeAxis(period);
  const base = pollutantBase(pollutant) * zoneFactor(zone === "all" ? "centre" : zone);

  const series = axis.map((t, idx) => {
    const wave = Math.sin(idx / 2.2) * 6 + Math.cos(idx / 5.5) * 3;
    const noise = (r() - 0.5) * 5;
    const v = clamp(Math.round(base + wave + noise), 5, 120);
    return { t, value: v };
  });

  const multi = axis.map((t, idx) => {
    const make = (p, amp) => {
      const b = pollutantBase(p) * zoneFactor(zone === "all" ? "centre" : zone);
      const wave = Math.sin(idx / (2.3 + amp)) * (5 + amp) + Math.cos(idx / (6.5 - amp / 5)) * 2;
      const noise = (r() - 0.5) * (3 + amp / 3);
      return clamp(Math.round(b + wave + noise), 4, 140);
    };
    return { t, PM25: make("PM25", 2), PM10: make("PM10", 3), NO2: make("NO2", 2.5), O3: make("O3", 2) };
  });

  const barZones = [
    { name: "Centre-ville", aqi: Math.round(70 + r() * 20) },
    { name: "Zone Industrielle", aqi: Math.round(95 + r() * 25) },
    { name: "Résidentiel Nord", aqi: Math.round(55 + r() * 18) },
  ];

  const weights = [
    { name: "PM25", w: 0.15 + r() * 0.2 },
    { name: "PM10", w: 0.2 + r() * 0.25 },
    { name: "NO2", w: 0.15 + r() * 0.25 },
    { name: "O3", w: 0.15 + r() * 0.25 },
  ];
  const sum = weights.reduce((a, x) => a + x.w, 0);
  const pie = weights.map((x) => ({ name: x.name, value: Math.round((x.w / sum) * 100) }));
  const drift = 100 - pie.reduce((a, x) => a + x.value, 0);
  pie[0].value += drift;

  const last = series[series.length - 1]?.value ?? Math.round(base);
  const prev = clamp(last + Math.round((r() - 0.5) * 10), 5, 140);

  const deltaPct = prev === 0 ? 0 : Math.round(((last - prev) / prev) * 1000) / 10;
  const deltaStr = `${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs précédent`;

  const aqiGlobal = Math.round(clamp(last * 1.7, 10, 180));
  const aqiPrev = Math.round(clamp(prev * 1.7, 10, 180));
  const aqiDeltaPct = aqiPrev === 0 ? 0 : Math.round(((aqiGlobal - aqiPrev) / aqiPrev) * 1000) / 10;
  const aqiDeltaStr = `${aqiDeltaPct >= 0 ? "+" : ""}${aqiDeltaPct}% vs précédent`;

  const kpis = {
    PM25: { title: "PM2.5 Moyen", value: Math.round(clamp(pollutantBase("PM25") * zoneFactor(zone === "all" ? "centre" : zone) + (r() - 0.5) * 8, 5, 120)), unit: "µg/m³", delta: deltaStr },
    PM10: { title: "PM10 Moyen", value: Math.round(clamp(pollutantBase("PM10") * zoneFactor(zone === "all" ? "centre" : zone) + (r() - 0.5) * 10, 5, 160)), unit: "µg/m³", delta: deltaStr },
    NO2: { title: "NO2 Moyen", value: Math.round(clamp(pollutantBase("NO2") * zoneFactor(zone === "all" ? "centre" : zone) + (r() - 0.5) * 10, 5, 200)), unit: "µg/m³", delta: deltaStr },
    AQI: { title: "AQI Global", value: aqiGlobal, unit: "", delta: aqiDeltaStr, tone: aqiLabel(aqiGlobal).tone },
  };

  return { period, zone, pollutant, series, multi, barZones, pie, kpis };
}
