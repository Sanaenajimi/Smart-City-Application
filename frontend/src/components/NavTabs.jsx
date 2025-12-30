// frontend/src/components/NavTabs.jsx
import { NavLink } from "react-router-dom";
import { BarChart3, Map, LineChart, FileText, Settings } from "lucide-react";
import { useMemo } from "react";
import { getUser } from "../lib/auth";

const ALL_TABS = [
  { to: "/dashboard", label: "Dashboard", Icon: BarChart3, personas: ["env", "elected", "citizen"] },
  { to: "/carte", label: "Carte", Icon: Map, personas: ["env", "elected", "citizen"] },
  { to: "/predictions", label: "Prédictions", Icon: LineChart, personas: ["env"] },
  { to: "/rapports", label: "Rapports", Icon: FileText, personas: ["env", "elected"] },
  { to: "/parametres", label: "Paramètres", Icon: Settings, personas: ["env", "elected"] },
];

export default function NavTabs() {
  const user = useMemo(() => getUser(), []);
  const persona = user?.persona || "env";

  const tabs = ALL_TABS.filter((t) => t.personas.includes(persona));

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1 overflow-x-auto no-scrollbar">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                "shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm transition " +
                (isActive ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-600 hover:text-gray-900")
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          <div className="ml-auto hidden lg:flex items-center px-3 py-2 text-xs font-semibold text-gray-500">
            {persona === "citizen" ? "Citoyen" : persona === "elected" ? "Élu" : "Responsable Environnement"}
          </div>
        </div>
      </div>
    </nav>
  );
}
