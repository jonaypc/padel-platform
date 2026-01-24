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
  window.location.href = "/app";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Accede para registrar tus partidos de pádel.
        </p>

        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl border px-4 py-3"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-xl border px-4 py-3"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="w-full rounded-xl bg-black py-3 text-white disabled:opacity-50"
            onClick={signIn}
            disabled={loading || !email || !password}
          >
            {loading ? "Cargando..." : "Iniciar sesión"}
          </button>

          <button
            className="w-full rounded-xl border py-3 disabled:opacity-50"
            onClick={signUp}
            disabled={loading || !email || !password}
          >
            {loading ? "Cargando..." : "Crear cuenta"}
          </button>

          {msg && (
            <div className="rounded-xl bg-zinc-100 p-3 text-sm text-zinc-700">
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
