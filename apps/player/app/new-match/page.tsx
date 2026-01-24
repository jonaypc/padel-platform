"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";

export default function NewMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [matchType, setMatchType] = useState("pachanga");
  const [location, setLocation] = useState("");

  const [partnerName, setPartnerName] = useState("");
  const [op1, setOp1] = useState("");
  const [op2, setOp2] = useState("");

  const [s1us, setS1us] = useState<number | "">("");
  const [s1th, setS1th] = useState<number | "">("");
  const [s2us, setS2us] = useState<number | "">("");
  const [s2th, setS2th] = useState<number | "">("");
  const [s3us, setS3us] = useState<number | "">("");
  const [s3th, setS3th] = useState<number | "">("");

  const [overall, setOverall] = useState<number | "">("");
  const [physical, setPhysical] = useState<number | "">("");
  const [mental, setMental] = useState<number | "">("");

  const [notes, setNotes] = useState("");
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState<string>("");
  const [incompleteReasonOther, setIncompleteReasonOther] = useState<string>("");

  // NUEVO: publicar partido en el feed
  const [isPublic, setIsPublic] = useState(true);

  function num(v: string) {
    if (v === "") return "";
    const n = Number(v);
    return Number.isNaN(n) ? "" : n;
  }

  function validateSetScore(
    us: number | "",
    them: number | "",
    setNumber: number = 1
  ): string | null {
    if (us === "" || them === "") return null;

    const u = Number(us);
    const t = Number(them);

    if (u < 0 || t < 0) return "Los juegos no pueden ser negativos";
    if (u > 7 || t > 7) return "El máximo en un set es 7 juegos (o 7-6 con tie-break)";

    const diff = Math.abs(u - t);
    const maxScore = Math.max(u, t);
    const minScore = Math.min(u, t);

    let lastSetWithResult = 0;
    if (s3us !== "" && s3th !== "") lastSetWithResult = 3;
    else if (s2us !== "" && s2th !== "") lastSetWithResult = 2;
    else if (s1us !== "" && s1th !== "") lastSetWithResult = 1;

    if (isIncomplete && setNumber === lastSetWithResult) {
      const isSetFinished =
        (maxScore === 6 && minScore <= 4) ||
        (maxScore === 7 && (minScore === 5 || minScore === 6));

      if (isSetFinished) {
        return `El Set ${setNumber} está terminado (${u}-${t}). Si el partido está inacabado, el último set no puede estar completo.`;
      }
      if (maxScore === 7) {
        return "Un set con 7 juegos está terminado. Si el partido está inacabado, el último set no puede estar completo.";
      }
      return null;
    }

    if ((u === 7 && t === 6) || (u === 6 && t === 7)) return null; // 7-6
    if ((u === 7 && t === 5) || (u === 5 && t === 7)) return null; // 7-5
    if (u === 6 && t < 5) return null; // 6-0..6-4
    if (t === 6 && u < 5) return null; // 0-6..4-6

    if (u === 6 && t === 5) {
      return "Un set no puede terminar 6-5. Debe ser 7-5 o continuar hasta 6-4 o 7-6";
    }
    if (t === 6 && u === 5) {
      return "Un set no puede terminar 5-6. Debe ser 5-7 o continuar hasta 4-6 o 6-7";
    }

    if ((u === 6 || t === 6) && diff < 2) {
      return "Para ganar un set a 6, la diferencia debe ser de al menos 2 juegos";
    }
    if (u < 6 && t < 6) {
      return "Un set debe llegar al menos a 6 juegos para el ganador";
    }

    return "Resultado inválido según las normas del pádel";
  }

  async function saveMatch() {
    setLoading(true);
    setMsg(null);

    const errors: string[] = [];

    if (s1us !== "" && s1th !== "") {
      const error = validateSetScore(s1us, s1th, 1);
      if (error) errors.push(`Set 1: ${error}`);
    }
    if (s2us !== "" && s2th !== "") {
      const error = validateSetScore(s2us, s2th, 2);
      if (error) errors.push(`Set 2: ${error}`);
    }
    if (s3us !== "" && s3th !== "") {
      const error = validateSetScore(s3us, s3th, 3);
      if (error) errors.push(`Set 3: ${error}`);
    }

    if (errors.length > 0) {
      setLoading(false);
      setMsg(errors.join("\n"));
      return;
    }

    if (isIncomplete) {
      if (!incompleteReason) {
        setLoading(false);
        setMsg("Por favor, selecciona el motivo por el que el partido quedó inacabado.");
        return;
      }
      if (incompleteReason === "Otro" && !incompleteReasonOther.trim()) {
        setLoading(false);
        setMsg("Por favor, especifica el motivo del partido inacabado.");
        return;
      }
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setLoading(false);
      setMsg("No estás logueado. Ve a /login.");
      return;
    }

    const userId = userData.user.id;

    let finalNotes = notes;
    if (isIncomplete && incompleteReason) {
      const reason = incompleteReason === "Otro" ? incompleteReasonOther : incompleteReason;
      const incompleteInfo = `\n\n[PARTIDO INACABADO - Motivo: ${reason}]`;
      finalNotes = notes ? notes + incompleteInfo : incompleteInfo.trim();
    }

    // 1) Crear match
    const { data: matchData, error } = await supabase
      .from("matches")
      .insert({
        user_id: userId,
        match_type: matchType,
        location: location || null,
        partner_name: partnerName || null,
        opponent1_name: op1 || null,
        opponent2_name: op2 || null,
        set1_us: s1us === "" ? null : s1us,
        set1_them: s1th === "" ? null : s1th,
        set2_us: s2us === "" ? null : s2us,
        set2_them: s2th === "" ? null : s2th,
        set3_us: s3us === "" ? null : s3us,
        set3_them: s3th === "" ? null : s3th,
        overall_feeling: overall === "" ? null : overall,
        physical_feeling: physical === "" ? null : physical,
        mental_feeling: mental === "" ? null : mental,
        notes: finalNotes || null,

        // NUEVO: visibilidad en feed
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      setMsg(error.message);
      return;
    }

    if (!matchData?.id) {
      setLoading(false);
      setMsg("Partido guardado pero no se pudo obtener el ID");
      return;
    }

    // 2) MUY IMPORTANTE (multiusuario): añadirme como participante
    const { error: partErr } = await supabase.from("match_participants").insert({
      match_id: matchData.id,
      user_id: userId,
      team: "A",
    });

    if (partErr) {
      // Si falla, el partido existe pero no te aparecerá en el historial/ranking.
      // Preferimos avisar y NO redirigir para que lo veas claro.
      setLoading(false);
      setMsg(
        "El partido se guardó, pero no se pudo añadir tu participación (match_participants). " +
          "Por eso no aparece en el historial. Error: " +
          partErr.message
      );
      return;
    }

    setLoading(false);
    router.push(`/matches/${matchData.id}`);
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

      <PageHeader title="Nuevo partido" subtitle="Registra un nuevo partido de pádel" />

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Tipo</label>
            <select
              className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
            >
              <option value="pachanga">Pachanga</option>
              <option value="entrenamiento">Entrenamiento</option>
              <option value="liga">Liga</option>
              <option value="torneo">Torneo</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Club / pista</label>
            <input
              className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Club X, pista 3"
            />
          </div>

          {/* NUEVO: visibilidad */}
          <div className="grid gap-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500 focus:ring-2"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-white block">
                  Hacer público este partido
                </span>
                <span className="text-xs text-gray-400 block mt-1">
                  Aparece en el feed
                </span>
              </div>
            </label>
            <p className="text-xs text-gray-400 ml-7">
              Solo se mostrará si tu perfil está en modo público (lo puedes activar en Perfil).
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Pareja</label>
            <input
              className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Nombre de tu pareja"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Rivales</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={op1}
                onChange={(e) => setOp1(e.target.value)}
                placeholder="Rival 1"
              />
              <input
                className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={op2}
                onChange={(e) => setOp2(e.target.value)}
                placeholder="Rival 2"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Resultado (sets)</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <input
                  className={`rounded-lg border bg-gray-700 text-white px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    s1us !== "" && s1th !== "" && validateSetScore(s1us, s1th, 1) ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Set1 tú"
                  value={s1us}
                  onChange={(e) => setS1us(num(e.target.value))}
                />
                {s1us !== "" && s1th !== "" && validateSetScore(s1us, s1th, 1) && (
                  <p className="text-xs text-red-400 mt-1">{validateSetScore(s1us, s1th, 1)}</p>
                )}
              </div>
              <div>
                <input
                  className={`rounded-lg border bg-gray-700 text-white px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    s1us !== "" && s1th !== "" && validateSetScore(s1us, s1th, 1) ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Set1 ellos"
                  value={s1th}
                  onChange={(e) => setS1th(num(e.target.value))}
                />
              </div>

              <div className="hidden sm:block" />

              <div>
                <input
                  className={`rounded-lg border bg-gray-700 text-white px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    s2us !== "" && s2th !== "" && validateSetScore(s2us, s2th, 2) ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Set2 tú"
                  value={s2us}
                  onChange={(e) => setS2us(num(e.target.value))}
                />
                {s2us !== "" && s2th !== "" && validateSetScore(s2us, s2th, 2) && (
                  <p className="text-xs text-red-400 mt-1">{validateSetScore(s2us, s2th, 2)}</p>
                )}
              </div>
              <div>
                <input
                  className={`rounded-lg border bg-gray-700 text-white px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    s2us !== "" && s2th !== "" && validateSetScore(s2us, s2th, 2) ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Set2 ellos"
                  value={s2th}
                  onChange={(e) => setS2th(num(e.target.value))}
                />
              </div>

              <div className="hidden sm:block" />

              <div>
                <input
                  className={`rounded-lg border bg-gray-700 text-white px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    s3us !== "" && s3th !== "" && validateSetScore(s3us, s3th, 3) ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Set3 tú"
                  value={s3us}
                  onChange={(e) => setS3us(num(e.target.value))}
                />
                {s3us !== "" && s3th !== "" && validateSetScore(s3us, s3th, 3) && (
                  <p className="text-xs text-red-400 mt-1">{validateSetScore(s3us, s3th, 3)}</p>
                )}
              </div>
              <div>
                <input
                  className={`rounded-lg border bg-gray-700 text-white px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    s3us !== "" && s3th !== "" && validateSetScore(s3us, s3th, 3) ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Set3 ellos"
                  value={s3th}
                  onChange={(e) => setS3th(num(e.target.value))}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Set 3 úsalo para 3er set o súper tie-break si lo juegas.
            </p>
            <p className="text-xs text-gray-400">
              Resultados válidos: 6-0 a 6-4, 7-5, o 7-6 (tie-break).
            </p>
          </div>

          <div className="grid gap-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isIncomplete}
                onChange={(e) => {
                  setIsIncomplete(e.target.checked);
                  if (!e.target.checked) setIncompleteReason("");
                }}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-white">Partido inacabado</span>
            </label>

            {isIncomplete && (
              <div className="ml-7 space-y-2">
                <label className="text-sm text-white">Motivo del partido inacabado:</label>
                <select
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={incompleteReason}
                  onChange={(e) => {
                    setIncompleteReason(e.target.value);
                    if (e.target.value !== "Otro") setIncompleteReasonOther("");
                  }}
                  required={isIncomplete}
                >
                  <option value="">Selecciona un motivo</option>
                  <option value="Falta de tiempo">Falta de tiempo</option>
                  <option value="Lesión">Lesión</option>
                  <option value="Pelea/Enfado">Pelea/Enfado</option>
                  <option value="Otro">Otro</option>
                </select>

                {incompleteReason === "Otro" && (
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Especifica el motivo"
                    value={incompleteReasonOther}
                    onChange={(e) => setIncompleteReasonOther(e.target.value)}
                  />
                )}

                <p className="text-xs text-gray-400">
                  Si el partido está inacabado, puedes registrar el resultado parcial del set en curso.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Sensaciones (1–5)</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="General"
                value={overall}
                onChange={(e) => setOverall(num(e.target.value))}
              />
              <input
                className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Físico"
                value={physical}
                onChange={(e) => setPhysical(num(e.target.value))}
              />
              <input
                className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Mental"
                value={mental}
                onChange={(e) => setMental(num(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Notas</label>
            <textarea
              className="min-h-[110px] rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qué salió bien, qué mejorar, sensaciones..."
            />
          </div>

          <button
            className="mt-2 w-full rounded-lg bg-green-600 py-3 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition"
            disabled={loading}
            onClick={saveMatch}
          >
            {loading ? "Guardando..." : "Guardar partido"}
          </button>

          {msg && (
            <div
              className={`rounded-lg p-3 text-sm border whitespace-pre-line ${
                msg.includes("✅") || msg.includes("guardado")
                  ? "bg-green-900/30 border-green-700 text-green-400"
                  : "bg-red-900/30 border-red-700 text-red-400"
              }`}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
