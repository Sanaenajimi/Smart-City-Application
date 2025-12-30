// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("marie.env@smartcity.demo");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoUsers = [
    { name: "Marie D.", role: "Responsable Environnement", email: "marie.env@smartcity.demo", color: "emerald" },
    { name: "Paul M.", role: "Élu", email: "paul.elu@smartcity.demo", color: "blue" },
    { name: "Citoyen", role: "Citoyen", email: "citoyen@smartcity.demo", color: "purple" }
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err?.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(userEmail) {
    setEmail(userEmail);
    setPassword("demo");
    setError("");
    setLoading(true);
    try {
      await login({ email: userEmail, password: "demo" });
      navigate("/dashboard");
    } catch (err) {
      setError(err?.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left panel - Branding */}
          <div className="hidden lg:flex flex-col justify-center text-white space-y-8 p-12">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h1 className="text-5xl font-bold leading-tight">
                Smart City
                <br />
                <span className="text-emerald-400">Air Quality</span>
              </h1>
              <p className="text-xl text-white/80">
                Surveillance en temps réel de la qualité de l'air
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: "Dashboard temps réel", desc: "Visualisez les données instantanément" },
                { title: "Carte interactive", desc: "Localisez les zones à risque" },
                { title: "Prédictions IA", desc: "Anticipez les pics de pollution" },
                { title: "Rapports PDF", desc: "Exportez vos analyses" }
              ].map((feature, i) => (
                <div key={i} className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-white/70">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel - Login form */}
          <div className="flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Connexion</h2>
                  <p className="text-slate-600">Accédez à votre tableau de bord</p>
                </div>

                {/* Quick login buttons */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Connexion rapide :</p>
                  <div className="grid grid-cols-1 gap-2">
                    {demoUsers.map((user) => (
                      <button
                        key={user.email}
                        type="button"
                        onClick={() => quickLogin(user.email)}
                        disabled={loading}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-${user.color}-50 to-${user.color}-100 border-${user.color}-200 hover:border-${user.color}-300`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{user.name}</div>
                            <div className="text-xs text-white/80">{user.role}</div>
                          </div>
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">ou connectez-vous manuellement</span>
                  </div>
                </div>

                {/* Manual login form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="email@smartcity.demo"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="••••"
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Connexion...</span>
                      </>
                    ) : (
                      <span>Se connecter</span>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500">
                   Connexion sécurisée • Mode démo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}