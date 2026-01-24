"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";
import { resolvePublicUsername, usePublicProfilesMap } from "@/lib/publicProfiles";

type MatchRow = {
  id: string;
  played_at: string;
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

  overall_feeling: number | null;
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

function formatDateLong(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const dayName = days[d.getDay()];
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hoursStr = hours < 10 ? "0" + hours : String(hours);
  const minutesStr = minutes < 10 ? "0" + minutes : String(minutes);
  return `${dayName}, ${day} de ${month} de ${year} ${hoursStr}:${minutesStr}`;
}

function buildWhatsAppMessage(m: MatchRow) {
  const baseUrl = window.location.origin;
  const link = `${baseUrl}/share/${m.id}`;

  const score = formatScore(m);
  const incomplete = isIncompleteMatch(m);
  const win = isWin(m);
  const pending = !hasAnyScore(m) && !incomplete;

  const resultLabel = pending
    ? "Pendiente"
    : incomplete
    ? "Inacabado"
    : win === true
    ? "Victoria"
    : win === false
    ? "Derrota"
    : "—";

  const partner = m.partner_name || "—";
  const rivals = `${m.opponent1_name || "—"}${m.opponent2_name ? ` / ${m.opponent2_name}` : ""}`;
  const date = formatDateLong(m.played_at);

  return [
    "🎾 Partido de pádel",
    date ? `🗓️ ${date}` : "",
    `📌 ${m.match_type}${m.location ? ` · ${m.location}` : ""}`,
    `👥 Pareja: ${partner}`,
    `🆚 Rivales: ${rivals}`,
    `🏁 Estado: ${resultLabel}`,
    `🔢 Marcador: ${score || "Sin resultado"}`,
    `👉 ${link}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ✅ Hook común (mapa con normalización + duplicados)
  const { map: publicProfilesMap } = usePublicProfilesMap();

  function renderPlayer(name: string | null, opts?: { stopPropagation?: boolean }) {
    const raw = (name ?? "").trim();
    if (!raw) return <span className="text-white font-medium">—</span>;

    const username = resolvePublicUsername(raw, publicProfilesMap);
    if (!username) return <span className="text-white font-medium">{raw}</span>;

    return (
      <Link
        href={`/players/${username}`}
        className="text-green-400 hover:underline font-medium"
        onClick={(e) => {
          if (opts?.stopPropagation) e.stopPropagation();
        }}
      >
        {raw}
      </Link>
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      // ✅ 1) SOLO mis matches
      const ownRes = await supabase
        .from("matches")
        .select(
          "id, played_at, match_type, location, partner_name, opponent1_name, opponent2_name, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them, overall_feeling, notes"
        )
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(200);

      // ✅ 2) SOLO mis participaciones
      const partRes = await supabase
        .from("match_participants")
        .select(
          `
          match_id,
          matches (
            id,
            played_at,
            match_type,
            location,
            partner_name,
            opponent1_name,
            opponent2_name,
            set1_us,
            set1_them,
            set2_us,
            set2_them,
            set3_us,
            set3_them,
            overall_feeling,
            notes
          )
        `
        )
        .eq("user_id", user.id)
        .order("played_at", { foreignTable: "matches", ascending: false });

      const ownError = ownRes.error;
      const partError = partRes.error;

      if (ownError && partError) {
        setError(ownError.message || partError.message || "Error cargando historial");
        setLoading(false);
        return;
      }

      const ownMatches = ((ownRes.data ?? []) as MatchRow[]) || [];

      type ParticipantRow = {
        match_id: string;
        matches: MatchRow | MatchRow[] | null;
      };

      const partMatches =
        ((partRes.data ?? []) as ParticipantRow[])
          .map((r) => {
            // matches puede ser un array o un objeto único dependiendo de la query
            const match = Array.isArray(r.matches) ? r.matches[0] : r.matches;
            return match;
          })
          .filter((m): m is MatchRow => m !== null) || [];

      // ✅ Merge sin duplicados
      const map = new Map<string, MatchRow>();
      for (const m of ownMatches) map.set(m.id, m);
      for (const m of partMatches) map.set(m.id, m);

      const merged = Array.from(map.values()).sort((a, b) => {
        const da = new Date(a.played_at).getTime();
        const db = new Date(b.played_at).getTime();
        return db - da;
      });

      setRows(merged);
      setLoading(false);
    }

    load();
  }, [router]);

  function shareWhatsApp(e: React.MouseEvent, m: MatchRow) {
    e.stopPropagation();
    e.preventDefault();
    const text = buildWhatsAppMessage(m);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function goToDetail(m: MatchRow) {
    router.push(`/matches/${m.id}`);
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

      <PageHeader title="Historial" subtitle="Todos tus partidos registrados" />

      {!loading && !error && (
        <div className="mb-6">
          <Link
            href="/new-match"
            className="inline-block px-4 py-2 rounded-lg bg-green-600 text-white no-underline hover:bg-green-700 transition text-sm font-medium"
          >
            + Nuevo partido
          </Link>
        </div>
      )}

      {loading && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-center text-gray-300">Cargando...</p>
        </div>
      )}

      {error && (
        <div className="bg-gray-800 border border-red-700 rounded-xl p-6 text-red-400">
          <p className="font-medium">Ha ocurrido un error</p>
          <p className="text-sm mt-1 text-red-300">{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-gray-300 mb-4">Aún no tienes partidos. Crea el primero.</p>
          <Link
            href="/new-match"
            className="inline-block px-4 py-2 rounded-lg bg-green-600 text-white no-underline hover:bg-green-700 transition text-sm font-medium"
          >
            Crear primer partido
          </Link>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4">
          {rows.map((m) => {
            const score = formatScore(m);
            const win = isWin(m);
            const incomplete = isIncompleteMatch(m);
            const pending = !hasAnyScore(m) && !incomplete;

            const date = formatDateLong(m.played_at);

            return (
              <div
                key={m.id}
                onClick={() => goToDetail(m)}
                className="block bg-gray-800 border border-gray-700 rounded-xl p-5 hover:bg-gray-750 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-gray-400">
                      {date} · {m.match_type}
                      {m.location ? ` · ${m.location}` : ""}
                    </div>

                    <div className="mt-1 text-lg font-semibold text-white">
                      {score || "Sin resultado"}
                    </div>

                    <div className="mt-2 text-sm text-gray-300 space-y-1">
                      <div>
                        <span className="text-gray-400">Pareja:</span>{" "}
                        {renderPlayer(m.partner_name, { stopPropagation: true })}
                      </div>
                      <div>
                        <span className="text-gray-400">Rivales:</span>{" "}
                        {renderPlayer(m.opponent1_name, { stopPropagation: true })}
                        {m.opponent2_name ? (
                          <>
                            {" "}
                            / {renderPlayer(m.opponent2_name, { stopPropagation: true })}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {pending && (
                      <span className="rounded-full bg-gray-700 border border-gray-600 px-3 py-1 text-xs text-gray-300">
                        Pendiente
                      </span>
                    )}

                    {!pending && incomplete && (
                      <span className="rounded-full bg-yellow-900/30 border border-yellow-700 px-3 py-1 text-xs text-yellow-400">
                        Inacabado
                      </span>
                    )}
                    {!pending && !incomplete && win === true && (
                      <span className="rounded-full bg-green-900/30 border border-green-700 px-3 py-1 text-xs text-green-400">
                        Victoria
                      </span>
                    )}
                    {!pending && !incomplete && win === false && (
                      <span className="rounded-full bg-red-900/30 border border-red-700 px-3 py-1 text-xs text-red-400">
                        Derrota
                      </span>
                    )}

                    <span className="rounded-full bg-gray-700 border border-gray-600 px-3 py-1 text-xs text-gray-300">
                      Sensación: {m.overall_feeling ?? "—"}
                    </span>

                    <button
                      onClick={(e) => shareWhatsApp(e, m)}
                      className="rounded-lg bg-green-600 text-white px-3 py-1 text-xs hover:bg-green-700 transition"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
