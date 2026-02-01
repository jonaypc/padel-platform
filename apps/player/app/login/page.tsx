"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("Cuenta creada. Revisa tu email si te pide confirmación.");
  }

  async function signIn() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) setMsg(error.message);
    setMsg("Login correcto ✅");
    window.location.href = "/dashboard";
  }

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎾 PÁDEL</h1>
          <p className="text-gray-400">Accede para registrar tus partidos</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
            <input
              className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Contraseña</label>
            <input
              className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className="w-full mt-2 rounded-xl bg-green-600 hover:bg-green-700 py-3.5 text-white font-bold transition shadow-lg shadow-green-900/20 disabled:opacity-50"
            onClick={signIn}
            disabled={loading || !email || !password}
          >
            {loading ? "Iniciando..." : "Iniciar sesión"}
          </button>

          <button
            className="w-full rounded-xl bg-gray-900 border border-gray-700 py-3 text-gray-300 hover:bg-gray-750 transition disabled:opacity-50"
            onClick={signUp}
            disabled={loading || !email || !password}
          >
            {loading ? "Cargando..." : "Crear cuenta"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-500 font-medium">O continúa con</span>
            </div>
          </div>

          <button
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-gray-900 border border-gray-700 py-3 text-white font-semibold transition hover:bg-gray-750 disabled:opacity-50"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>

          {msg && (
            <div className={`mt-4 rounded-xl p-4 text-sm font-medium ${msg.includes("✅") ? "bg-green-900/30 text-green-400 border border-green-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
