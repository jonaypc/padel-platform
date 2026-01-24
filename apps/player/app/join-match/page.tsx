"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";

type SharedMatchPreview = {
  id: string;
  played_at: string | null;
  match_type: string | null;
  location: string | null;
  notes: string | null;
};

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function extractShareCode(notes: string | null): string | null {
  if (!notes) return null;
  // Esperamos algo como: "PARTIDO COMPARTIDO - Código: ABCD1234"
  const m = notes.match(/Código:\s*([A-Z0-9]{4,20})/i);
  return m?.[1] ? normalizeCode(m[1]) : null;
}

function extractInvitedEmails(notes: string | null): string[] {
  if (!notes) return [];
  // Esperamos algo como: "Invitados: a@b.com, c@d.com"
  const m = notes.match(/Invitados:\s*(.+)$/im);
  if (!m?.[1]) return [];
  const raw = m[1].trim();
  if (!raw || raw.toLowerCase() === "ninguno") return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function formatDateShort(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export default function JoinMatchPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const [foundMatch, setFoundMatch] = useState<SharedMatchPreview | null>(null);
  const [foundShareCode, setFoundShareCode] = useState<string | null>(null);

  useEffect(() => {
    // Sesión opcional para "ver" (depende de RLS), necesaria para "unirse"
    supabase.auth.getSession().then(({ data }) => {
      setSessionUserId(data.session?.user?.id ?? null);
      setCheckingSession(false);
    });
  }, []);

  const invited = useMemo(() => extractInvitedEmails(foundMatch?.notes ?? null), [foundMatch]);

  async function findByCode() {
    const normalized = normalizeCode(code);
    if (!normalized) {
      setMsg("Introduce un código.");
      return;
    }

    setLoading(true);
    setMsg(null);
    setFoundMatch(null);
    setFoundShareCode(null);

    // Buscamos en notes el patrón que tú guardas:
    // "PARTIDO COMPARTIDO - Código: XXXXX"
    const pattern = `%Código: ${normalized}%`;

    const { data, error } = await supabase
      .from("matches")
      .select("id, played_at, match_type, location, notes")
      .ilike("notes", pattern)
      .order("played_at", { ascending: false })
      .limit(5);

    if (error) {
      setLoading(false);
      setMsg(
        "No se pudo buscar el partido. Si no has iniciado sesión, prueba a iniciar sesión y reintentar."
      );
      return;
    }

    const candidates = (data ?? []) as SharedMatchPreview[];

    // Validación extra: asegurarnos de que el código encontrado en notes coincide exacto
    const exact = candidates.find((m) => extractShareCode(m.notes) === normalized) ?? null;

    if (!exact) {
      setLoading(false);
      setMsg("No se encontró ningún partido con ese código.");
      return;
    }

    setFoundMatch(exact);
    setFoundShareCode(extractShareCode(exact.notes));
    setLoading(false);
  }

  async function joinMatch() {
    if (!foundMatch) return;

    if (!sessionUserId) {
      setMsg("Para unirte necesitas iniciar sesión.");
      router.push("/login");
      return;
    }

    setLoading(true);
    setMsg(null);

    // Insert en match_participants (tabla ya existe porque la usas en ranking)
    const { error } = await supabase.from("match_participants").insert({
      match_id: foundMatch.id,
      user_id: sessionUserId,
    });

    if (error) {
      // Si ya está unido o hay constraint, mostramos mensaje amigable
      setLoading(false);
      setMsg(
        "No se pudo unir (puede que ya estés unido a este partido). Aun así puedes ver los detalles."
      );
      return;
    }

    setLoading(false);
    setMsg("✅ Te has unido al partido. Ya cuenta como partido compartido en tu historial.");
  }

  function goToDetails() {
    if (!foundMatch) return;
    router.push(`/matches/${foundMatch.id}`);
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
        title="Unirse a un partido"
        subtitle="Introduce un código para ver el partido y (si quieres) unirte"
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Código del partido
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: Q7P4M9A2"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-2">
              El organizador te lo habrá pasado. Se guarda como “Código: XXXXX” en el partido.
            </p>
          </div>

          <button
            onClick={findByCode}
            disabled={loading || !code.trim()}
            className="w-full rounded-lg bg-green-600 py-3 text-white disabled:opacity-50 hover:bg-green-700 transition"
          >
            {loading ? "Buscando..." : "Buscar partido"}
          </button>

          {msg && (
            <div className="rounded-lg bg-gray-800 p-3 text-sm text-gray-300 border border-gray-700">
              {msg}
            </div>
          )}

          {foundMatch && (
            <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-400">Código encontrado</p>
                  <p className="text-lg font-semibold text-white">{foundShareCode ?? "—"}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-400">Fecha</p>
                  <p className="text-sm font-medium text-white">
                    {formatDateShort(foundMatch.played_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
                  <p className="text-gray-400">Tipo</p>
                  <p className="text-white font-medium">{foundMatch.match_type ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
                  <p className="text-gray-400">Ubicación</p>
                  <p className="text-white font-medium">{foundMatch.location ?? "—"}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
                <p className="text-gray-400 text-sm mb-1">Invitados (informativo)</p>
                {invited.length > 0 ? (
                  <ul className="text-sm text-gray-200 list-disc list-inside space-y-1">
                    {invited.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-200">—</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={goToDetails}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 py-3 text-white hover:bg-gray-600 transition"
                  disabled={loading}
                >
                  Ver detalles
                </button>

                <button
                  onClick={joinMatch}
                  className="w-full rounded-lg bg-green-600 py-3 text-white hover:bg-green-700 transition disabled:opacity-50"
                  disabled={loading || checkingSession}
                  title={
                    !sessionUserId
                      ? "Necesitas iniciar sesión para unirte"
                      : "Unirme al partido"
                  }
                >
                  {loading ? "Procesando..." : "Unirme"}
                </button>
              </div>

              {!sessionUserId && !checkingSession && (
                <p className="text-xs text-gray-400">
                  Para unirte necesitas iniciar sesión. Puedes intentar ver detalles si tu configuración lo permite.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
