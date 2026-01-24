"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import PageWrapper from "../../components/PageWrapper";

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  type PublicStats = {
    totalMatches: number;
    victories: number;
    defeats: number;
    winPercentage: number;
  };

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!userId) {
        setError("ID de usuario inválido");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Obtener estadísticas públicas del usuario
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("set1_us, set1_them, set2_us, set2_them, set3_us, set3_them")
        .eq("user_id", userId);

      if (matchesError) {
        setError("No se pudo cargar el perfil");
        setLoading(false);
        return;
      }

      // Calcular estadísticas básicas
      const matches = matchesData || [];
      let victories = 0;
      let defeats = 0;

      matches.forEach((match) => {
        const sets: Array<[number | null, number | null]> = [
          [match.set1_us, match.set1_them],
          [match.set2_us, match.set2_them],
          [match.set3_us, match.set3_them],
        ];
        let us = 0;
        let them = 0;
        for (const [a, b] of sets) {
          if (a != null && b != null) {
            if (a > b) us++;
            else if (b > a) them++;
          }
        }
        if (us > them) victories++;
        else if (them > us) defeats++;
      });

      const totalPlayed = victories + defeats;
      const winPercentage = totalPlayed > 0 ? Math.round((victories / totalPlayed) * 100) : 0;

      setStats({
        totalMatches: matches.length,
        victories,
        defeats,
        winPercentage,
      });

      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) {
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
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-center text-gray-300">Cargando perfil...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !stats) {
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
        <div className="bg-gray-800 border border-red-700 rounded-xl p-6 text-red-400">
          <p className="font-medium">Ha ocurrido un error</p>
          <p className="text-sm mt-1 text-red-300">{error || "Perfil no encontrado o privado"}</p>
        </div>
      </PageWrapper>
    );
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
        title="Perfil Público"
        subtitle="Estadísticas públicas del jugador"
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard value={stats.totalMatches} label="Partidos" />
          <StatCard value={stats.victories} label="Victorias" valueColor="text-green-500" />
          <StatCard value={stats.defeats} label="Derrotas" valueColor="text-red-500" />
          <StatCard value={`${stats.winPercentage}%`} label="% Victorias" valueColor="text-blue-500" />
        </div>

        <div className="pt-6 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            Este es un perfil público. Para ver más detalles, inicia sesión.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
