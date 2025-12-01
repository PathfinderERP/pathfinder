import React, { useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import useDarkMode from "../hooks/useDarkMode";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [theme, setTheme] = useDarkMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      // Save token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to unified dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Server not responding");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen w-full flex justify-center items-center bg-gray-100 dark:bg-gray-900">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 text-xl p-2 rounded-full shadow-md bg-gray-200 dark:bg-gray-700"
      >
        {theme === "dark" ? <FaSun /> : <FaMoon />}
      </button>

      <div className="w-[350px] md:w-[400px] bg-white/30 dark:bg-gray-800/40 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Login
        </h1>

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-center font-semibold mb-3">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white focus:outline-none"
              placeholder="Enter email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white focus:outline-none"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-300 mt-4">
          Don’t have an account?{" "}
          <span className="text-blue-600 cursor-pointer">Register</span>
        </p>
      </div>
    </div>
  );
}
