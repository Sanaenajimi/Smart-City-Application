// frontend/src/components/Header.jsx
import { LogOut, UserRound } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../lib/auth";

export default function Header({ onLogout, snapshot }) {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);

  function handleLogout() {
    logout();
    onLogout?.();
    navigate("/login", { replace: true });
  }

  const updatedAt = snapshot?.updatedAt;

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-900 text-white grid place-items-center font-semibold shrink-0">
            SC
          </div>
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">Smart City Air Quality</div>
            <div className="text-sm text-gray-500 leading-tight truncate">Surveillance en temps réel</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>{updatedAt ? `Mis à jour : ${updatedAt}` : "Mis à jour"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm">
            <UserRound className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">{user?.short || user?.name || "Utilisateur"}</span>
            <span className="sm:hidden">{user?.short?.split(" ")[0] || "User"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
