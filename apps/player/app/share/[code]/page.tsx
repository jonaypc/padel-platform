"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolvePublicUsername, usePublicProfilesMap } from "@/lib/publicProfiles";

type MatchRow = {
  id: string;
  played_at: string | null;
  match_type: string;
  location: string | null;

  partner_name: string | null;
  opponent1_name: string | null;
  opponent2_name: string | null;

  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;

  notes: string | null;
  is_public: boolean;
};

type ParticipantRow = {
  match_id: string;
  user_id: string;
  team: "A" | "B";
};

function formatScore(m: MatchRow) {
  const s1 =
    m.set1_us != null && m.set1_them != null ? `${m.set1_us}-${m.set1_them}` : "";
  const s2 =
    m.set2_us != null && m.set2_them != null ? `${m.set2_us}-${m.set2_them}` : "";
  const s3 =
    m.set3_us != null && m.set3_them != null ? `${m.set3_us}-${m.set3_them}` : "";

  return [s1, s2, s3].filter(Boolean).join(" / ");
}

function isIncompleteMatch(m: MatchRow): boolean {
  if (m.notes && m.notes.includes("[PARTIDO INACABADO")) return true;

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

function formatDate(iso: string | null) {
  if (!iso) return "Fecha desconocida";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function ShareMatchPage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // ✅ Hook común (mapa con normalización + duplicados)
  const { map: publicProfilesMap } = usePublicProfilesMap();

  function renderPlayerName(name: string | null): React.ReactNode {
    if (!name || name === "—") return <span className="text-white font-medium">—</span>;
    const username = resolvePublicUsername(name, publicProfilesMap);
    if (username) {
      return (
        <Link href={`/players/${username}`} className="text-green-400 hover:underline font-medium">
          {name}
        </Link>
      );
    }
    return <span className="text-white font-medium">{name}</span>;
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      // 1) Usuario (si hay sesión)
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setUserId(uid);

      // 2) Cargar partido
      const { data: matchData, error: matchErr } = await supabase
        .from("matches")
        .select(
          "id, played_at, match_type, location, partner_name, opponent1_name, opponent2_name, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them, notes, is_public"
        )
        .eq("id", code)
        .single();

      if (matchErr || !matchData) {
        setError("No se pudo cargar el partido.");
        setLoading(false);
        return;
      }

      setMatch(matchData as MatchRow);

      // 3) Cargar participantes (si existe tabla + permisos)
      const { data: partData } = await supabase
        .from("match_participants")
        .select("match_id, user_id, team")
        .eq("match_id", code);

      setParticipants((partData as ParticipantRow[]) || []);

      setLoading(false);
    };

    if (code) run();
  }, [code]);

  const score = useMemo(() => (match ? formatScore(match) : ""), [match]);

  const resultLabel = useMemo(() => {
    if (!match) return "—";
    const inc = isIncompleteMatch(match);
    if (inc) return "Inacabado";
    const r = isWin(match);
    if (r === true) return "Victoria";
    if (r === false) return "Derrota";
    return "—";
  }, [match]);

  const teamCounts = useMemo(() => {
    let a = 0;
    let b = 0;
    for (const p of participants) {
      if (p.team === "A") a++;
      if (p.team === "B") b++;
    }
    return { a, b };
  }, [participants]);

  const myParticipation = useMemo(() => {
    if (!userId) return null;
    return participants.find((p) => p.user_id === userId) ?? null;
  }, [participants, userId]);

  const isFull = useMemo(() => teamCounts.a >= 2 && teamCounts.b >= 2, [teamCounts]);

  const autoTeam = useMemo<"A" | "B" | null>(() => {
    if (isFull) return null;
    if (teamCounts.a < 2) return "A";
    if (teamCounts.b < 2) return "B";
    return null;
  }, [teamCounts, isFull]);

  async function handleJoin() {
    setJoinError(null);

    if (!match) return;

    // Si no hay sesión, mandamos a login y volvemos aquí
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/share/${code}`)}`);
      return;
    }

    if (myParticipation) {
      router.push(`/matches/${code}`);
      return;
    }

    if (!autoTeam) {
      setJoinError("El partido ya está completo.");
      return;
    }

    setJoinLoading(true);
    try {
      const { error: insErr } = await supabase.from("match_participants").insert({
        match_id: code,
        user_id: userId,
        team: autoTeam,
      });

      if (insErr) {
        // Si ya existía la fila, lo tratamos como “ya estás dentro”
        if (String(insErr.message || "").toLowerCase().includes("duplicate")) {
          router.push(`/matches/${code}`);
          return;
        }
        setJoinError("No se pudo unir al partido.");
        setJoinLoading(false);
        return;
      }

      router.push(`/matches/${code}`);
    } catch {
      setJoinError("No se pudo unir al partido.");
    } finally {
      setJoinLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-center text-gray-300">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-md mx-auto bg-gray-800 border border-red-700 rounded-xl p-6 text-red-400">
          <p className="font-medium">Ha ocurrido un error</p>
          <p className="text-sm mt-1 text-red-300">{error || "No encontrado"}</p>
        </div>
        <div className="max-w-md mx-auto mt-4">
          <button
            onClick={() => router.push("/app")}
            className="text-sm text-gray-400 hover:text-green-500 transition"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // No necesitamos calcular partner y rivals como strings, los renderizamos directamente

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h1 className="text-xl font-semibold text-white">Partido compartido</h1>
          <p className="text-sm text-gray-400 mt-1">
            {formatDate(match.played_at)} · {match.match_type}
            {match.location ? ` · ${match.location}` : ""}
          </p>

          <div className="mt-4 rounded-xl bg-gray-700 border border-gray-600 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">Resultado</p>
              <span className="text-xs text-gray-400">{resultLabel}</span>
            </div>
            <p className="text-lg font-semibold text-white">{score || "Sin resultado"}</p>
          </div>

          <div className="mt-4 rounded-xl bg-gray-700 border border-gray-600 p-4 space-y-1">
            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Pareja:</span>{" "}
              {renderPlayerName(match.partner_name)}
            </p>
            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Rivales:</span>{" "}
              {renderPlayerName(match.opponent1_name)}
              {match.opponent2_name && (
                <>
                  {" / "}
                  {renderPlayerName(match.opponent2_name)}
                </>
              )}
            </p>
          </div>

          {/* Participantes (multiusuario) */}
          <div className="mt-4 rounded-xl bg-gray-700 border border-gray-600 p-4">
            <p className="text-sm font-medium text-gray-300 mb-2">Participantes (usuarios)</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
                <p className="text-xs text-gray-400 mb-1">Equipo A</p>
                <p className="text-sm text-white font-medium">
                  {teamCounts.a} / 2
                </p>
              </div>

              <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
                <p className="text-xs text-gray-400 mb-1">Equipo B</p>
                <p className="text-sm text-white font-medium">
                  {teamCounts.b} / 2
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Al unirte se te asigna equipo automáticamente: primero A si hay hueco, si no B.
            </p>
          </div>

          {/* CTA Unirse */}
          <div className="mt-5 space-y-2">
            {myParticipation ? (
              <>
                <div className="rounded-lg bg-green-900/30 border border-green-700 p-3">
                  <p className="text-sm text-green-300">
                    Ya estás unido a este partido (Equipo {myParticipation.team}).
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/matches/${code}`)}
                  className="w-full rounded-xl bg-green-600 text-white py-3 font-medium hover:bg-green-700 transition"
                >
                  Ver en mi historial →
                </button>
              </>
            ) : (
              <>
                {joinError && (
                  <div className="rounded-lg bg-red-900/30 border border-red-700 p-3">
                    <p className="text-sm text-red-300">{joinError}</p>
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={joinLoading || isFull}
                  className={`w-full rounded-xl py-3 font-medium transition ${
                    joinLoading || isFull
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {isFull
                    ? "Partido completo"
                    : joinLoading
                    ? "Uniéndote..."
                    : userId
                    ? `Unirme al partido (auto)`
                    : "Inicia sesión para unirte"}
                </button>

                {userId && !isFull && autoTeam && (
                  <p className="text-xs text-gray-500 text-center">
                    Si te unes ahora, entrarás en el <span className="text-gray-300">Equipo {autoTeam}</span>.
                  </p>
                )}
              </>
            )}

            <button
              onClick={() => router.push("/app")}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-300 py-3 font-medium hover:bg-gray-750 transition"
            >
              Volver al inicio
            </button>
          </div>
        </div>

        {/* Nota extra si es público */}
        {match.is_public && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Este partido está marcado como <span className="text-gray-200">público</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
