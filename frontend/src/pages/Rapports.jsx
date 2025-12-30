import { useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import { ZONES, POLLUTANTS, getMockSnapshot, aqiLabel, toneClasses } from "../lib/mockData.js"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

function safeFilePart(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line, idx) => {
    doc.text(line, x, y + idx * lineHeight)
  })
  return y + lines.length * lineHeight
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Dessine un petit tableau KPI 2x3 (6 cases) — sans plugin.
 */
function drawKpiGrid(doc, { x, y, w, h, items }) {
  const cols = 3
  const rows = 2
  const cellW = w / cols
  const cellH = h / rows

  doc.setDrawColor(230)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, h, 10, 10, "FD")

  // grid lines
  doc.setDrawColor(235)
  for (let c = 1; c < cols; c++) {
    doc.line(x + c * cellW, y, x + c * cellW, y + h)
  }
  for (let r = 1; r < rows; r++) {
    doc.line(x, y + r * cellH, x + w, y + r * cellH)
  }

  // content
  doc.setFont("helvetica", "normal")
  items.slice(0, 6).forEach((it, idx) => {
    const r = Math.floor(idx / cols)
    const c = idx % cols
    const cx = x + c * cellW
    const cy = y + r * cellH

    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128) // slate-ish
    doc.text(it.label, cx + 12, cy + 18)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(17, 24, 39)
    doc.text(String(it.value), cx + 12, cy + 40)

    if (it.hint) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(107, 114, 128)
      doc.text(it.hint, cx + 12, cy + 56)
    }
  })

  // reset
  doc.setTextColor(0)
}

/**
 * Dessine une mini courbe (sparkline) dans un rectangle.
 * data: array of numbers
 */
function drawSparkline(doc, { x, y, w, h, data, threshold }) {
  doc.setDrawColor(230)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, h, 10, 10, "FD")

  // padding inside
  const pad = 12
  const ix = x + pad
  const iy = y + pad
  const iw = w - pad * 2
  const ih = h - pad * 2

  const minV = Math.min(...data)
  const maxV = Math.max(...data)
  const range = Math.max(1, maxV - minV)

  const toX = (i) => ix + (iw * i) / (data.length - 1)
  const toY = (v) => iy + ih - ((v - minV) / range) * ih

  // optional threshold line
  if (typeof threshold === "number") {
    const tY = toY(clamp(threshold, minV, maxV))
    doc.setDrawColor(239, 68, 68)
    doc.setLineDashPattern([4, 4], 0)
    doc.line(ix, tY, ix + iw, tY)
    doc.setLineDashPattern([], 0)
    doc.setDrawColor(230)
  }

  // axes baseline (light)
  doc.setDrawColor(235)
  doc.line(ix, iy + ih, ix + iw, iy + ih)

  // line path
  doc.setDrawColor(249, 115, 22) // orange-ish
  doc.setLineWidth(1.6)

  for (let i = 0; i < data.length - 1; i++) {
    doc.line(toX(i), toY(data[i]), toX(i + 1), toY(data[i + 1]))
  }

  // last point marker
  const lx = toX(data.length - 1)
  const ly = toY(data[data.length - 1])
  doc.setFillColor(249, 115, 22)
  doc.circle(lx, ly, 2.6, "F")

  // labels
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(107, 114, 128)
  doc.text(`Min: ${minV}`, ix, y + h - 6)
  doc.text(`Max: ${maxV}`, ix + iw - 40, y + h - 6)

  doc.setTextColor(0)
  doc.setLineWidth(1)
}

/**
 * Build a small deterministic series for PDF mini-chart (PM2.5 style)
 */
function buildPdfSeries(base, points = 24) {
  return Array.from({ length: points }).map((_, i) => {
    const v = base + Math.round(6 * Math.sin(i / 3) + (i % 4 === 0 ? 2 : 0))
    return Math.max(8, v)
  })
}

function downloadPdf({ zoneId, pollutant, periodDays }) {
  const snap = getMockSnapshot()
  const doc = new jsPDF({ unit: "pt", format: "a4" })

  const zoneLabel = ZONES.find((z) => z.id === zoneId)?.label ?? "—"
  const title = "Rapport Smart City — Qualité de l’air"
  const dateStr = format(new Date(), "PPPp", { locale: fr })

  // Layout constants
  const M = 40
  const W = 515
  const line = 14

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(title, M, 56)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Généré le : ${dateStr}`, M, 76)

  // Meta box
  doc.setDrawColor(230)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(M, 90, W, 70, 10, 10, "FD")

  doc.setFont("helvetica", "bold")
  doc.text("Paramètres", M + 14, 112)

  doc.setFont("helvetica", "normal")
  doc.text(`Zone : ${zoneLabel}`, M + 14, 130)
  doc.text(`Polluant : ${pollutant}`, M + 200, 130)
  doc.text(`Période : ${periodDays} jour(s)`, M + 14, 148)

  // Section: Synthèse
  const aqi = snap.kpis.aqi
  const aqiInfo = aqiLabel(aqi)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Synthèse", M, 190)

  // KPI grid (2 rows x 3 cols)
  const kpiItems = [
    { label: "AQI actuel", value: `${aqi}`, hint: aqiInfo.label },
    { label: "Température", value: `${snap.kpis.temperature}°C`, hint: "actuelle" },
    { label: "Vent", value: `${snap.kpis.wind} km/h`, hint: "moyen" },
    { label: "Humidité", value: `${snap.kpis.humidity}%`, hint: "actuelle" },
    { label: "Capteurs", value: `${snap.kpis.sensors.active}/${snap.kpis.sensors.total}`, hint: "actifs" },
    { label: "Période", value: `${periodDays}j`, hint: "sélectionnée" },
  ]

  drawKpiGrid(doc, { x: M, y: 205, w: W, h: 120, items: kpiItems })

  // Mini chart section (sparkline)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Tendance (mini-courbe)", M, 355)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text("Courbe synthétique (données simulées) — unité : µg/m³", M, 372)
  doc.setTextColor(0)

  // Build spark data depending on zone/pollutant (simple deterministic base)
  const base =
    zoneId === "industrie" ? 44 : zoneId === "centre" ? 36 : 28
  const sparkData = buildPdfSeries(base, 24)

  // Threshold based on pollutant (from your need statement, but keep simple)
  const threshold =
    pollutant === "PM2.5" ? 50 : pollutant === "PM10" ? 80 : pollutant === "NO2" ? 200 : null

  drawSparkline(doc, { x: M, y: 385, w: W, h: 120, data: sparkData, threshold })

  // Section: Alerts
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Alertes récentes", M, 535)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  const alerts = snap.alerts.slice(0, 6)
  let y = 555

  if (alerts.length === 0) {
    doc.text("Aucune alerte.", M, y)
    y += 18
  } else {
    alerts.forEach((a) => {
      const lineText = `• ${a.pollutant} — ${a.zone} — ${a.value}${a.unit} (seuil ${a.threshold}${a.unit}) — ${a.time}`
      const nextY = addWrappedText(doc, lineText, M, y, W, line)
      y = nextY + 4

      if (y > 740) {
        doc.addPage()
        y = 60
      }
    })
  }

  // Footer note
  const footer =
    "Note : rapport généré à partir de données simulées (mode démo). Les données réelles seront branchées via API."
  doc.setFont("helvetica", "italic")
  doc.setFontSize(9)
  addWrappedText(doc, footer, M, 780, W, 12)

  const fileName = `rapport_${safeFilePart(zoneLabel)}_${safeFilePart(pollutant)}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
  doc.save(fileName)
}

export default function Rapports() {
  const [zoneId, setZoneId] = useState("centre")
  const [pollutant, setPollutant] = useState("PM2.5")
  const [periodDays, setPeriodDays] = useState(7)
  const [formatType, setFormatType] = useState("PDF")

  const [isGenerating, setIsGenerating] = useState(false)
  const [toast, setToast] = useState(null)

  const canDownload = useMemo(() => formatType === "PDF" && !isGenerating, [formatType, isGenerating])

  const preview = useMemo(() => {
    const snap = getMockSnapshot()
    const aqiInfo = aqiLabel(snap.kpis.aqi)
    return { snap, aqiInfo }
  }, [])

  const zoneLabel = ZONES.find((z) => z.id === zoneId)?.label ?? "—"

  async function handleDownload() {
    try {
      setIsGenerating(true)
      await new Promise((r) => setTimeout(r, 120))
      downloadPdf({ zoneId, pollutant, periodDays })
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSchedule() {
    setToast(`Programmation (démo) : rapport ${pollutant} — ${zoneLabel} (${periodDays}j) planifié.`)
    window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Bonjour Marie Dubois</div>
          <h2 className="text-2xl font-semibold mt-1">Rapports</h2>
          <p className="text-sm text-gray-500 mt-2">
            Générez un rapport synthétique (PDF) pour les élus et parties prenantes.
          </p>
        </div>
      </div>

      {/* Aperçu */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Aperçu instantané</div>
            <div className="mt-1 text-lg font-semibold">Qualité de l’air — maintenant</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${toneClasses(preview.aqiInfo.tone)}`}>
                {preview.aqiInfo.label} (AQI {preview.snap.kpis.aqi})
              </div>
              <div className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-800 font-semibold">
                {preview.snap.kpis.temperature}°C • {preview.snap.kpis.wind} km/h • {preview.snap.kpis.humidity}%
              </div>
              <div className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-800 font-semibold">
                Capteurs : {preview.snap.kpis.sensors.active}/{preview.snap.kpis.sensors.total}
              </div>
            </div>
          </div>

          {toast && (
            <div className="px-4 py-3 rounded-xl text-sm border border-emerald-200 bg-emerald-50 text-emerald-900">
              {toast}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Field label="Zone">
            <select
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Polluant">
            <select
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={pollutant}
              onChange={(e) => setPollutant(e.target.value)}
            >
              {POLLUTANTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Période">
            <select
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
            >
              <option value={1}>24h</option>
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
            </select>
          </Field>

          <Field label="Format">
            <select
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
            >
              <option value="PDF">PDF</option>
              <option value="CSV" disabled>
                CSV (bientôt)
              </option>
            </select>
          </Field>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className={`px-4 py-3 rounded-xl text-sm font-semibold transition ${
              canDownload ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-200 text-gray-500"
            }`}
          >
            {isGenerating ? "Génération…" : "Télécharger le PDF"}
          </button>

          <button
            onClick={handleSchedule}
            className="px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 transition"
            type="button"
          >
            Programmer
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      {children}
    </div>
  )
}
