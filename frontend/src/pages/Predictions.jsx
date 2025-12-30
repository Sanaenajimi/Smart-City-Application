import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts"
import { ZONES, aqiLabel, toneClasses } from "../lib/mockData.js"

const POLLUTANTS = [
  { id: "PM25", label: "PM2.5", unit: "µg/m³", threshold: 50 },
  { id: "PM10", label: "PM10", unit: "µg/m³", threshold: 80 },
  { id: "NO2", label: "NO2", unit: "µg/m³", threshold: 200 },
  { id: "O3", label: "O3", unit: "µg/m³", threshold: 180 },
  { id: "SO2", label: "SO2", unit: "µg/m³", threshold: 350 },
]

const PREDICTION_TYPES = [
  { id: "pollution", label: "Pollution" },
  { id: "meteo", label: "Météo" },
  { id: "trafic", label: "Trafic" },
]

const MODELS = [
  { id: "rf", label: "Random Forest", baseConfidence: 78 },
  { id: "xgb", label: "XGBoost", baseConfidence: 82 },
]

function buildPollutionSeries(base, hours, pollutantId) {
  const now = new Date()
  const series = []
  const multiplier = pollutantId === "PM10" ? 1.5 : pollutantId === "NO2" ? 1.3 : pollutantId === "O3" ? 1.2 : pollutantId === "SO2" ? 0.8 : 1
  
  for (let i = 0; i <= hours; i += 1) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000)
    const v = Math.round((base * multiplier) + 6 * Math.sin(i / 3) + (i % 4 === 0 ? 2 : 0))
    series.push({
      h: t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      value: Math.max(5, v),
    })
  }
  return series
}

function buildMeteoSeries(hours, type = "temperature") {
  const now = new Date()
  const series = []
  const baseTemp = 12
  const baseHumidity = 75
  const baseWind = 15
  
  for (let i = 0; i <= hours; i += 1) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000)
    series.push({
      h: t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      temperature: baseTemp + Math.round(3 * Math.sin(i / 4)) + (Math.random() - 0.5) * 2,
      humidity: baseHumidity + Math.round(5 * Math.cos(i / 3)) + (Math.random() - 0.5) * 3,
      wind: baseWind + Math.round(4 * Math.sin(i / 5)) + (Math.random() - 0.5) * 2,
    })
  }
  return series
}

function buildTraficSeries(hours, zoneId) {
  const now = new Date()
  const series = []
  const baseTraffic = zoneId === "industrie" ? 120 : zoneId === "centre" ? 85 : 45
  
  for (let i = 0; i <= hours; i += 1) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000)
    const hour = t.getHours()
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    const peakMultiplier = isPeakHour ? 1.5 : 1
    
    series.push({
      h: t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      value: Math.round(baseTraffic * peakMultiplier + (Math.random() - 0.5) * 15),
    })
  }
  return series
}

function confidenceForModel(modelId, zoneId, pollutantId, predictionType) {
  const model = MODELS.find(m => m.id === modelId)
  let baseConf = model?.baseConfidence || 75
  
  // Ajustement selon le type de prédiction
  if (predictionType === "pollution") {
    // Ajustement selon le polluant
    const pollutantAdjust = {
      "PM25": 0,      // Référence
      "PM10": -3,     // Un peu moins précis
      "NO2": -5,      // Plus difficile à prédire
      "O3": -7,       // Très variable selon météo
      "SO2": -4,      // Moins de données historiques
    }
    baseConf += pollutantAdjust[pollutantId] || 0
  } else if (predictionType === "meteo") {
    baseConf += 5   // Météo généralement plus prévisible
  } else if (predictionType === "trafic") {
    baseConf -= 2   // Trafic plus aléatoire (événements imprévisibles)
  }
  
  // Ajustement selon la zone
  const zoneAdjust = zoneId === "centre" ? 3 : zoneId === "industrie" ? -5 : 0
  baseConf += zoneAdjust
  
  return Math.min(95, Math.max(60, Math.round(baseConf)))
}

export default function Predictions() {
  const [zoneId, setZoneId] = useState("centre")
  const [horizon, setHorizon] = useState(24)
  const [predictionType, setPredictionType] = useState("pollution")
  const [pollutantId, setPollutantId] = useState("PM25")
  const [selectedModel, setSelectedModel] = useState("xgb") // Modèle sélectionnable par l'utilisateur

  const series = useMemo(() => {
    if (predictionType === "pollution") {
      const base = zoneId === "industrie" ? 44 : zoneId === "centre" ? 36 : 28
      return buildPollutionSeries(base, horizon, pollutantId)
    } else if (predictionType === "meteo") {
      return buildMeteoSeries(horizon)
    } else {
      return buildTraficSeries(horizon, zoneId)
    }
  }, [zoneId, horizon, predictionType, pollutantId])

  const selectedPollutant = POLLUTANTS.find(p => p.id === pollutantId)
  const last = series[series.length - 1]
  const conf = confidenceForModel(selectedModel, zoneId, pollutantId, predictionType)
  
  const lastValue = predictionType === "pollution" ? last?.value : 
                    predictionType === "meteo" ? last?.temperature :
                    last?.value

  const aqiApprox = predictionType === "pollution" ? Math.round(lastValue * 2) : null
  const aqiInfo = aqiApprox ? aqiLabel(aqiApprox) : null

  const trend = useMemo(() => {
    if (series.length < 2) return "Stable"
    const getValue = (item) => predictionType === "meteo" ? item.temperature : item.value
    const first = getValue(series[0])
    const delta = getValue(last) - first
    if (Math.abs(delta) <= 2) return "Stable"
    return delta > 0 ? "Hausse" : "Baisse"
  }, [series, last, predictionType])

  const drivers = useMemo(() => {
    if (predictionType === "pollution") {
      return [
        { k: "Vent", v: zoneId === "industrie" ? "Faible (dispersion limitée)" : "Modéré" },
        { k: "Humidité", v: "Élevée (agrégation particulaire)" },
        { k: "Trafic", v: zoneId === "centre" ? "Fort en heures de pointe" : "Modéré" },
        { k: "Historique", v: "7 jours (tendance pollution)" },
      ]
    } else if (predictionType === "meteo") {
      return [
        { k: "Pression atm.", v: "1015 hPa (stable)" },
        { k: "Couverture nuageuse", v: "Variable" },
        { k: "Précipitations", v: "Faible probabilité" },
        { k: "Historique", v: "30 jours (patterns saisonniers)" },
      ]
    } else {
      return [
        { k: "Jour de semaine", v: new Date().getDay() >= 1 && new Date().getDay() <= 5 ? "Oui" : "Non" },
        { k: "Événements", v: "Aucun événement majeur" },
        { k: "Travaux", v: zoneId === "centre" ? "Actifs (impact moyen)" : "Limités" },
        { k: "Historique", v: "14 jours (patterns horaires)" },
      ]
    }
  }, [zoneId, predictionType])

  // Calculer les prédictions de tous les modèles pour comparaison
  const modelComparisons = MODELS.map(model => ({
    ...model,
    confidence: confidenceForModel(model.id, zoneId, pollutantId, predictionType)
  })).sort((a, b) => b.confidence - a.confidence) // Trier par confiance décroissante

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Bonjour Marie Dubois</div>
          <h2 className="text-2xl font-semibold mt-1">
            Prédictions IA — {predictionType === "pollution" ? selectedPollutant?.label : 
                              predictionType === "meteo" ? "Météo" : "Trafic"}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Projection basée sur historique, météo et trafic. Objectif : anticipation J+1.
          </p>
        </div>

        {aqiInfo && (
          <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${toneClasses(aqiInfo.tone)}`}>
            AQI prévu : {aqiApprox} — {aqiInfo.label}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        {/* Filtres */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-500">Type de prédiction :</span>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={predictionType}
              onChange={(e) => setPredictionType(e.target.value)}
            >
              {PREDICTION_TYPES.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {predictionType === "pollution" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500">Polluant :</span>
              <select
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                value={pollutantId}
                onChange={(e) => setPollutantId(e.target.value)}
              >
                {POLLUTANTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-500">Zone :</span>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              {ZONES.filter(z => z.id !== "all").map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-500">Horizon :</span>
            <div className="flex gap-2">
              {[6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border ${
                    horizon === h ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
          <Metric 
            title={predictionType === "pollution" ? `${selectedPollutant?.label} prévu` : 
                   predictionType === "meteo" ? "Température" : "Trafic"} 
            value={predictionType === "pollution" ? `${lastValue} ${selectedPollutant?.unit}` :
                   predictionType === "meteo" ? `${lastValue}°C` :
                   `${lastValue} véh/h`}
            hint="à la fin de l'horizon" 
          />
          <Metric title="Tendance" value={trend} hint="sur la période" />
          <Metric title="Confiance" value={`${conf}%`} hint="fiabilité estimée" />
          <Metric 
            title="Modèle" 
            value={MODELS.find(m => m.id === selectedModel)?.label} 
            hint="sélectionné manuellement" 
          />
        </div>

        {/* Graphique principal */}
        <div className="mt-4 border border-gray-100 rounded-2xl p-3">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {predictionType === "meteo" ? (
                <LineChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="h" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" stroke="#f59e0b" name="Température (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#3b82f6" name="Humidité (%)" />
                  <Line type="monotone" dataKey="wind" stroke="#10b981" name="Vent (km/h)" />
                </LineChart>
              ) : (
                <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="h" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="currentColor" fill="url(#valueFill)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Panel title="Facteurs d'influence IA">
            <ul className="space-y-2 text-sm text-gray-700">
              {drivers.map((d) => (
                <li key={d.k} className="flex justify-between gap-3">
                  <span className="text-gray-500">{d.k}</span>
                  <span className="font-medium">{d.v}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Comparaison des modèles">
            <div className="space-y-3">
              {modelComparisons.map((model) => (
                <ModelCard 
                  key={model.id}
                  name={model.label}
                  confidence={model.confidence}
                  isSelected={selectedModel === model.id}
                  onClick={() => setSelectedModel(model.id)}
                />
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Cliquez sur un modèle pour voir ses prédictions
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

function ModelCard({ name, confidence, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl border transition-all ${
        isSelected 
          ? 'border-gray-900 bg-gray-50 shadow-sm' 
          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm text-left">{name}</div>
        <div className="text-xs px-2 py-1 rounded-lg bg-gray-100">
          {confidence}% confiance
        </div>
      </div>
      {isSelected && (
        <div className="text-xs text-gray-500 mt-1 text-left">✓ Modèle actif</div>
      )}
    </button>
  )
}