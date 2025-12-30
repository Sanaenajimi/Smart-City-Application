import { useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "smartcity_settings_v1"

const DEFAULTS = {
  notificationsEmail: true,
  notificationsInApp: true,
  thresholds: {
    pm25: 50,
    pm10: 80,
    no2: 200,
  },
  preferredView: "dashboard",
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...parsed,
      thresholds: { ...DEFAULTS.thresholds, ...(parsed.thresholds ?? {}) },
    }
  } catch {
    return DEFAULTS
  }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export default function Parametres() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  useEffect(() => {
    if (!settings) return
    saveSettings(settings)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1200)
    return () => clearTimeout(t)
  }, [settings])

  const isValid = useMemo(() => {
    const { pm25, pm10, no2 } = settings.thresholds
    return pm25 > 0 && pm10 > 0 && no2 > 0
  }, [settings])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Bonjour Marie Dubois</div>
          <h2 className="text-2xl font-semibold mt-1">Paramètres</h2>
          <p className="text-sm text-gray-500 mt-2">
            Configurez les seuils d’alerte et les notifications. Les valeurs par défaut respectent l’expression de besoin.
          </p>
        </div>

        <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${saved ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600"}`}>
          {saved ? "Sauvegardé" : "Auto-sauvegarde"}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-6">
        <Section title="Profil">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Readonly label="Utilisateur" value="Marie Dubois" />
            <Readonly label="Rôle" value="Responsable Environnement" />
            <Readonly label="Territoire" value="Métropole (démo)" />
          </div>
        </Section>

        <Section title="Notifications">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Toggle
              label="Notifications email"
              value={settings.notificationsEmail}
              onChange={(v) => setSettings((s) => ({ ...s, notificationsEmail: v }))}
            />
            <Toggle
              label="Notifications in-app"
              value={settings.notificationsInApp}
              onChange={(v) => setSettings((s) => ({ ...s, notificationsInApp: v }))}
            />
          </div>
        </Section>

        <Section title="Seuils d’alerte">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField
              label="PM2.5 (µg/m³)"
              value={settings.thresholds.pm25}
              onChange={(v) => setSettings((s) => ({ ...s, thresholds: { ...s.thresholds, pm25: v } }))}
            />
            <NumberField
              label="PM10 (µg/m³)"
              value={settings.thresholds.pm10}
              onChange={(v) => setSettings((s) => ({ ...s, thresholds: { ...s.thresholds, pm10: v } }))}
            />
            <NumberField
              label="NO2 (µg/m³)"
              value={settings.thresholds.no2}
              onChange={(v) => setSettings((s) => ({ ...s, thresholds: { ...s.thresholds, no2: v } }))}
            />
          </div>
          {!isValid && <div className="text-sm text-rose-600 mt-2">Veuillez saisir des seuils valides (&gt; 0).</div>}
        </Section>

        <Section title="Préférences d’affichage">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Vue par défaut :</span>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={settings.preferredView}
              onChange={(e) => setSettings((s) => ({ ...s, preferredView: e.target.value }))}
            >
              <option value="dashboard">Dashboard</option>
              <option value="carte">Carte</option>
              <option value="predictions">Prédictions</option>
              <option value="rapports">Rapports</option>
            </select>
          </div>
        </Section>

        <div className="pt-2 flex gap-3">
          <button
            onClick={() => setSettings(DEFAULTS)}
            className="px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  )
}

function Readonly({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full text-left bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between"
    >
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-lg font-semibold mt-1">{value ? "Activé" : "Désactivé"}</div>
      </div>
      <span className={`inline-block w-12 h-7 rounded-full ${value ? "bg-emerald-500" : "bg-gray-300"}`}>
        <span className={`block w-6 h-6 bg-white rounded-full mt-0.5 transition-all ${value ? "ml-6" : "ml-1"}`} />
      </span>
    </button>
  )
}

function NumberField({ label, value, onChange }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
      />
    </div>
  )
}
