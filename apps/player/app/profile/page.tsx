"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@padel/supabase";
import PageWrapper from "../components/PageWrapper";
import PageHeader from "../components/PageHeader";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

type PublicStats = {
  matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  ranking: number | null;
};

type MatchStatsRow = {
  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;
};

function didWinMatch(m: MatchStatsRow) {
  let us = 0;
  let them = 0;

  const sets = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];

  for (const [a, b] of sets) {
    if (a == null || b == null) continue;
    if (a > b) us++;
    if (b > a) them++;
  }

  return us > them;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username]
  );

  const publicUrl = useMemo(() => {
    if (!isPublic || !normalizedUsername) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/players/${normalizedUsername}`;
  }, [isPublic, normalizedUsername]);

  const hasInitialized = useRef(false);

  // Sincronizar valores iniciales desde profile solo una vez
  const initialValues = useMemo(() => {
    if (authLoading || !user || !profile) return null;
    return {
      displayName: profile.display_name ?? "",
      username: profile.username ?? "",
      isPublic: Boolean(profile.is_public)
    };
  }, [authLoading, user, profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (initialValues && !hasInitialized.current) {
      /* eslint-disable react-hooks/set-state-in-effect -- Valid: sync initial state from async auth context */
      setDisplayName(initialValues.displayName);
      setUsername(initialValues.username);
      setIsPublic(initialValues.isPublic);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      hasInitialized.current = true;
    }
  }, [authLoading, user, initialValues, router]);

  async function computePublicStats(userId: string): Promise<PublicStats> {
    const { data, error } = await supabase
      .from("player_rankings")
      .select("matches_played, wins, losses, win_rate, points")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { matches: 0, wins: 0, losses: 0, win_rate: 0, ranking: null };
    }

    return {
      matches: data.matches_played,
      wins: data.wins,
      losses: data.losses,
      win_rate: data.win_rate,
      ranking: data.points // Usamos 'points' como el valor para mostrar en ranking
    };
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setCopyMsg(null);

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    if (isPublic && !normalizedUsername) {
      setError("Para hacer tu perfil público necesitas un username.");
      setSaving(false);
      return;
    }

    if (normalizedUsername && !isValidUsername(normalizedUsername)) {
      setError("Username inválido (3–20 caracteres: a-z, 0-9, _).");
      setSaving(false);
      return;
    }

    if (normalizedUsername) {
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (taken) {
        setError("Ese username ya está ocupado.");
        setSaving(false);
        return;
      }
    }

    const public_stats = isPublic
      ? await computePublicStats(user.id)
      : undefined;

    type ProfileUpdatePayload = {
      display_name: string | null;
      username: string | null;
      is_public: boolean;
      updated_at: string;
      public_stats?: PublicStats;
    };

    const payload: ProfileUpdatePayload = {
      display_name: displayName.trim() || null,
      username: normalizedUsername || null,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    };

    if (public_stats) payload.public_stats = public_stats;

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      setError("No se pudo guardar el perfil.");
    } else {
      setSuccess("Perfil actualizado.");
    }

    setSaving(false);
  }

  async function onCopyLink() {
    if (!publicUrl) return;

    setCopyMsg(null);
    const ok = await copyToClipboard(publicUrl);
    setCopyMsg(ok ? "Enlace copiado ✅" : "No se pudo copiar el enlace.");
    window.setTimeout(() => setCopyMsg(null), 2500);
  }

  function onOpenProfile() {
    if (!normalizedUsername) return;
    router.push(`/players/${normalizedUsername}`);
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-300">
          Cargando…
        </div>
      </PageWrapper>
    );
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
        title="Tu perfil"
        subtitle="Configura tu información pública"
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-4">
        {/* mensajes */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-700 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded bg-green-900/30 border border-green-700 text-green-400 text-sm">
            {success}
          </div>
        )}
        {copyMsg && (
          <div className="mb-4 p-3 rounded bg-gray-900/30 border border-gray-700 text-gray-200 text-sm">
            {copyMsg}
          </div>
        )}

        {/* formulario */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white">
              Nombre visible
            </label>
            <input
              className="w-full mt-1 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white">
              Username público
            </label>
            <input
              className="w-full mt-1 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-xs text-gray-400 mt-1">
              3–20 caracteres: a-z, 0-9, _
            </p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span className="text-sm text-white">
              Hacer mi perfil público
            </span>
          </label>

          <div className="grid gap-3 mt-6">
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full rounded-lg bg-green-600 py-3 text-white font-medium disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar perfil"}
            </button>

            <button
              onClick={onCopyLink}
              disabled={!publicUrl}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 py-3 text-white disabled:opacity-50"
            >
              Copiar enlace
            </button>

            <button
              onClick={onOpenProfile}
              disabled={!publicUrl}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 py-3 text-white disabled:opacity-50"
            >
              Abrir perfil
            </button>
          </div>

          {publicUrl && (
            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-1">URL pública</p>
              <p className="text-sm text-green-400 font-mono break-all">
                {publicUrl}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
