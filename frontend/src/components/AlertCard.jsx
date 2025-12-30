import { Check, X, AlertTriangle, Zap } from "lucide-react";

function badgeTone(severity) {
  if (severity?.toLowerCase().includes("crit")) return "bg-rose-600 text-white";
  return "bg-orange-500 text-white";
}

export default function AlertCard({ alert, onAck, onDismiss }) {
  const Icon = alert.kind === "prediction" ? Zap : AlertTriangle;

  return (
    <div className="border border-orange-300 bg-orange-50 rounded-2xl p-4 flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-orange-600">
          <Icon size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold">
              {alert.kind === "prediction"
                ? "Prédiction : Pic de pollution probable"
                : `Alerte ${alert.pollutant} – ${alert.zone}`}
            </div>
            <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + badgeTone(alert.severity)}>
              {alert.severity}
            </span>
          </div>

          <div className="text-sm text-gray-700 mt-1">
            {alert.value != null && alert.threshold != null ? (
              <>
                Niveau {alert.pollutant} élevé : <b>{alert.value}{alert.unit}</b> (seuil : <b>{alert.threshold}{alert.unit}</b>).{" "}
              </>
            ) : null}
            {alert.advice}
          </div>

          <div className="text-xs text-gray-500 mt-2 flex gap-3 flex-wrap">
            <span>🕒 {alert.time}</span>
            {alert.meta?.map((m) => (
              <span key={m}>• {m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
          title="Marquer comme traité"
          onClick={() => onAck?.(alert.id)}
        >
          <Check size={16} />
        </button>
        <button
          className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
          title="Ignorer"
          onClick={() => onDismiss?.(alert.id)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
