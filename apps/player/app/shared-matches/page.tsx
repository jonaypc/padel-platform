"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";

type SharedMatchRow = {
  id: string;
  played_at: string;
  match_type: string;
  location: string | null;
  notes: string | null;
  partner_name: string | null;
  opponent1_name: string | null;
  opponent2_name: string | null;
  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;
};

export default function SharedMatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SharedMatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const userId = sessionData.session.user.id;

      // 1️⃣ Partidos compartidos creados por mí
      const { data: createdByMe, error: err1 } = await supabase
        .from("matches")
        .select(
          "id, played_at, match_type, location, notes, partner_name, opponent1_name, opponent2_name, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them"
        )
        .like("notes", "%PARTIDO COMPARTIDO%")
        .order("played_at", { ascending: false })
        .limit(100);

      if (err1) {
        setError(err1.message);
        setLoading(false);
        return;
      }

      // 2️⃣ Partidos donde soy participante
      const { data: participantRows, error: err2 } = await supabase
        .from("match_participants")
        .select("match_id")
        .eq("user_id", userId);

      if (err2) {
        setError(err2.message);
        setLoading(false);
        return;
      }

      const participantMatchIds = (participantRows ?? []).map((r) => r.match_id);

      let invitedMatches: SharedMatchRow[] = [];

      if (participantMatchIds.length > 0) {
        const { data, error } = await supabase
          .from("matches")
          .select(
            "id, played_at, match_type, location, notes, partner_name, opponent1_name, opponent2_name, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them"
          )
          .in("id", participantMatchIds);

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        invitedMatches = (data as SharedMatchRow[]) || [];
      }

      // 3️⃣ Unir, quitar duplicados y ordenar
      const mergedMap = new Map<string, SharedMatchRow>();

      [...(createdByMe ?? []), ...invitedMatches].forEach((m) => {
        mergedMap.set(m.id, m);
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.played_at).getTime() - new Date(a.played_at).getTime();
      });

      setRows(merged);
      setLoading(false);
    }

    load();
  }, [router]);

  function extractShareCode(notes: string | null): string | null {
    if (!notes) return null;
    const match = notes.match(/Código: (\w+)/);
    return match ? match[1] : null;
  }

  function extractInvitedEmails(notes: string | null): string {
    if (!notes) return "";
    const match = notes.match(/Invitados: (.+)/);
    return match ? match[1] : "";
  }

  function formatDate(iso: string | null): string {
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
    const hoursStr = hours < 10 ? "0" + hours : hours;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${dayName}, ${day} de ${month} de ${year} ${hoursStr}:${minutesStr}`;
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

      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Partidos Compartidos"
          subtitle="Partidos organizados y compartidos con otros jugadores"
        />
        <a
          href="/organize-match"
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm no-underline hover:bg-green-700 transition font-medium"
        >
          + Organizar partido
        </a>
      </div>

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
          <p className="text-gray-300 mb-4">
            Aún no hay partidos compartidos. Crea el primero.
          </p>
          <a
            href="/organize-match"
            className="inline-block px-4 py-2 rounded-lg bg-green-600 text-white no-underline hover:bg-green-700 transition text-sm font-medium"
          >
            Organizar partido
          </a>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4">
          {rows.map((m) => {
            const shareCode = extractShareCode(m.notes);
            const invited = extractInvitedEmails(m.notes);
            const date = formatDate(m.played_at);
            const hasResult = m.set1_us != null || m.set2_us != null || m.set3_us != null;

            return (
              <div
                key={m.id}
                className="block bg-gray-800 border border-gray-700 rounded-xl p-5 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-blue-900/30 border border-blue-700 text-blue-300 px-2 py-1 rounded-full">
                        Compartido
                      </span>
                      {shareCode && (
                        <span className="text-xs bg-gray-700 border border-gray-600 text-gray-300 px-2 py-1 rounded-full">
                          Código: {shareCode}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-400">
                      {date} · {m.match_type}
                      {m.location ? ` · ${m.location}` : ""}
                    </div>

                    {hasResult ? (
                      <div className="mt-2 text-lg font-semibold text-white">
                        {m.set1_us != null && m.set1_them != null
                          ? `${m.set1_us}-${m.set1_them}`
                          : ""}
                        {m.set2_us != null && m.set2_them != null
                          ? ` / ${m.set2_us}-${m.set2_them}`
                          : ""}
                        {m.set3_us != null && m.set3_them != null
                          ? ` / ${m.set3_us}-${m.set3_them}`
                          : ""}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-300">
                        Partido programado - Sin resultado aún
                      </div>
                    )}

                    {invited && (
                      <div className="mt-2 text-xs text-gray-400">
                        Invitados: {invited}
                      </div>
                    )}
                  </div>

                  <a
                    href={`/matches/${m.id}`}
                    className="text-sm text-green-500 font-medium hover:underline"
                  >
                    Ver
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
