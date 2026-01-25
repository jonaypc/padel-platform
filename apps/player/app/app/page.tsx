"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppHeader from "../components/AppHeader";
import CircularMetric from "../components/CircularMetric";
import MonitorCard from "../components/MonitorCard";
import LastMatchCard from "../components/LastMatchCard";
import BottomNav from "../components/BottomNav";
import StatCard from "../components/StatCard";

type MatchRow = {
  id: string;
  played_at: string | null;
  match_type: "pachanga" | "entrenamiento" | "liga" | "torneo" | null;
  partner_name: string | null;
  location: string | null;
  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;
  notes: string | null;
};

function hasAnyScore(m: MatchRow): boolean {
  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];
  return sets.some(([a, b]) => a != null && b != null);
}

function isIncompleteMatch(m: MatchRow): boolean {
  if (m.notes && m.notes.includes("[PARTIDO INACABADO")) {
    return true;
  }

  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];

  let us = 0;
  let them = 0;
  let setsCompletados = 0;

  for (const [a, b] of sets) {
    if (a == null || b == null) continue;
    setsCompletados++;
    if (a > b) us++;
    else if (b > a) them++;
  }

  if (setsCompletados === 0) return false;

  const partidoCompleto =
    (setsCompletados >= 2 && (us >= 2 || them >= 2)) ||
    (setsCompletados === 3 && us !== them);

  return !partidoCompleto;
}

function isWin(m: MatchRow): boolean | null {
  if (isIncompleteMatch(m)) return null;

  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];

  let us = 0;
  let them = 0;

  for (const [a, b] of sets) {
    if (a == null || b == null) continue;
    if (a > b) us++;
    else if (b > a) them++;
  }

  if (us === 0 && them === 0) return null;
  if (us === them) return null;
  return us > them;
}

function formatScore(m: MatchRow): string {
  const scores: string[] = [];
  if (m.set1_us != null && m.set1_them != null) {
    scores.push(`${m.set1_us}-${m.set1_them}`);
  }
  if (m.set2_us != null && m.set2_them != null) {
    scores.push(`${m.set2_us}-${m.set2_them}`);
  }
  if (m.set3_us != null && m.set3_them != null) {
    scores.push(`${m.set3_us}-${m.set3_them}`);
  }
  return scores.join(" / ") || "Sin resultado";
}

function getTimeAgo(dateString: string | null): string {
  if (!dateString) return "Fecha desconocida";

  const date = new Date(dateString);
  const now = new Date();

  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = nowMidnight.getTime() - dateMidnight.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} semana${weeks > 1 ? "s" : ""}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Hace ${months} mes${months > 1 ? "es" : ""}`;
  }
  const years = Math.floor(diffDays / 365);
  return `Hace ${years} año${years > 1 ? "s" : ""}`;
}

export default function AppHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [nowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.replace("/login");
          return;
        }

        const email = sessionData.session.user.email || "";
        const name = email.split("@")[0];
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));

        const { data: matchesData } = await supabase
          .from("matches")
          .select(
            "id, played_at, match_type, partner_name, location, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them, notes"
          )
          .order("played_at", { ascending: false })
          .limit(50);

        if (matchesData) {
          setMatches(matchesData as MatchRow[]);
        }
      } catch (err) {
        console.error("Error loading home:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) return <div className="p-6">Cargando...</div>;

  const now = new Date();
  const currentTimestamp = now.getTime();
  const pastMatches = matches.filter((m) => {
    if (!m.played_at) return false;
    const matchDate = new Date(m.played_at);
    if (Number.isNaN(matchDate.getTime())) return false;
    const matchTimestamp = matchDate.getTime();
    if (matchTimestamp > currentTimestamp) return false;
    const hasScore = hasAnyScore(m);
    const isIncomplete = isIncompleteMatch(m);
    return hasScore || isIncomplete;
  });

  const results = pastMatches.map(isWin);
  const validResults = results.filter((r): r is boolean => r !== null);
  const victories = validResults.filter((r) => r === true).length;
  const matchesWithResult = validResults.length;
  const totalPlayed = pastMatches.length;
  const winPercentage = matchesWithResult > 0 ? Math.round((victories / matchesWithResult) * 100) : 0;

  let winStreak = 0;
  for (const result of results) {
    if (result === null) continue;
    if (result === true) winStreak++;
    else if (result === false) break;
  }

  let bestWinStreak = 0;
  let current = 0;
  for (const result of results) {
    if (result === null) continue;
    if (result === true) {
      current++;
      if (current > bestWinStreak) bestWinStreak = current;
    } else if (result === false) {
      current = 0;
    }
  }

  const recentMatches = pastMatches.filter((m) => {
    if (!m.played_at) return false;
    const matchDate = new Date(m.played_at);
    const daysDiff = (nowTimestamp - matchDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  const activityLevel = recentMatches >= 3 ? "ALTO" : recentMatches >= 1 ? "MEDIO" : "BAJO";

  const MIN_COMPLETED_FOR_RANK = 3;

  function bestByField(field: "partner_name" | "location") {
    const map: Record<string, { wins: number; total: number }> = {};

    for (const m of pastMatches) {
      const r = isWin(m);
      if (r === null) continue;

      const key = (m[field] as string) || (field === "partner_name" ? "Sin pareja" : "Sin ubicación");
      if (!map[key]) map[key] = { wins: 0, total: 0 };

      map[key].total++;
      if (r === true) map[key].wins++;
    }

    const best = Object.entries(map)
      .filter(([, v]) => v.total >= MIN_COMPLETED_FOR_RANK)
      .map(([name, v]) => ({
        name,
        total: v.total,
        pct: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)[0];

    return best ?? null;
  }

  const bestPartner = bestByField("partner_name");
  const bestLocation = bestByField("location");

  return (
    <div className="min-h-screen bg-gray-900 pb-20 md:pb-6">
      <AppHeader />

      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6">
        {/* Título principal */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">PÁDEL</h1>
          {userName && <p className="text-sm text-gray-400">Hola, {userName}</p>}
        </div>

        {/* Métricas principales circulares */}
        {totalPlayed > 0 && (
          <div className="flex justify-around items-center mb-6 bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <CircularMetric
              value={`${winPercentage}%`}
              label="VICTORIAS"
              percentage={winPercentage}
              color="green"
              onClick={() => router.push("/stats")}
            />
            <CircularMetric
              value={totalPlayed}
              label="PARTIDOS"
              percentage={Math.min((totalPlayed / 50) * 100, 100)}
              color="blue"
              onClick={() => router.push("/matches")}
            />
            <CircularMetric
              value={winStreak}
              label="RACHA"
              percentage={Math.min((winStreak / 10) * 100, 100)}
              color="orange"
              onClick={() => router.push("/stats")}
            />
          </div>
        )}

        {/* Mi Ranking */}
        {totalPlayed > 0 && (
          <div className="mb-6 bg-gray-800 rounded-2xl p-4 border border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">🏆 Mi Ranking</h2>
              <button
                onClick={() => router.push("/stats")}
                className="text-xs text-green-500 hover:text-green-400 transition"
              >
                Ver más →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Mejor pareja"
                value={bestPartner ? `${bestPartner.name} (${bestPartner.pct}%)` : "—"}
              />
              <StatCard
                label="Mejor ubicación"
                value={bestLocation ? `${bestLocation.name} (${bestLocation.pct}%)` : "—"}
              />
              <StatCard label="Mejor racha" value={bestWinStreak} />
              <StatCard label="% victorias" value={`${winPercentage}%`} />
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Nota: este ranking se calcula con tus <span className="text-gray-300">últimos 50</span> partidos.
            </p>
          </div>
        )}

        {/* Tarjetas de monitores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MonitorCard
            title="RENDIMIENTO"
            status={winPercentage >= 60 ? "EXCELENTE" : winPercentage >= 50 ? "BUENO" : "MEJORABLE"}
            value={winPercentage >= 60 ? "✓" : ""}
            subtitle={`${victories}/${totalPlayed} partidos`}
            color="green"
            onClick={() => router.push("/stats")}
          />
          <MonitorCard
            title="ACTIVIDAD"
            status={activityLevel}
            value={recentMatches > 0 ? `${recentMatches}` : "0"}
            subtitle="Esta semana"
            color="blue"
            onClick={() => router.push("/matches")}
          />
          <button
            onClick={() => router.push("/new-match")}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gray-750 transition"
          >
            <span className="text-2xl">+</span>
            <span className="text-xs font-medium text-gray-300 text-center">Añadir resultado</span>
          </button>
          <button
            onClick={() => router.push("/organize-match")}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gray-750 transition"
          >
            <span className="text-2xl">🎾</span>
            <span className="text-xs font-medium text-white text-center">Montar partido</span>
          </button>
        </div>

        {/* Sección Mi actividad reciente */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Mi actividad reciente</h2>
          </div>

          {matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pastMatches.slice(0, 6).map((match) => {
                const matchResult = isWin(match);
                const isIncomplete = match.notes && match.notes.includes("[PARTIDO INACABADO");

                let setsCompletados = 0;
                if (match.set1_us != null && match.set1_them != null) setsCompletados++;
                if (match.set2_us != null && match.set2_them != null) setsCompletados++;
                if (match.set3_us != null && match.set3_them != null) setsCompletados++;

                let us = 0, them = 0;
                if (match.set1_us != null && match.set1_them != null) {
                  if (match.set1_us > match.set1_them) us++;
                  else if (match.set1_them > match.set1_us) them++;
                }
                if (match.set2_us != null && match.set2_them != null) {
                  if (match.set2_us > match.set2_them) us++;
                  else if (match.set2_them > match.set2_us) them++;
                }
                if (match.set3_us != null && match.set3_them != null) {
                  if (match.set3_us > match.set3_them) us++;
                  else if (match.set3_them > match.set3_us) them++;
                }

                const partidoCompleto =
                  (setsCompletados >= 2 && (us >= 2 || them >= 2)) ||
                  (setsCompletados === 3 && us !== them);

                const resultText =
                  isIncomplete || (!partidoCompleto && setsCompletados > 0)
                    ? "Inacabado"
                    : matchResult === true
                      ? "Victoria"
                      : matchResult === false
                        ? "Derrota"
                        : null;

                const score = formatScore(match);
                const timeAgo = getTimeAgo(match.played_at);

                return (
                  <div key={match.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <LastMatchCard
                      result={resultText}
                      score={score}
                      timeAgo={timeAgo}
                      matchId={match.id}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              <p className="text-gray-400 text-sm">No hay partidos registrados todavía</p>
            </div>
          )}
        </div>

        {/* Accesos Rápidos */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
              Accesos Rápidos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/ranking"
              className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Ranking</p>
                    <p className="text-xs text-gray-400">Ver clasificación</p>
                  </div>
                </div>
                <span className="text-green-500">→</span>
              </div>
            </Link>

            <Link
              href="/clubs"
              className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏟️</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Clubs</p>
                    <p className="text-xs text-gray-400">Explorar clubs</p>
                  </div>
                </div>
                <span className="text-green-500">→</span>
              </div>
            </Link>

            <Link
              href="/reservations"
              className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Mis Reservas</p>
                    <p className="text-xs text-gray-400">Ver tus reservas</p>
                  </div>
                </div>
                <span className="text-green-500">→</span>
              </div>
            </Link>

            <Link
              href="/feed"
              className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Feed</p>
                    <p className="text-xs text-gray-400">Actividad reciente</p>
                  </div>
                </div>
                <span className="text-green-500">→</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* BottomNav solo visible en móvil */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
