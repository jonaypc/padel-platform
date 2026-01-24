"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";
import { computeAchievements } from "./achievements";
import { MatchRow } from "./types";

// Función helper para detectar si un partido tiene algún set informado
function hasAnyScore(m: MatchRow): boolean {
  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];
  return sets.some(([a, b]) => a != null && b != null);
}

// Función helper para detectar si un partido está inacabado
function isIncompleteMatch(m: MatchRow): boolean {
  // Verificar si el partido está marcado como inacabado en las notas
  if (m.notes && m.notes.includes("[PARTIDO INACABADO")) {
    return true;
  }

  // Verificar si hay sets completados pero no hay un ganador claro
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

  if (setsCompletados === 0) return false; // No hay sets, no está inacabado (simplemente sin resultado)

  // Un partido está completo si:
  // - Se han jugado al menos 2 sets y un equipo ha ganado 2 sets
  // - O se han jugado 3 sets y hay un ganador claro
  const partidoCompleto =
    (setsCompletados >= 2 && (us >= 2 || them >= 2)) ||
    (setsCompletados === 3 && us !== them);

  return !partidoCompleto; // Si no está completo y hay sets, está inacabado
}

function isWin(m: MatchRow): boolean | null {
  // Si está inacabado, no cuenta como victoria ni derrota
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

type TimeRange = "all" | "thisweek" | "thismonth" | "30days" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDateInput(value: string) {
  // value esperado: "YYYY-MM-DD" (input type="date")
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(monthKey: string) {
  // "2026-01" -> "01/2026"
  const [y, m] = monthKey.split("-");
  return `${m}/${y}`;
}

export default function StatsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [achievementsExpanded, setAchievementsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      // 1) Comprobar sesión (ruta protegida)
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        setError("Error comprobando sesión.");
        setLoading(false);
        return;
      }

      if (!authData.user) {
        router.push("/login");
        return;
      }

      // 2) Una única consulta a matches (filtros temporales se aplican en frontend)
      const { data, error: fetchError } = await supabase
        .from("matches")
        .select(
          "id, played_at, match_type, partner_name, location, opponent1_name, opponent2_name, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them, notes"
        )
        .order("played_at", { ascending: false });

      if (fetchError) {
        setError("No se pudieron cargar tus partidos.");
        setLoading(false);
        return;
      }

      setMatches((data ?? []) as MatchRow[]);
      setLoading(false);
    };

    run();
  }, [router]);

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

      <PageHeader title="Estadísticas" subtitle="Análisis de tu rendimiento" />

      {loading && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-center text-gray-300">Cargando...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-gray-800 border border-red-700 rounded-xl p-6 text-red-400">
          <p className="font-medium">Ha ocurrido un error</p>
          <p className="text-sm mt-1 text-red-300">{error}</p>
        </div>
      )}

      {!loading &&
        !error &&
        (() => {
          // Filtrar partidos por rango temporal
          const now = new Date();
          let filteredMatches = matches;

          if (timeRange === "thisweek") {
            // Semana actual (lunes a hoy) en hora local
            const start = startOfDay(new Date(now));
            const day = start.getDay(); // 0 dom, 1 lun...
            const diffToMonday = day === 0 ? 6 : day - 1;
            start.setDate(start.getDate() - diffToMonday);
            const from = start;
            const to = endOfDay(now);

            filteredMatches = matches.filter((m) => {
              if (!m.played_at) return false;
              const matchDate = new Date(m.played_at);
              if (Number.isNaN(matchDate.getTime())) return false;
              return matchDate >= from && matchDate <= to;
            });
          } else if (timeRange === "thismonth") {
            const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
            const to = endOfDay(now);

            filteredMatches = matches.filter((m) => {
              if (!m.played_at) return false;
              const matchDate = new Date(m.played_at);
              if (Number.isNaN(matchDate.getTime())) return false;
              return matchDate >= from && matchDate <= to;
            });
          } else if (timeRange === "30days") {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const from = startOfDay(thirtyDaysAgo);
            const to = endOfDay(now);
            filteredMatches = matches.filter((m) => {
              if (!m.played_at) return false;
              const matchDate = new Date(m.played_at);
              if (Number.isNaN(matchDate.getTime())) return false;
              return matchDate >= from && matchDate <= to;
            });
          } else if (timeRange === "custom") {
            const fromDate = parseDateInput(customFrom);
            const toDate = parseDateInput(customTo);
            const from = fromDate ? startOfDay(fromDate) : null;
            const to = toDate ? endOfDay(toDate) : null;

            filteredMatches = matches.filter((m) => {
              if (!m.played_at) return false;
              const matchDate = new Date(m.played_at);
              if (Number.isNaN(matchDate.getTime())) return false;

              if (from && matchDate < from) return false;
              if (to && matchDate > to) return false;
              return true;
            });
          }
          // "all" no filtra nada por rango temporal

          // Filtrar partidos futuros (solo contar partidos ya jugados/finalizados)
          // Un partido se considera finalizado si:
          // 1. Tiene fecha de juego (played_at)
          // 2. La fecha es anterior a ahora (no futuro)
          // 3. Tiene algún resultado (sets) o está marcado como inacabado
          const nowTimestamp = now.getTime();
          filteredMatches = filteredMatches.filter((m) => {
            if (!m.played_at) return false;
            const matchDate = new Date(m.played_at);
            if (Number.isNaN(matchDate.getTime())) return false;
            const matchTimestamp = matchDate.getTime();
            // Solo partidos que ya se han jugado (fecha anterior a ahora)
            if (matchTimestamp > nowTimestamp) return false;
            // Además, debe tener algún resultado o estar marcado como inacabado
            const hasScore = hasAnyScore(m);
            const isIncomplete = isIncompleteMatch(m);
            return hasScore || isIncomplete; // Debe tener resultado o estar inacabado
          });

          // ✅ NUEVO (Hito estado automático): excluir partidos pendientes (sin marcador) de las estadísticas
          // Pendiente = no tiene sets y NO está inacabado
          filteredMatches = filteredMatches.filter((m) => {
            const incomplete = isIncompleteMatch(m);
            const pending = !hasAnyScore(m) && !incomplete;
            return !pending;
          });

          // Calcular estadísticas con partidos filtrados
          const results = filteredMatches.map(isWin);
          const validResults = results.filter((r): r is boolean => r !== null);

          const victories = validResults.filter((r) => r === true).length;
          const defeats = validResults.filter((r) => r === false).length;

          // Los partidos inacabados cuentan como jugados pero no como victoria/derrota
          const totalPlayed = filteredMatches.length; // Todos los partidos cuentan, incluyendo inacabados
          const winPercentage =
            totalPlayed > 0 ? Math.round((victories / totalPlayed) * 100) : 0;

          // Calcular racha actual (desde el más reciente)
          let currentStreak = 0;
          let streakType: "victoria" | "derrota" | null = null;
          for (const result of results) {
            if (result === null) continue;
            if (streakType === null) {
              streakType = result ? "victoria" : "derrota";
              currentStreak = 1;
            } else if (
              (result && streakType === "victoria") ||
              (!result && streakType === "derrota")
            ) {
              currentStreak++;
            } else {
              break;
            }
          }

          // Estadísticas por tipo
          const statsByType: Record<
            string,
            { victories: number; defeats: number; total: number }
          > = {};
          filteredMatches.forEach((match) => {
            const result = isWin(match);
            const type = match.match_type || "sin tipo";
            if (!statsByType[type]) {
              statsByType[type] = { victories: 0, defeats: 0, total: 0 };
            }

            // Todos los partidos cuentan en total, incluyendo inacabados
            statsByType[type].total++;
            if (result === true) {
              statsByType[type].victories++;
            } else if (result === false) {
              statsByType[type].defeats++;
            }
            // Si result === null (inacabado o sin resultado), solo cuenta en total
          });

          // Evolución temporal (por mes) — gráficas simples sin librerías
          const monthlyMap: Record<string, { wins: number; losses: number; total: number }> =
            {};

          filteredMatches.forEach((m) => {
            if (!m.played_at) return;
            const r = isWin(m);

            const d = new Date(m.played_at);
            if (Number.isNaN(d.getTime())) return;

            const key = toMonthKey(d);
            if (!monthlyMap[key]) monthlyMap[key] = { wins: 0, losses: 0, total: 0 };

            // Todos los partidos cuentan en total, incluyendo inacabados
            monthlyMap[key].total++;
            if (r === true) monthlyMap[key].wins++;
            else if (r === false) monthlyMap[key].losses++;
            // Si r === null (inacabado o sin resultado), solo cuenta en total
          });

          const monthlySeries = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([monthKey, s]) => ({
              monthKey,
              ...s,
              winPct: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
            }))
            .slice(-12);

          const maxMonthlyTotal =
            monthlySeries.length > 0
              ? Math.max(...monthlySeries.map((m) => m.total))
              : 0;

          return (
            <div className="space-y-4">
              {/* Selector de rango temporal */}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <h2 className="text-lg font-medium mb-3 text-white">Período</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <button
                    onClick={() => setTimeRange("all")}
                    className={`rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition text-center break-words ${
                      timeRange === "all"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Todo el historial
                  </button>
                  <button
                    onClick={() => setTimeRange("thisweek")}
                    className={`rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition text-center break-words ${
                      timeRange === "thisweek"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Esta semana
                  </button>
                  <button
                    onClick={() => setTimeRange("thismonth")}
                    className={`rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition text-center break-words ${
                      timeRange === "thismonth"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Este mes
                  </button>
                  <button
                    onClick={() => setTimeRange("30days")}
                    className={`rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition text-center break-words ${
                      timeRange === "30days"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Últimos 30 días
                  </button>
                  <button
                    onClick={() => setTimeRange("custom")}
                    className={`rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition text-center break-words ${
                      timeRange === "custom"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {timeRange === "custom" && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <label className="text-sm text-gray-300">Desde</label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm w-full"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-sm text-gray-300">Hasta</label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-400 sm:col-span-2 break-words leading-relaxed overflow-wrap-anywhere">
                      Consejo: puedes dejar una de las fechas vacía para filtrar solo por &quot;desde&quot; o solo por
                      &quot;hasta&quot;.
                    </p>
                  </div>
                )}
              </div>

              {/* Aclaración */}
              <div className="mb-4 space-y-1">
                <p className="text-xs text-gray-500">
                  ℹ️ Los partidos inacabados cuentan como jugados, pero no afectan victorias/derrotas.
                </p>
                <p className="text-xs text-gray-500">
                  ℹ️ Los partidos pendientes (sin marcador) no cuentan en estadísticas.
                </p>
              </div>

              {/* Resumen general */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4 text-white">Resumen General</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard value={totalPlayed} label="Partidos jugados" />
                  <StatCard value={victories} label="Victorias" valueColor="text-green-500" />
                  <StatCard value={defeats} label="Derrotas" valueColor="text-red-500" />
                  <StatCard value={`${winPercentage}%`} label="% Victorias" />
                </div>

                {currentStreak > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-400">Racha actual</p>
                    <p className="text-xl font-semibold mt-1 text-white">
                      {currentStreak} {streakType === "victoria" ? "victorias" : "derrotas"} consecutivas
                    </p>
                  </div>
                )}
              </div>

              {/* Hito 6.2 – Visualización */}
              {monthlySeries.length > 0 && (
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                  <h2 className="text-lg font-medium text-white">Evolución temporal</h2>
                  <p className="text-sm text-gray-400">
                    Últimos {monthlySeries.length} meses (según el período seleccionado)
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-300">Partidos por mes</p>
                      <div className="space-y-2">
                        {monthlySeries.map((m) => {
                          const w =
                            maxMonthlyTotal > 0 ? Math.round((m.total / maxMonthlyTotal) * 100) : 0;
                          return (
                            <div
                              key={`count-${m.monthKey}`}
                              className="grid grid-cols-[72px_1fr_48px] items-center gap-3"
                            >
                              <div className="text-xs text-gray-400">{monthLabel(m.monthKey)}</div>
                              <div className="h-2 rounded bg-gray-700 overflow-hidden">
                                <div className="h-2 bg-green-600" style={{ width: `${w}%` }} />
                              </div>
                              <div className="text-xs text-gray-300 text-right">{m.total}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-300">% victorias por mes</p>
                      <div className="space-y-2">
                        {monthlySeries.map((m) => (
                          <div
                            key={`pct-${m.monthKey}`}
                            className="grid grid-cols-[72px_1fr_48px] items-center gap-3"
                          >
                            <div className="text-xs text-gray-400">{monthLabel(m.monthKey)}</div>
                            <div className="h-2 rounded bg-gray-700 overflow-hidden">
                              <div className="h-2 bg-green-500" style={{ width: `${m.winPct}%` }} />
                            </div>
                            <div className="text-xs text-gray-300 text-right">{m.winPct}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Estadísticas por tipo */}
              {Object.keys(statsByType).length > 0 && (
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                  <h2 className="text-lg font-medium text-white">Por Tipo de Partido</h2>
                  <div className="space-y-3">
                    {Object.entries(statsByType).map(([type, stats]) => {
                      const typePercentage =
                        stats.total > 0 ? Math.round((stats.victories / stats.total) * 100) : 0;
                      return (
                        <div
                          key={type}
                          className="rounded-xl bg-gray-800 border border-gray-700 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium capitalize text-white">{type}</p>
                            <p className="text-sm text-gray-400">{typePercentage}% victorias</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-400">Total: </span>
                              <span className="font-medium text-white">{stats.total}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Victorias: </span>
                              <span className="font-medium text-green-500">{stats.victories}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Derrotas: </span>
                              <span className="font-medium text-red-500">{stats.defeats}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hito 7 – Estadísticas avanzadas */}
              {totalPlayed > 0 &&
                (() => {
                  // Rendimiento por pareja (TOTAL incluye inacabados; W/L solo completados)
                  const statsByPartner: Record<string, { victories: number; defeats: number; total: number }> = {};
                  filteredMatches.forEach((match) => {
                    const partner = match.partner_name || "Sin pareja";
                    if (!statsByPartner[partner]) {
                      statsByPartner[partner] = { victories: 0, defeats: 0, total: 0 };
                    }

                    statsByPartner[partner].total++;

                    const result = isWin(match);
                    if (result === true) statsByPartner[partner].victories++;
                    else if (result === false) statsByPartner[partner].defeats++;
                  });

                  // Rendimiento por ubicación (TOTAL incluye inacabados; W/L solo completados)
                  const statsByLocation: Record<string, { victories: number; defeats: number; total: number }> = {};
                  filteredMatches.forEach((match) => {
                    const location = match.location || "Sin ubicación";
                    if (!statsByLocation[location]) {
                      statsByLocation[location] = { victories: 0, defeats: 0, total: 0 };
                    }

                    statsByLocation[location].total++;

                    const result = isWin(match);
                    if (result === true) statsByLocation[location].victories++;
                    else if (result === false) statsByLocation[location].defeats++;
                  });

                  // Sets ganados y perdidos
                  let setsWon = 0;
                  let setsLost = 0;
                  filteredMatches.forEach((match) => {
                    const sets: Array<[number | null, number | null]> = [
                      [match.set1_us, match.set1_them],
                      [match.set2_us, match.set2_them],
                      [match.set3_us, match.set3_them],
                    ];
                    for (const [us, them] of sets) {
                      if (us != null && them != null) {
                        if (us > them) setsWon++;
                        else if (them > us) setsLost++;
                      }
                    }
                  });

                  // Tendencias: comparar primera mitad vs segunda mitad del período (solo partidos completados)
                  const completedMatches = [...filteredMatches]
                    .filter((m) => {
                      if (!m.played_at) return false;
                      const r = isWin(m);
                      return r !== null;
                    })
                    .sort((a, b) => {
                      const dateA = new Date(a.played_at!).getTime();
                      const dateB = new Date(b.played_at!).getTime();
                      return dateA - dateB;
                    });

                  const midPoint = Math.floor(completedMatches.length / 2);
                  const firstHalf = completedMatches.slice(0, midPoint);
                  const secondHalf = completedMatches.slice(midPoint);

                  const firstHalfResults = firstHalf.map(isWin).filter((r): r is boolean => r !== null);
                  const secondHalfResults = secondHalf.map(isWin).filter((r): r is boolean => r !== null);

                  const firstHalfWins = firstHalfResults.filter((r) => r === true).length;
                  const firstHalfTotal = firstHalfResults.length;
                  const firstHalfPct = firstHalfTotal > 0 ? Math.round((firstHalfWins / firstHalfTotal) * 100) : 0;

                  const secondHalfWins = secondHalfResults.filter((r) => r === true).length;
                  const secondHalfTotal = secondHalfResults.length;
                  const secondHalfPct = secondHalfTotal > 0 ? Math.round((secondHalfWins / secondHalfTotal) * 100) : 0;

                  const trend = secondHalfPct - firstHalfPct;

                  return (
                    <>
                      {/* Rendimiento por pareja */}
                      {Object.keys(statsByPartner).length > 0 && (
                        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                          <h2 className="text-lg font-medium text-white">Rendimiento por Pareja</h2>
                          <div className="space-y-3">
                            {Object.entries(statsByPartner)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .map(([partner, stats]) => {
                                const partnerPercentage =
                                  stats.total > 0 ? Math.round((stats.victories / stats.total) * 100) : 0;
                                return (
                                  <div
                                    key={partner}
                                    className="rounded-xl bg-gray-700 border border-gray-600 p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium text-white">{partner}</p>
                                      <p className="text-sm text-gray-400">{partnerPercentage}% victorias</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      <div>
                                        <span className="text-gray-400">Total: </span>
                                        <span className="font-medium text-white">{stats.total}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Victorias: </span>
                                        <span className="font-medium text-green-500">{stats.victories}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Derrotas: </span>
                                        <span className="font-medium text-red-500">{stats.defeats}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Rendimiento por ubicación */}
                      {Object.keys(statsByLocation).length > 0 && (
                        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                          <h2 className="text-lg font-medium text-white">Rendimiento por Ubicación</h2>
                          <div className="space-y-3">
                            {Object.entries(statsByLocation)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .map(([location, stats]) => {
                                const locationPercentage =
                                  stats.total > 0 ? Math.round((stats.victories / stats.total) * 100) : 0;
                                return (
                                  <div
                                    key={location}
                                    className="rounded-xl bg-gray-700 border border-gray-600 p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium text-white">{location}</p>
                                      <p className="text-sm text-gray-400">{locationPercentage}% victorias</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      <div>
                                        <span className="text-gray-400">Total: </span>
                                        <span className="font-medium text-white">{stats.total}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Victorias: </span>
                                        <span className="font-medium text-green-500">{stats.victories}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Derrotas: </span>
                                        <span className="font-medium text-red-500">{stats.defeats}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Sets ganados y perdidos */}
                      {(setsWon > 0 || setsLost > 0) && (
                        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                          <h2 className="text-lg font-medium text-white">Sets Ganados y Perdidos</h2>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Sets ganados</p>
                              <p className="text-2xl font-semibold text-green-500">{setsWon}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Sets perdidos</p>
                              <p className="text-2xl font-semibold text-red-500">{setsLost}</p>
                            </div>
                          </div>
                          {setsWon + setsLost > 0 && (
                            <div className="pt-3 border-t border-gray-700">
                              <p className="text-sm text-gray-400">% Sets ganados</p>
                              <p className="text-xl font-semibold text-white">
                                {Math.round((setsWon / (setsWon + setsLost)) * 100)}%
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tendencias */}
                      {firstHalfTotal > 0 && secondHalfTotal > 0 && (
                        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                          <h2 className="text-lg font-medium text-white">Tendencias</h2>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-400">Primera mitad del período</p>
                                <p className="text-xl font-semibold text-white">{firstHalfPct}% victorias</p>
                                <p className="text-xs text-gray-500">{firstHalfTotal} partidos</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Segunda mitad del período</p>
                                <p className="text-xl font-semibold text-white">{secondHalfPct}% victorias</p>
                                <p className="text-xs text-gray-500">{secondHalfTotal} partidos</p>
                              </div>
                            </div>
                            {trend !== 0 && (
                              <div className="pt-3 border-t border-gray-700">
                                <p className="text-sm text-gray-400">Evolución</p>
                                <p
                                  className={`text-lg font-semibold ${
                                    trend > 0 ? "text-green-500" : "text-red-500"
                                  }`}
                                >
                                  {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% {trend > 0 ? "mejora" : "descenso"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

              {totalPlayed === 0 && (
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center text-gray-300">
                  <p>No tienes partidos registrados todavía.</p>
                  <a href="/new-match" className="text-green-500 underline mt-2 inline-block">
                    Crear tu primer partido
                  </a>
                </div>
              )}

              {/* Logros - Acordeón colapsable */}
              {(() => {
                // Calcular logros usando solo partidos finalizados (futuros excluidos)
                // Filtrar partidos futuros para logros también
                const nowTimestamp = new Date().getTime();
                const pastMatches = matches.filter((m) => {
                  if (!m.played_at) return false;
                  const matchDate = new Date(m.played_at);
                  if (Number.isNaN(matchDate.getTime())) return false;
                  const matchTimestamp = matchDate.getTime();
                  return matchTimestamp <= nowTimestamp;
                });
                const allAchievements = computeAchievements(pastMatches);
                const unlockedCount = allAchievements.filter((a) => a.status === "unlocked").length;

                return (
                  <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800">
                    <button
                      onClick={() => setAchievementsExpanded(!achievementsExpanded)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors rounded-t-xl"
                    >
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-medium text-white">Logros</h2>
                        <p className="text-sm text-gray-400">
                          {unlockedCount} / {allAchievements.length} desbloqueados
                        </p>
                      </div>
                      <span
                        className={`text-gray-400 transition-transform ${
                          achievementsExpanded ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                    {achievementsExpanded && (
                      <div className="p-4 pt-0 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {allAchievements.map((achievement) => {
                            const isUnlocked = achievement.status === "unlocked";
                            const isProgress = achievement.status === "progress";
                            const isLocked = achievement.status === "locked";

                            // Calcular porcentaje de progreso
                            const progressPercentage = achievement.progress
                              ? (achievement.progress.current / achievement.progress.target) * 100
                              : 0;
                            const isHighProgress = isProgress && progressPercentage >= 80;

                            return (
                              <div
                                key={achievement.id}
                                className={`rounded-xl p-4 border-2 transition ${
                                  isUnlocked
                                    ? "bg-green-900/50 border-green-500"
                                    : isHighProgress
                                    ? "bg-orange-900/40 border-orange-500"
                                    : isProgress
                                    ? "bg-yellow-900/30 border-yellow-600"
                                    : "bg-gray-800 border-gray-600 opacity-60"
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {isUnlocked && <span className="text-green-400">✓</span>}
                                      {isLocked && <span className="text-gray-500">🔒</span>}
                                      <p
                                        className={`font-medium ${
                                          isUnlocked
                                            ? "text-green-400"
                                            : isHighProgress
                                            ? "text-orange-400"
                                            : isProgress
                                            ? "text-yellow-400"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {achievement.title}
                                      </p>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>
                                  </div>
                                </div>

                                {achievement.progress && (
                                  <div className="mt-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                      <span>Progreso</span>
                                      <span>
                                        {achievement.progress.current} / {achievement.progress.target}
                                      </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          isHighProgress
                                            ? "bg-orange-500"
                                            : isProgress
                                            ? "bg-yellow-500"
                                            : "bg-gray-600"
                                        }`}
                                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {isUnlocked && (
                                  <div className="mt-3 flex justify-end">
                                    <span className="text-lg">🏆</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}
    </PageWrapper>
  );
}
