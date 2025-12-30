import { useMemo, useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { ZONES, aqiLabel, toneClasses } from "../lib/mockData.js"
import L from "leaflet"

// Coordonnées Paris intra-muros
const ZONE_COORDS = {
  centre: [48.8566, 2.3522],     // Centre de Paris (Notre-Dame)
  industrie: [48.8738, 2.3364],  // 18e arrondissement (nord Paris)
  nord: [48.8848, 2.3444],       // 19e arrondissement (Villette)
}

function colorForAqi(aqi) {
  if (aqi <= 50) return "#10b981"
  if (aqi <= 100) return "#f59e0b"
  return "#f43f5e"
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
        "Limiter l'effort intense si sensible",
        "Privilégier les zones moins exposées",
        "Surveiller l'évolution sur la journée",
      ],
    }
  }
  return {
    title: "Alerte – à limiter",
    items: [
      "Éviter les activités physiques intenses",
      "Personnes sensibles : restez à l'intérieur",
      "Prévoir des mesures de réduction trafic",
    ],
  }
}

// Icône pollution compacte
function createPollutionIcon(aqi) {
  const color = colorForAqi(aqi)
  const bgColor = aqi <= 50 ? "#ecfdf5" : aqi <= 100 ? "#fffbeb" : "#fef2f2"
  
  const html = `
    <div style="
      background: ${bgColor};
      border: 2px solid ${color};
      border-radius: 8px;
      padding: 4px 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
    ">
      <div style="font-size: 16px; font-weight: 700; color: ${color}; line-height: 1;">
        ${aqi}
      </div>
    </div>
  `
  
  return L.divIcon({
    html: html,
    className: '',
    iconSize: [35, 28],
    iconAnchor: [17, 14],
  })
}

// Icône météo compacte
function createMeteoIcon(temp, humidity, wind) {
  const html = `
    <div style="
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 6px;
    ">
      <span style="font-size: 18px;">🌡️</span>
      <span style="font-size: 15px; font-weight: 700; color: #0369a1;">
        ${temp}°C
      </span>
    </div>
  `
  
  return L.divIcon({
    html: html,
    className: '',
    iconSize: [70, 36],
    iconAnchor: [35, 18],
  })
}

// Icône trafic compacte
function createTrafficIcon(traffic) {
  const isHigh = traffic > 100
  const isMedium = traffic > 60 && traffic <= 100
  const color = isHigh ? "#dc2626" : isMedium ? "#f59e0b" : "#10b981"
  const bgColor = isHigh ? "#fef2f2" : isMedium ? "#fffbeb" : "#ecfdf5"
  
  const html = `
    <div style="
      background: ${bgColor};
      border: 2px solid ${color};
      border-radius: 8px;
      padding: 4px 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 4px;
    ">
      <span style="font-size: 14px;">🚗</span>
      <span style="font-size: 13px; font-weight: 700; color: ${color};">
        ${traffic}
      </span>
    </div>
  `
  
  return L.divIcon({
    html: html,
    className: '',
    iconSize: [55, 28],
    iconAnchor: [27, 14],
  })
}

// Icône combinée pour afficher tout
function createCombinedIcon(aqi, temp, humidity, wind, traffic) {
  const aqiColor = colorForAqi(aqi)
  const trafficColor = traffic > 100 ? "#dc2626" : traffic > 60 ? "#f59e0b" : "#10b981"
  
  const html = `
    <div style="
      background: white;
      border: 2px solid #6b7280;
      border-radius: 10px;
      padding: 6px 10px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      backdrop-filter: blur(10px);
      min-width: 110px;
    ">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
        <span style="font-size: 12px; font-weight: 700; color: ${aqiColor};">AQI ${aqi}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
        <span style="font-size: 12px;">🌡️</span>
        <span style="font-size: 11px; font-weight: 600; color: #0369a1;">${temp}°C</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 12px;">🚗</span>
        <span style="font-size: 11px; font-weight: 600; color: ${trafficColor};">${traffic}</span>
      </div>
    </div>
  `
  
  return L.divIcon({
    html: html,
    className: '',
    iconSize: [110, 75],
    iconAnchor: [55, 37],
  })
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
  const [activeLayer, setActiveLayer] = useState("pollution") // Un seul layer actif
  const [selectedZone, setSelectedZone] = useState("centre")
  const [realData, setRealData] = useState(null)
  const [weatherData, setWeatherData] = useState(null)

  // Récupération des données réelles depuis l'API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer données air quality
        const response = await fetch('http://localhost:10000/api/sensors/latest')
        if (response.ok) {
          const data = await response.json()
          setRealData(data)
        }
        
        // Récupérer données météo réelles
        const weatherResponse = await fetch('http://localhost:10000/api/weather/current')
        if (weatherResponse.ok) {
          const weather = await weatherResponse.json()
          setWeatherData(weather)
        }
      } catch (error) {
        console.log("Données API non disponibles, utilisation des données de simulation")
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 60000) // Mise à jour chaque minute
    return () => clearInterval(interval)
  }, [])

  const zonesWithAqi = useMemo(() => {
    // Température réelle du jour (ou simulation réaliste)
    const currentTemp = weatherData?.temperature || 2 // 2°C pour fin décembre à Paris
    const currentHumidity = weatherData?.humidity || 85
    const currentWind = weatherData?.wind_speed || 12
    
    if (realData && realData.length > 0) {
      // Utiliser les données réelles de l'API
      const zoneData = {}
      realData.forEach(sensor => {
        if (!zoneData[sensor.zone_id]) {
          zoneData[sensor.zone_id] = {
            aqi: Math.round(sensor.pm25 * 2), // Approximation AQI
            temperature: Math.round(currentTemp + (Math.random() - 0.5) * 2), // Variation ±1°C
            humidity: Math.round(currentHumidity + (Math.random() - 0.5) * 5),
            wind: Math.round(currentWind + (Math.random() - 0.5) * 4),
            traffic: sensor.zone_id === "industrie" ? 120 : sensor.zone_id === "centre" ? 85 : 45,
          }
        }
      })
      
      return ZONES.filter(z => z.id !== "all").map((z) => ({
        ...z,
        aqi: zoneData[z.id]?.aqi || 70,
        coords: ZONE_COORDS[z.id] || [48.8566, 2.3522],
        temperature: zoneData[z.id]?.temperature || currentTemp,
        humidity: zoneData[z.id]?.humidity || currentHumidity,
        wind: zoneData[z.id]?.wind || currentWind,
        traffic: zoneData[z.id]?.traffic || 50,
      }))
    }
    
    // Données simulées réalistes pour Paris fin décembre
    const base = { centre: 77, industrie: 92, nord: 61 }
    return ZONES.filter(z => z.id !== "all").map((z) => ({
      ...z,
      aqi: base[z.id] ?? 70,
      coords: ZONE_COORDS[z.id] ?? [48.8566, 2.3522],
      temperature: Math.round(currentTemp + (Math.random() - 0.5) * 2), // 1-3°C
      humidity: Math.round(currentHumidity + (Math.random() - 0.5) * 5),
      wind: Math.round(currentWind + (Math.random() - 0.5) * 4),
      traffic: z.id === "industrie" ? 120 : z.id === "centre" ? 85 : 45,
    }))
  }, [realData, weatherData])

  const selected = zonesWithAqi.find((z) => z.id === selectedZone) ?? zonesWithAqi[0]
  const aqiInfo = aqiLabel(selected.aqi)
  const recos = recommendationForAqi(selected.aqi)

  const lastUpdated = useMemo(() => {
    const d = new Date()
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }, [])

  const toggle = (key) => setLayers((s) => ({ ...s, [key]: !s[key] }))
  const setAll = (value) => setLayers({ pollution: value, meteo: value, trafic: value })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm text-gray-500">Bonjour Marie Dubois</div>
          <h2 className="text-2xl font-semibold mt-1">Carte — Qualité de l'air</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Visualisez la qualité de l'air par zone. Sélectionnez une zone pour
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

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={activeLayer === "pollution"} onClick={() => setActiveLayer("pollution")}>
              Pollution
            </Chip>
            <Chip active={activeLayer === "meteo"} onClick={() => setActiveLayer("meteo")}>
              Météo
            </Chip>
            <Chip active={activeLayer === "trafic"} onClick={() => setActiveLayer("trafic")}>
              Trafic
            </Chip>

            <div className="mx-1 h-6 w-px bg-gray-200 hidden sm:block" />

            <button
              onClick={() => setActiveLayer("all")}
              className={`px-3 py-2 rounded-xl text-sm transition ${
                activeLayer === "all" 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              type="button"
            >
              Tout afficher
            </button>
            <button
              onClick={() => setActiveLayer(null)}
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
              {ZONES.filter(z => z.id !== "all").map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-100">
            <div className="h-[420px]">
              <MapContainer
                center={selected.coords}
                zoom={12}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Affichage conditionnel selon le layer actif et la zone sélectionnée */}
                {activeLayer === "pollution" && (
                  <Marker 
                    key={`pollution-${selected.id}`}
                    position={selected.coords}
                    icon={createPollutionIcon(selected.aqi)}
                    eventHandlers={{ click: () => setSelectedZone(selected.id) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{selected.label}</div>
                        <div className="mt-1 text-gray-600">AQI : {selected.aqi}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {activeLayer === "meteo" && (
                  <Marker 
                    key={`meteo-${selected.id}`}
                    position={selected.coords}
                    icon={createMeteoIcon(selected.temperature, selected.humidity, selected.wind)}
                    eventHandlers={{ click: () => setSelectedZone(selected.id) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{selected.label}</div>
                        <div className="mt-1 text-gray-600">Température : {selected.temperature}°C</div>
                        <div className="text-gray-600">Humidité : {selected.humidity}%</div>
                        <div className="text-gray-600">Vent : {selected.wind} km/h</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {activeLayer === "trafic" && (
                  <Marker 
                    key={`trafic-${selected.id}`}
                    position={selected.coords}
                    icon={createTrafficIcon(selected.traffic)}
                    eventHandlers={{ click: () => setSelectedZone(selected.id) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{selected.label}</div>
                        <div className="mt-1 text-gray-600">Trafic : {selected.traffic} véh/h</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {activeLayer === "all" && (
                  <Marker 
                    key={`all-${selected.id}`}
                    position={selected.coords}
                    icon={createCombinedIcon(selected.aqi, selected.temperature, selected.humidity, selected.wind, selected.traffic)}
                    eventHandlers={{ click: () => setSelectedZone(selected.id) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{selected.label}</div>
                        <div className="mt-1 text-gray-600">AQI : {selected.aqi}</div>
                        <div className="text-gray-600">Température : {selected.temperature}°C</div>
                        <div className="text-gray-600">Humidité : {selected.humidity}%</div>
                        <div className="text-gray-600">Vent : {selected.wind} km/h</div>
                        <div className="text-gray-600">Trafic : {selected.traffic} véh/h</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

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
              <Metric label="Trafic" value={`${selected.traffic} véh/h`} />
            </div>

            <div className="mt-4 rounded-xl bg-white border border-gray-200 p-4">
              <div className="font-semibold">{recos.title}</div>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc pl-5">
                {recos.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

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