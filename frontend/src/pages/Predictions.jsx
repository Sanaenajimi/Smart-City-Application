import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ZONES, aqiLabel, toneClasses } from "../lib/mockData.js"

function buildSeries(base, hours) {
  const now = new Date()
  const series = []
  for (let i = 0; i <= hours; i += 1) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000)
    // signal simple : variation sinuso + bruit léger
    const v = base + Math.round(6 * Math.sin(i / 3) + (i % 4 === 0 ? 2 : 0))
    series.push({
      h: t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      pm25: Math.max(8, v),
    })
  }
  return series
}

function confidenceForZone(zoneId) {
  if (zoneId === "industrie") return 73
  if (zoneId === "centre") return 78
  return 75
}

export default function Predictions() {
  const [zoneId, setZoneId] = useState("centre")
  const [horizon, setHorizon] = useState(24)

  const series = useMemo(() => {
    const base = zoneId === "industrie" ? 44 : zoneId === "centre" ? 36 : 28
    return buildSeries(base, horizon)
  }, [zoneId, horizon])

  const last = series[series.length - 1]?.pm25 ?? 30
  const conf = confidenceForZone(zoneId)
  const aqiApprox = useMemo(() => Math.round(last * 2), [last]) // approximation pédagogique
  const aqiInfo = aqiLabel(aqiApprox)

  const trend = useMemo(() => {
    if (series.length < 2) return "Stable"
    const first = series[0].pm25
    const delta = last - first
    if (Math.abs(delta) <= 2) return "Stable"
    return delta > 0 ? "Hausse" : "Baisse"
  }, [series, last])

  const drivers = useMemo(() => {
    const base = [
      { k: "Vent", v: zoneId === "industrie" ? "Faible (dispersion limitée)" : "Modéré" },
      { k: "Humidité", v: "Élevée (agrégation particulaire)" },
      { k: "Trafic", v: zoneId === "centre" ? "Fort en heures de pointe" : "Modéré" },
      { k: "Historique", v: "7 jours (tendance PM2.5)" },
    ]
    return base
  }, [zoneId])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Bonjour Marie Dubois</div>
          <h2 className="text-2xl font-semibold mt-1">Prédictions IA — PM2.5</h2>
          <p className="text-sm text-gray-500 mt-2">
            Projection pédagogique (mock) basée sur historique, météo et trafic. Objectif : J+1 et anticipation.
          </p>
        </div>

        <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${toneClasses(aqiInfo.tone)}`}>
          AQI prévu : {aqiApprox} — {aqiInfo.label}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Zone :</span>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Horizon :</span>
            <div className="flex gap-2">
              {[6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-2 rounded-xl text-sm border ${
                    horizon === h ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
          <Metric title="PM2.5 prévu" value={`${last} µg/m³`} hint="à la fin de l’horizon" />
          <Metric title="Tendance" value={trend} hint="sur la période" />
          <Metric title="Confiance" value={`${conf}%`} hint="fiabilité estimée" />
          <Metric title="Modèle" value="Random Forest" hint="version MVP" />
        </div>

        <div className="mt-4 border border-gray-100 rounded-2xl p-3">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="h" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="pm25" stroke="currentColor" fill="url(#pmFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Note : valeurs simulées. Les seuils d’alerte (PM2.5&gt;50) seront déclenchés automatiquement une fois le backend branché.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Panel title="Facteurs d’influence IA">
            <ul className="space-y-2 text-sm text-gray-700">
              {drivers.map((d) => (
                <li key={d.k} className="flex justify-between gap-3">
                  <span className="text-gray-500">{d.k}</span>
                  <span className="font-medium">{d.v}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Performance du modèle">
            <div className="text-sm text-gray-700 space-y-2">
              <Row k="Précision (30j test)" v={`${conf}%`} />
              <Row k="Métriques" v="RMSE / MAPE" />
              <Row k="Données" v="Historique + météo + trafic" />
              <Row k="Fréquence mise à jour" v="Horaire" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Metric({ title, value, hint }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{hint}</div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-gray-500">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  )
}
