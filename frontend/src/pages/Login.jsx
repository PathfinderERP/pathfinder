import React, { useState } from "react";
import { FaMoon, FaSun, FaEye, FaEyeSlash, FaEnvelope, FaLock } from "react-icons/fa";
import useDarkMode from "../hooks/useDarkMode";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [theme, setTheme] = useDarkMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Audio Greeting
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(`Welcome ${data.user.name || 'User'}`);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }

      // Save token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to unified dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      setError("Server not responding");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-slate-950 transition-colors duration-500 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-8 right-8 text-xl p-3 rounded-2xl shadow-lg bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 hover:scale-110 active:scale-95 transition-all duration-300 z-50 text-gray-800 dark:text-yellow-400 hover:shadow-cyan-500/20"
      >
        {theme === "dark" ? <FaSun className="animate-spin-slow" /> : <FaMoon />}
      </button>

      <div className="w-[90%] max-w-[420px] z-10">
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 relative overflow-hidden group hover:shadow-cyan-500/10 transition-shadow duration-700">
          {/* Top accent glow */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-black text-center text-gray-900 dark:text-white mb-2 tracking-tight">
              Pathfinder
            </h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 font-medium text-sm letter tracking-wide uppercase">
              ERP System Access
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-2xl text-center text-xs font-bold mb-6 animate-bounce">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Identity</label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-cyan-500 transition-colors">
                    <FaEnvelope size={14} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 font-medium"
                    placeholder="Email Address"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Secret Key</label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-cyan-500 transition-colors">
                    <FaLock size={14} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-500 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider px-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <input type="checkbox" className="rounded-full border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500/30" />
                  Remember Session
                </label>
                <span className="text-cyan-600 hover:text-cyan-400 cursor-pointer transition-colors">Recovery</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2 text-xs">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authorizing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Establish Link
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-10 font-black uppercase tracking-widest">
              No access? <span className="text-cyan-600 hover:text-cyan-400 cursor-pointer transition-colors">Request Account</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Visual background details */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl"></div>
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl"></div>
    </div>
  );
}
