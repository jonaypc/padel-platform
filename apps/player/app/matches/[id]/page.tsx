"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "../../components/PageHeader";
import PageWrapper from "../../components/PageWrapper";
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
  physical_feeling: number | null;
  mental_feeling: number | null;

  notes: string | null;
  status: string;
};

type Participant = {
  user_id: string;
  status: "pending" | "confirmed" | "rejected";
  elo_change?: number | null;
  created_at?: string;
};

function hasAnyScore(m: MatchRow): boolean {
  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];
  return sets.some(([a, b]) => a != null && b != null);
}

function scoreLine(us: number | null, them: number | null) {
  if (us == null || them == null) return "—";
  return `${us}-${them}`;
}

function calcResult(m: MatchRow): "Victoria" | "Derrota" | "Inacabado" | null {
  const isIncomplete = m.notes && m.notes.includes("[PARTIDO INACABADO");

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

  if (us === 0 && them === 0) return null;

  if (isIncomplete) return "Inacabado";

  const partidoCompleto =
    (setsCompletados >= 2 && (us >= 2 || them >= 2)) ||
    (setsCompletados === 3 && us !== them);

  if (!partidoCompleto && setsCompletados > 0) return "Inacabado";

  if (us === them) return null;
  return us > them ? "Victoria" : "Derrota";
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

function buildScoreSummary(row: MatchRow) {
  const parts: string[] = [];
  const s1 =
    row.set1_us != null && row.set1_them != null ? `${row.set1_us}-${row.set1_them}` : "";
  const s2 =
    row.set2_us != null && row.set2_them != null ? `${row.set2_us}-${row.set2_them}` : "";
  const s3 =
    row.set3_us != null && row.set3_them != null ? `${row.set3_us}-${row.set3_them}` : "";
  if (s1) parts.push(s1);
  if (s2) parts.push(s2);
  if (s3) parts.push(s3);
  return parts.join(" / ");
}

function shortId(id: string) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function statusLabel(status: Participant["status"]) {
  if (status === "pending") return "Pendiente";
  if (status === "confirmed") return "Confirmado";
  return "Rechazado";
}

function statusPillClass(status: Participant["status"]) {
  if (status === "confirmed") {
    return "bg-green-900/30 border border-green-700 text-green-400";
  }
  if (status === "rejected") {
    return "bg-red-900/30 border border-red-700 text-red-400";
  }
  return "bg-gray-700 border border-gray-600 text-gray-300";
}

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<MatchRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Hook común
  const { map: publicProfilesMap } = usePublicProfilesMap();

  // ✅ Confirmaciones (Hito 10.3)
  const [userId, setUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const isSharedMatch = useMemo(() => {
    return !!(row?.notes && row.notes.includes("PARTIDO COMPARTIDO"));
  }, [row]);

  const myParticipant = useMemo(() => {
    if (!userId) return null;
    return participants.find((p) => p.user_id === userId) ?? null;
  }, [participants, userId]);

  function buildMessage(): string {
    if (!row) return "";
    const result = calcResult(row);
    const pending = !hasAnyScore(row) && result === null;
    const statusLabelTxt = pending ? "Pendiente" : result ?? "—";

    const date = formatDateLong(row.played_at);
    const score = buildScoreSummary(row);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/share/${row.id}`;

    const partner = row.partner_name || "—";
    const rivals = `${row.opponent1_name || "—"}${row.opponent2_name ? ` / ${row.opponent2_name}` : ""
      }`;

    return [
      "🎾 Partido de pádel",
      date ? `🗓️ ${date}` : "",
      `📌 ${row.match_type}${row.location ? ` · ${row.location}` : ""}`,
      `👥 Pareja: ${partner}`,
      `🆚 Rivales: ${rivals}`,
      `🏁 Estado: ${statusLabelTxt}`,
      `🔢 Marcador: ${score || "Sin resultado"}`,
      `👉 ${link}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  function renderPlayer(name: string | null) {
    const raw = (name ?? "").trim();
    if (!raw) return <span>—</span>;

    const username = resolvePublicUsername(raw, publicProfilesMap);
    if (!username) return <span>{raw}</span>;

    return (
      <Link href={`/players/${username}`} className="text-green-400 hover:underline">
        {raw}
      </Link>
    );
  }

  async function loadParticipants(matchId: string) {
    setParticipantsLoading(true);
    const { data, error } = await supabase
      .from("match_participants")
      .select("user_id, status, elo_change, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      // No bloqueamos la pantalla entera, solo mostramos un aviso básico en UI si quieres.
      // Aquí lo dejamos simple: consola.
      console.error("Error cargando participantes:", error.message);
      setParticipants([]);
    } else {
      setParticipants((data ?? []) as Participant[]);
    }
    setParticipantsLoading(false);
  }

  async function updateMyStatus(newStatus: "confirmed" | "rejected") {
    if (!userId) return;

    const { error } = await supabase
      .from("match_participants")
      .update({ status: newStatus })
      .eq("match_id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    // Recargamos participantes para reflejar el estado sin inventar optimizaciones.
    await loadParticipants(id);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      setUserId(sessionData.session.user.id);

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, played_at, match_type, location, partner_name, opponent1_name, opponent2_name, 
          set1_us, set1_them, set2_us, set2_them, set3_us, set3_them, 
          overall_feeling, physical_feeling, mental_feeling, notes, status
        `)
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const matchRow = data as MatchRow;
      setRow(matchRow);

      // ✅ Solo si es partido compartido (según tu criterio actual)
      if (matchRow.notes && matchRow.notes.includes("PARTIDO COMPARTIDO")) {
        await loadParticipants(id);
      } else {
        setParticipants([]);
      }

      setLoading(false);
    }

    if (id) load();
  }, [id, router]);

  async function deleteMatch() {
    if (!row) return;
    const ok = confirm("¿Seguro que quieres borrar este partido?");
    if (!ok) return;

    const { error } = await supabase.from("matches").delete().eq("id", row.id);
    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/matches");
  }

  const result = row ? calcResult(row) : null;

  function shareWhatsApp() {
    if (!row) return;
    const message = buildMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  async function copyMessage() {
    if (!row) return;
    try {
      const message = buildMessage();
      await navigator.clipboard.writeText(message);
      alert("Mensaje copiado");
    } catch {
      alert("No se pudo copiar el mensaje");
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-center text-gray-300">Cargando...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !row) {
    return (
      <PageWrapper>
        <div className="bg-gray-800 border border-red-700 rounded-xl p-6 text-red-400">
          <p className="font-medium">{error || "No encontrado"}</p>
        </div>
        <div className="mt-6">
          <Link href="/matches" className="text-sm text-gray-400 hover:text-green-500 underline">
            ← Volver
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const date = formatDateLong(row.played_at);
  const pending = !hasAnyScore(row) && result === null;

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

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1 flex items-center gap-2 flex-wrap">
          <span>
            {date} · {row.match_type}
            {row.location ? ` · ${row.location}` : ""}
          </span>

          {pending && (
            <span className="rounded-full bg-gray-700 border border-gray-600 px-3 py-1 text-xs text-gray-300">
              Pendiente
            </span>
          )}

          {!pending && result === "Inacabado" && (
            <span className="rounded-full bg-yellow-900/30 border border-yellow-700 px-3 py-1 text-xs text-yellow-400">
              Inacabado
            </span>
          )}
          {!pending && result === "Victoria" && (
            <span className="rounded-full bg-green-900/30 border border-green-700 px-3 py-1 text-xs text-green-400">
              Victoria
            </span>
          )}
          {!pending && result === "Derrota" && (
            <span className="rounded-full bg-red-900/30 border border-red-700 px-3 py-1 text-xs text-red-400">
              Derrota
            </span>
          )}
        </div>

        <div className="mb-4">
          <PageHeader
            title={pending ? "Partido pendiente" : result ?? "Partido"}
            subtitle="Detalles del partido"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={() => router.push(`/matches/${id}/edit`)}
            className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-300 text-xs sm:text-sm hover:bg-gray-600 transition whitespace-nowrap"
          >
            Editar
          </button>

          <button
            onClick={shareWhatsApp}
            className="px-3 py-2 rounded-lg border border-green-700 bg-green-900/30 text-green-300 text-xs sm:text-sm hover:bg-green-900/50 transition whitespace-nowrap"
          >
            WhatsApp
          </button>

          <button
            onClick={copyMessage}
            className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-300 text-xs sm:text-sm hover:bg-gray-600 transition whitespace-nowrap"
          >
            Copiar
          </button>

          <button
            onClick={deleteMatch}
            className="px-3 py-2 rounded-lg border border-red-700 bg-red-900/30 text-red-400 text-xs sm:text-sm hover:bg-red-900/50 transition whitespace-nowrap"
          >
            Borrar
          </button>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="mt-6 grid gap-4">
          {/* ✅ Confirmaciones (solo si es partido compartido) */}
          {isSharedMatch && (
            <div className="rounded-xl bg-gray-700 border border-gray-600 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-medium text-gray-300">Confirmaciones</div>
                {participantsLoading && (
                  <div className="text-xs text-gray-300">Cargando confirmaciones…</div>
                )}
              </div>

              <div className="mt-3 grid gap-2">
                {participants.length === 0 && !participantsLoading ? (
                  <p className="text-sm text-gray-300">
                    No hay participantes registrados para este partido compartido.
                  </p>
                ) : (
                  participants.map((p) => (
                    <div key={p.user_id} className="flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-200">
                        <span className="text-gray-400">Jugador:</span>{" "}
                        <span className="font-medium">{shortId(p.user_id)}</span>
                        {p.user_id === userId ? (
                          <span className="ml-2 text-xs text-green-300">(tú)</span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        {p.elo_change !== null && p.elo_change !== undefined && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${p.elo_change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {p.elo_change >= 0 ? '+' : ''}{p.elo_change} ELO
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${statusPillClass(p.status)}`}
                        >
                          {statusLabel(p.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {myParticipant && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => updateMyStatus("confirmed")}
                    className="px-4 py-2 rounded-lg border border-green-700 bg-green-900/30 text-green-300 text-sm hover:bg-green-900/50 transition"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => updateMyStatus("rejected")}
                    className="px-4 py-2 rounded-lg border border-red-700 bg-red-900/30 text-red-400 text-sm hover:bg-red-900/50 transition"
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {!myParticipant && (
                <p className="mt-3 text-xs text-gray-300">
                  ℹ️ Solo puedes confirmar/rechazar si estás añadido como participante en este partido compartido.
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl bg-gray-700 border border-gray-600 p-4">
            <div className="text-sm font-medium text-gray-300">Resultado</div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-lg font-semibold text-white">
              <div>Set 1: {scoreLine(row.set1_us, row.set1_them)}</div>
              <div>Set 2: {scoreLine(row.set2_us, row.set2_them)}</div>
              <div>Set 3: {scoreLine(row.set3_us, row.set3_them)}</div>
            </div>

            {row.status === 'confirmed' ? (
              <p className="mt-3 text-xs text-green-400 flex items-center gap-2 font-bold italic">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                ESTE RESULTADO ES OFICIAL Y HA AFECTADO AL RANKING
              </p>
            ) : (
              <p className="mt-3 text-xs text-gray-400">
                ℹ️ Este partido está pendiente de confirmación oficial por el club para impactar en el ranking.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-gray-700 border border-gray-600 p-4">
            <div className="text-sm font-medium text-gray-300">Jugadores</div>
            <div className="mt-2 text-sm text-gray-300">
              <div>
                <span className="font-medium text-white">Pareja:</span> {renderPlayer(row.partner_name)}
              </div>
              <div className="mt-1">
                <span className="font-medium text-white">Rivales:</span> {renderPlayer(row.opponent1_name)}
                {row.opponent2_name ? <> / {renderPlayer(row.opponent2_name)}</> : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gray-700 border border-gray-600 p-4">
            <div className="text-sm font-medium text-gray-300">Sensaciones (1–5)</div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-gray-300">
              <div>
                <span className="font-medium text-white">General:</span> {row.overall_feeling ?? "—"}
              </div>
              <div>
                <span className="font-medium text-white">Físico:</span> {row.physical_feeling ?? "—"}
              </div>
              <div>
                <span className="font-medium text-white">Mental:</span> {row.mental_feeling ?? "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gray-700 border border-gray-600 p-4">
            <div className="text-sm font-medium text-gray-300">Notas</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{row.notes || "—"}</div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
