"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../../../components/PageHeader";
import PageWrapper from "../../../components/PageWrapper";

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
  is_public: boolean;
};

export default function EditMatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [matchType, setMatchType] = useState("pachanga");
  const [location, setLocation] = useState("");
  const [playedAt, setPlayedAt] = useState("");

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
  
  // Opción de publicar partido en el feed
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("matches")
        .select(
          "id, played_at, match_type, location, partner_name, opponent1_name, opponent2_name, set1_us, set1_them, set2_us, set2_them, set3_us, set3_them, overall_feeling, physical_feeling, mental_feeling, notes, is_public"
        )
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Partido no encontrado");
        setLoading(false);
        return;
      }

      const match = data as MatchRow;

      // Pre-llenar todos los campos
      setMatchType(match.match_type || "pachanga");
      setLocation(match.location || "");
      
      // Formatear fecha para input type="datetime-local"
      if (match.played_at) {
        const date = new Date(match.played_at);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        setPlayedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
      }

      setPartnerName(match.partner_name || "");
      setOp1(match.opponent1_name || "");
      setOp2(match.opponent2_name || "");

      setS1us(match.set1_us ?? "");
      setS1th(match.set1_them ?? "");
      setS2us(match.set2_us ?? "");
      setS2th(match.set2_them ?? "");
      setS3us(match.set3_us ?? "");
      setS3th(match.set3_them ?? "");

      setOverall(match.overall_feeling ?? "");
      setPhysical(match.physical_feeling ?? "");
      setMental(match.mental_feeling ?? "");

      // Extraer información de partido inacabado de las notas
      let cleanNotes = match.notes || "";
      if (cleanNotes.includes("[PARTIDO INACABADO")) {
        setIsIncomplete(true);
        const matchIncomplete = cleanNotes.match(/\[PARTIDO INACABADO - Motivo: ([^\]]+)\]/);
        if (matchIncomplete) {
          const reason = matchIncomplete[1];
          if (reason === "Falta de tiempo" || reason === "Lesión" || reason === "Pelea/Enfado") {
            setIncompleteReason(reason);
          } else {
            setIncompleteReason("Otro");
            setIncompleteReasonOther(reason);
          }
        }
        // Limpiar las notas del marcador de partido inacabado
        cleanNotes = cleanNotes.replace(/\n\n\[PARTIDO INACABADO[^\]]+\]/g, "").trim();
      }
      setNotes(cleanNotes);

      // Cargar valor de is_public
      setIsPublic(match.is_public || false);

      setLoading(false);
    }

    if (id) load();
  }, [id, router]);

  function num(v: string) {
    if (v === "") return "";
    const n = Number(v);
    return Number.isNaN(n) ? "" : n;
  }

  // Validar resultado de set según normas del pádel (misma función que new-match)
  function validateSetScore(us: number | "", them: number | "", setNumber: number = 1): string | null {
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
      
      if ((u === 6 && t === 5) || (u === 5 && t === 6)) {
        return null;
      }
      
      return null;
    }
    
    if ((u === 7 && t === 6) || (u === 6 && t === 7)) {
      return null;
    }
    
    if ((u === 7 && t === 5) || (u === 5 && t === 7)) {
      return null;
    }
    
    if (maxScore === 6 && diff >= 2 && minScore <= 4) {
      return null;
    }
    
    if (u > 7 || t > 7) {
      return "El máximo en un set es 7 juegos (7-5 o 7-6 con tie-break)";
    }
    
    return "Resultado inválido según las normas del pádel";
  }

  async function updateMatch() {
    setSaving(true);
    setMsg(null);

    // Validar resultados
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
      setSaving(false);
      setMsg(errors.join("\n"));
      return;
    }

    // Validar partido inacabado
    if (isIncomplete) {
      if (!incompleteReason) {
        setSaving(false);
        setMsg("Por favor, selecciona el motivo por el que el partido quedó inacabado.");
        return;
      }
      if (incompleteReason === "Otro" && !incompleteReasonOther.trim()) {
        setSaving(false);
        setMsg("Por favor, especifica el motivo del partido inacabado.");
        return;
      }
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setSaving(false);
      setMsg("No estás logueado. Ve a /login.");
      return;
    }

    // Añadir información de partido inacabado a las notas
    let finalNotes = notes;
    if (isIncomplete && incompleteReason) {
      const reason = incompleteReason === "Otro" ? incompleteReasonOther : incompleteReason;
      const incompleteInfo = `\n\n[PARTIDO INACABADO - Motivo: ${reason}]`;
      finalNotes = notes ? notes + incompleteInfo : incompleteInfo.trim();
    }

    // Formatear fecha para Supabase
    const playedAtFormatted = playedAt ? new Date(playedAt).toISOString() : new Date().toISOString();

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        match_type: matchType,
        location: location || null,
        played_at: playedAtFormatted,
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
        is_public: isPublic,
      })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      setMsg(updateError.message);
    } else {
      // Redirigir a la página de detalle del partido
      router.push(`/matches/${id}`);
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

  if (error) {
    return (
      <PageWrapper>
        <div className="bg-gray-800 border border-red-700 rounded-xl p-6 text-red-400">
          <p className="font-medium">{error}</p>
        </div>
        <div className="mt-6">
          <a href={`/matches/${id}`} className="text-sm text-gray-400 hover:text-green-500 underline">
            ← Volver al partido
          </a>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader 
        title="Editar partido"
        subtitle="Modifica los datos del partido"
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">Fecha y hora</label>
            <input
              type="datetime-local"
              className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          </div>

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

          {/* Opción de visibilidad */}
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
                  className={`rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full ${
                    s1us !== "" && s1th !== "" && validateSetScore(s1us, s1th, 1) 
                      ? "border-red-500" 
                      : ""
                  }`}
                  placeholder="Set1 tú" 
                  value={s1us} 
                  onChange={(e)=>setS1us(num(e.target.value))} 
                />
                {s1us !== "" && s1th !== "" && validateSetScore(s1us, s1th, 1) && (
                  <p className="text-xs text-red-400 mt-1">{validateSetScore(s1us, s1th, 1)}</p>
                )}
              </div>
              <div>
                <input 
                  className={`rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full ${
                    s1us !== "" && s1th !== "" && validateSetScore(s1us, s1th, 1) 
                      ? "border-red-500" 
                      : ""
                  }`}
                  placeholder="Set1 ellos" 
                  value={s1th} 
                  onChange={(e)=>setS1th(num(e.target.value))} 
                />
              </div>
              <div className="hidden sm:block" />
              <div>
                <input 
                  className={`rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full ${
                    s2us !== "" && s2th !== "" && validateSetScore(s2us, s2th, 2) 
                      ? "border-red-500" 
                      : ""
                  }`}
                  placeholder="Set2 tú" 
                  value={s2us} 
                  onChange={(e)=>setS2us(num(e.target.value))} 
                />
                {s2us !== "" && s2th !== "" && validateSetScore(s2us, s2th, 2) && (
                  <p className="text-xs text-red-400 mt-1">{validateSetScore(s2us, s2th, 2)}</p>
                )}
              </div>
              <div>
                <input 
                  className={`rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full ${
                    s2us !== "" && s2th !== "" && validateSetScore(s2us, s2th, 2) 
                      ? "border-red-500" 
                      : ""
                  }`}
                  placeholder="Set2 ellos" 
                  value={s2th} 
                  onChange={(e)=>setS2th(num(e.target.value))} 
                />
              </div>
              <div className="hidden sm:block" />
              <div>
                <input 
                  className={`rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full ${
                    s3us !== "" && s3th !== "" && validateSetScore(s3us, s3th, 3) 
                      ? "border-red-500" 
                      : ""
                  }`}
                  placeholder="Set3 tú" 
                  value={s3us} 
                  onChange={(e)=>setS3us(num(e.target.value))} 
                />
                {s3us !== "" && s3th !== "" && validateSetScore(s3us, s3th, 3) && (
                  <p className="text-xs text-red-400 mt-1">{validateSetScore(s3us, s3th, 3)}</p>
                )}
              </div>
              <div>
                <input 
                  className={`rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full ${
                    s3us !== "" && s3th !== "" && validateSetScore(s3us, s3th, 3) 
                      ? "border-red-500" 
                      : ""
                  }`}
                  placeholder="Set3 ellos" 
                  value={s3th} 
                  onChange={(e)=>setS3th(num(e.target.value))} 
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Set 3 úsalo para 3er set o súper tie-break si lo juegas.
            </p>
            <p className="text-xs text-gray-400">
              Resultados válidos: 6-0 a 6-4, 7-5, o 7-6 (tie-break). Un set se gana con diferencia de 2 juegos o 7-6.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isIncomplete}
                onChange={(e) => {
                  setIsIncomplete(e.target.checked);
                  if (!e.target.checked) setIncompleteReason("");
                }}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-300">Partido inacabado</span>
            </label>
            {isIncomplete && (
              <div className="ml-6 space-y-2">
                <label className="text-sm text-gray-300">Motivo del partido inacabado:</label>
                <select
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
                  value={incompleteReason}
                  onChange={(e) => {
                    setIncompleteReason(e.target.value);
                    if (e.target.value !== "Otro") {
                      setIncompleteReasonOther("");
                    }
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
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 mt-2"
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
            <label className="text-sm font-medium text-gray-300">Sensaciones (1–5)</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3" placeholder="General" value={overall} onChange={(e)=>setOverall(num(e.target.value))} />
              <input className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3" placeholder="Físico" value={physical} onChange={(e)=>setPhysical(num(e.target.value))} />
              <input className="rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3" placeholder="Mental" value={mental} onChange={(e)=>setMental(num(e.target.value))} />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-300">Notas</label>
            <textarea
              className="min-h-[110px] rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qué salió bien, qué mejorar, sensaciones..."
            />
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 rounded-lg bg-green-600 py-3 text-white font-medium disabled:opacity-50 hover:bg-green-700 transition"
              disabled={saving}
              onClick={updateMatch}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              className="px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
              onClick={() => router.push(`/matches/${id}`)}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>

          {msg && (
            <div className="rounded-lg bg-gray-800 p-3 text-sm text-gray-300 border border-gray-700">
              {msg}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
