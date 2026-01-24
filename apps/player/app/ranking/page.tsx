"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";
import { Trophy, Medal, User } from "lucide-react";
import { getRankingTier } from "@padel/core";

interface RankingRow {
  user_id: string;
  display_name: string;
  username: string | null;
  is_public: boolean;
  avatar_url: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  points: number;
  win_rate: number;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRankings() {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, is_public, avatar_url, elo_rating")
        .order("elo_rating", { ascending: false })
        .limit(50);

      if (!error && data) {

        const mapped = data.map(p => ({
          user_id: p.id,
          display_name: p.display_name || "Jugador",
          username: p.username,
          is_public: p.is_public || false,
          avatar_url: p.avatar_url,
          points: p.elo_rating ?? 1200,
          // Datos temporales hasta tener una vista eficiente de estadísticas + ELO
          matches_played: 0,
          wins: 0,
          losses: 0,
          win_rate: 0
        }));
        setRankings(mapped);
      }
      setLoading(false);
    }

    loadRankings();
  }, []);

  function getMedalColor(index: number) {
    switch (index) {
      case 0: return "text-yellow-400"; // Gold
      case 1: return "text-gray-300";   // Silver
      case 2: return "text-amber-600";  // Bronze
      default: return "text-gray-500";
    }
  }

  const renderPlayerContent = (player: RankingRow, index: number) => {
    const tier = getRankingTier(player.points);

    return (
      <div className="grid grid-cols-12 gap-2 md:gap-4 p-4 items-center">

        {/* Posición */}
        <div className="col-span-1 flex justify-center">
          {index < 3 ? (
            <Trophy size={20} className={getMedalColor(index)} />
          ) : (
            <span className="text-gray-500 font-mono font-bold text-lg">
              {index + 1}
            </span>
          )}
        </div>

        {/* Jugador */}
        <div className="col-span-7 md:col-span-4 flex items-center gap-3">
          <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-700 border border-gray-600 overflow-hidden shrink-0">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-full h-full p-2 text-gray-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white truncate">{player.display_name}</p>
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 border border-gray-700 ${tier.info.color} text-sm`}
                title={tier.info.label}
              >
                {tier.info.icon}
              </span>
            </div>
            {player.username && (
              <p className="text-xs text-gray-500 hidden md:block">@{player.username}</p>
            )}
            {/* Info extra visible solo en móvil */}
            <div className="md:hidden flex items-center gap-2 text-xs mt-0.5">
              <span className="text-green-400 font-mono">{player.points} pts</span>
              <span className="text-gray-600">•</span>
              <span className={tier.info.color}>{tier.info.label}</span>
            </div>
          </div>
        </div>

        {/* Puntos (Desktop) */}
        <div className="hidden md:block col-span-2 text-center">
          <div className="flex flex-col items-center">
            <span className="font-mono text-xl font-bold text-green-400">{player.points}</span>
            <span className={`text-xs ${tier.info.color}`}>{tier.info.label}</span>
          </div>
        </div>

        {/* Partidos */}
        <div className="col-span-2 hidden md:block text-center text-gray-300">
          {player.matches_played}
        </div>

        {/* Win Rate */}
        <div className="col-span-4 md:col-span-3 text-right md:text-center">
          <div className="flex flex-col items-end md:items-center">
            <div className="text-sm font-bold text-white">{player.win_rate}%</div>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${player.win_rate >= 50 ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${player.win_rate}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 md:hidden mt-0.5">
              {player.wins}V - {player.losses}D
            </span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Clasificación"
        subtitle="Top 50 jugadores por puntuación"
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
            Cargando ranking...
          </div>
        ) : rankings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No hay jugadores clasificados aún.
          </div>
        ) : (
          <div>
            {/* Header de la tabla (oculto en móvil, visible en md) */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-gray-700 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">Pos</div>
              <div className="col-span-4">Jugador</div>
              <div className="col-span-2 text-center">Pts</div>
              <div className="col-span-2 text-center">Partidos</div>
              <div className="col-span-3 text-center">% Victorias</div>
            </div>

            {/* Lista de jugadores */}
            <div className="divide-y divide-gray-700">
              {rankings.map((player, index) => (
                player.is_public && player.username ? (
                  <Link
                    key={player.user_id}
                    href={`/players/${player.username}`}
                    className="block hover:bg-gray-750 transition"
                  >
                    {renderPlayerContent(player, index)}
                  </Link>
                ) : (
                  <div key={player.user_id} className="block cursor-default">
                    {renderPlayerContent(player, index)}
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leyenda de Niveles */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-base font-bold text-white mb-3">Niveles de Ranking</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-xl">🍂</div>
                <span className="text-sm font-medium text-stone-400">Beginner</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">0 - 1099</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-xl">🥉</div>
                <span className="text-sm font-medium text-amber-700">Amateur</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">1100 - 1199</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-xl">🥈</div>
                <span className="text-sm font-medium text-white">Intermedio</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">1200 - 1399</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-xl">🥇</div>
                <span className="text-sm font-medium text-yellow-400">Pro</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">1400 - 1599</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-xl">💎</div>
                <span className="text-sm font-medium text-cyan-400">Elite</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">1600+</span>
            </div>
          </div>
        </div>

        {/* Explicación del sistema */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-base font-bold text-white mb-3">¿Cómo funciona?</h3>
          <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
            <p>
              Usamos un sistema <strong>ELO dinámico</strong> donde los puntos dependen del nivel rival.
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <span className="text-green-400 font-medium">Ganar a mejores:</span> Recibes muchos puntos (hasta +32).
              </li>
              <li>
                <span className="text-yellow-400 font-medium">Ganar a peores:</span> Recibes pocos puntos (ej. +5).
              </li>
              <li>
                <span className="text-red-400 font-medium">Perder vs peores:</span> Te penaliza mucho (-20 o más).
              </li>
            </ul>
            <div className="mt-2 p-2 bg-gray-700/50 rounded-lg border border-gray-600 italic opacity-80">
              ℹ️ Se calcula con la media ELO de tu pareja vs rivales.
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
