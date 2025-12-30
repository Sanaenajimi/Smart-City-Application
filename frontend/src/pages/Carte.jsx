import { useMemo, useState } from "react"
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet"
import { ZONES, aqiLabel, toneClasses } from "../lib/mockData.js"

const ZONE_COORDS = {
  centre: [43.2965, 5.3698],
  industrie: [43.3008, 5.4017],
  nord: [43.3253, 5.3942],
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function colorForAqi(aqi) {
  if (aqi <= 50) return "#10b981" // emerald
  if (aqi <= 100) return "#f59e0b" // amber
  return "#f43f5e" // rose
}

function recommendationForAqi(aqi) {
  if (aqi <= 50) {
    return {
      title: "Conditions favorables",
      items: [
        "Activités extérieures OK",
        "Aération possible",
        "Bonne dispersion des particules",
      ],
    }
  }
  if (aqi <= 100) {
    return {
      title: "Vigilance modérée",
      items: [
        "Limiter l’effort intense si sensible",
        "Privilégier les zones moins exposées",
        "Surveiller l’évolution sur la journée",
      ],
    }
  }
  return {
    title: "Alerte – à limiter",
    items: [
      "Éviter les activités physiques intenses",
      "Personnes sensibles : restez à l’intérieur",
      "Prévoir des mesures de réduction trafic",
    ],
  }
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm border transition ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
      type="button"
    >
      {children}
    </button>
  )
}

export default function Carte() {
  const [layers, setLayers] = useState({
    pollution: true,
    meteo: false,
    trafic: false,
  })
  const [selectedZone, setSelectedZone] = useState("centre")

  const zonesWithAqi = useMemo(() => {
    // Données simulées stables mais plausibles (AQI par zone)
    const base = { centre: 77, industrie: 92, nord: 61 }
    return ZONES.map((z) => ({
      ...z,
      aqi: base[z.id] ?? 70,
      coords: ZONE_COORDS[z.id] ?? [43.2965, 5.3698],
      // signaux simulés (pour enrichir le panneau de détails)
      temperature: z.id === "nord" ? 24 : 26,
      humidity: z.id === "industrie" ? 66 : 71,
      wind: z.id === "centre" ? 14 : 15,
      traffic: z.id === "industrie" ? "Élevé" : z.id === "centre" ? "Modéré" : "Faible",
    }))
  }, [])

  const selected =
    zonesWithAqi.find((z) => z.id === selectedZone) ?? zonesWithAqi[0]
  const aqiInfo = aqiLabel(selected.aqi)
  const recos = recommendationForAqi(selected.aqi)

  const lastUpdated = useMemo(() => {
    const d = new Date()
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }, [])

  const toggle = (key) => setLayers((s) => ({ ...s, [key]: !s[key] }))
  const setAll = (value) =>
    setLayers({ pollution: value, meteo: value, trafic: value })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm text-gray-500">Bonjour Marie Dubois</div>
          <h2 className="text-2xl font-semibold mt-1">Carte — Qualité de l’air</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Visualisez la qualité de l’air par zone. Sélectionnez une zone pour
            consulter les détails et les recommandations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${toneClasses(aqiInfo.tone)}`}>
            {aqiInfo.label} (AQI {selected.aqi})
          </div>
          <div className="text-xs text-gray-500">Mis à jour : {lastUpdated}</div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={layers.pollution} onClick={() => toggle("pollution")}>
              Pollution
            </Chip>
            <Chip active={layers.meteo} onClick={() => toggle("meteo")}>
              Météo
            </Chip>
            <Chip active={layers.trafic} onClick={() => toggle("trafic")}>
              Trafic
            </Chip>

            <div className="mx-1 h-6 w-px bg-gray-200 hidden sm:block" />

            <button
              onClick={() => setAll(true)}
              className="px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
              type="button"
            >
              Tout afficher
            </button>
            <button
              onClick={() => setAll(false)}
              className="px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
              type="button"
            >
              Tout masquer
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Zone :</span>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content: map + details */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-100">
            <div className="h-[420px]">
              <MapContainer
                center={selected.coords}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {zonesWithAqi.map((z) => {
                  const radius = clamp(250 + (z.population ?? 0) / 250, 250, 650)
                  const fill = colorForAqi(z.aqi)
                  const isActive = z.id === selectedZone

                  return (
                    <Circle
                      key={z.id}
                      center={z.coords}
                      radius={radius}
                      pathOptions={{
                        color: isActive ? "#111827" : fill,
                        weight: isActive ? 3 : 2,
                        fillColor: fill,
                        fillOpacity: layers.pollution ? 0.35 : 0.12,
                      }}
                      eventHandlers={{
                        click: () => setSelectedZone(z.id),
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{z.label}</div>
                          <div className="mt-1 text-gray-600">AQI : {z.aqi}</div>
                          <div className="text-gray-600">
                            Population : {(z.population ?? 0).toLocaleString("fr-FR")}
                          </div>

                          {(layers.meteo || layers.trafic) && (
                            <div className="mt-2 text-gray-600 space-y-1">
                              {layers.meteo && (
                                <div>
                                  Météo (simulé) : {z.temperature}°C • {z.wind} km/h • {z.humidity}%
                                </div>
                              )}
                              {layers.trafic && (
                                <div>Trafic (simulé) : {z.traffic}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Circle>
                  )
                })}
              </MapContainer>
            </div>
          </div>

          {/* Details panel */}
          <div className="lg:col-span-1 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Zone sélectionnée</div>
                <div className="text-lg font-semibold">{selected.label}</div>
              </div>
              <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${toneClasses(aqiInfo.tone)}`}>
                AQI {selected.aqi}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Température" value={`${selected.temperature}°C`} />
              <Metric label="Vent" value={`${selected.wind} km/h`} />
              <Metric label="Humidité" value={`${selected.humidity}%`} />
              <Metric label="Trafic" value={selected.traffic} />
            </div>

            <div className="mt-4 rounded-xl bg-white border border-gray-200 p-4">
              <div className="font-semibold">{recos.title}</div>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc pl-5">
                {recos.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Note : Les données “Météo” et “Trafic” sont simulées pour la démo et seront remplacées par l’API.
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="font-semibold text-gray-700">Légende AQI</div>
          <LegendItem color="#10b981" label="Bon (0–50)" />
          <LegendItem color="#f59e0b" label="Modéré (51–100)" />
          <LegendItem color="#f43f5e" label="Dégradé (100+)" />
        </div>
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-gray-600">{label}</span>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-semibold text-gray-900">{value}</div>
    </div>
  )
}
