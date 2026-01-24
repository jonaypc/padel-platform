"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";

export default function InvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Verificar sesión
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      }
    });
  }, [router]);

  async function sendInvitation() {
    if (!email || !email.includes("@")) {
      setMessage("Por favor, introduce un email válido");
      return;
    }

    setLoading(true);
    setMessage(null);

    // En una implementación real, aquí enviarías un email con el enlace de invitación
    // Por ahora, simplemente mostramos un mensaje de confirmación
    setTimeout(() => {
      setMessage(`Invitación enviada a ${email}. El jugador recibirá un enlace para unirse.`);
      setEmail("");
      setLoading(false);
    }, 1000);
  }

  return (
    <PageWrapper>
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-500 transition"
        >
          <span>←</span>
          <span>Volver</span>
        </button>
      </div>
      <PageHeader 
        title="Invitar Jugador"
        subtitle="Invita a otros jugadores a unirse a la aplicación y compartir partidos contigo"
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Email del jugador
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@ejemplo.com"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
              disabled={loading}
            />
          </div>

          <button
            onClick={sendInvitation}
            disabled={loading || !email}
            className="w-full rounded-lg bg-green-600 py-3 text-white disabled:opacity-50 hover:bg-green-700 transition"
          >
            {loading ? "Enviando..." : "Enviar invitación"}
          </button>

          {message && (
            <div className="rounded-lg bg-green-900/30 border border-green-700 p-3 text-sm text-green-300 mt-4">
              {message}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-700">
            <h2 className="text-lg font-medium mb-3 text-white">Cómo compartir partidos</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Ve a cualquier partido en tu historial</li>
              <li>Haz clic en el botón &quot;Compartir&quot;</li>
              <li>Copia el enlace generado</li>
              <li>Envía el enlace a quien quieras</li>
              <li>El enlace permite ver el partido sin necesidad de iniciar sesión</li>
            </ol>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
