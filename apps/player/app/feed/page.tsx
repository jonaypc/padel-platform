"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";
import { resolvePublicUsername, usePublicProfilesMap } from "@/lib/publicProfiles";
import FeedMatchCard from "./FeedMatchCard";

type MatchRow = {
  id: string;
  user_id: string;
  played_at: string | null;
  match_type: string | null;
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

type ProfileLite = {
  id: string;
  username: string | null;
  is_public: boolean;
};

function renderPlayerName(name: string | null, map: Record<string, string | null>): React.ReactNode {
  if (!name) return null;
  const username = resolvePublicUsername(name, map);
  if (username) {
    return (
      <Link href={`/players/${username}`} className="text-green-400 hover:underline">
        {name}
      </Link>
    );
  }
  return <span>{name}</span>;
}

function formatPlayers(m: MatchRow, map: Record<string, string | null>): React.ReactNode {
  const players: React.ReactNode[] = [];

  // Pareja (usuario + partner)
  if (m.partner_name) {
    players.push(renderPlayerName(m.partner_name, map));
  }

  // Rivales
  const opponents: React.ReactNode[] = [];
  if (m.opponent1_name) opponents.push(renderPlayerName(m.opponent1_name, map));
  if (m.opponent2_name) opponents.push(renderPlayerName(m.opponent2_name, map));

  if (opponents.length > 0) {
    return (
      <span>
        {players.length > 0 ? (
          <>
            {players.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && " + "}
                {p}
              </React.Fragment>
            ))}
            {" vs "}
          </>
        ) : (
          "Equipo 1 vs "
        )}
        {opponents.map((o, i) => (
          <React.Fragment key={i}>
            {i > 0 && " & "}
            {o}
          </React.Fragment>
        ))}
      </span>
    );
  }

  if (players.length > 0) {
    return (
      <span>
        {players.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && " + "}
            {p}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return "Jugadores no especificados";
}

// Función para detectar si un partido está inacabado
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
  const partidoCompleto = (setsCompletados >= 2 && (us >= 2 || them >= 2)) ||
    (setsCompletados === 3 && us !== them);

  return !partidoCompleto; // Si no está completo y hay sets, está inacabado
}

// Función para determinar si el partido fue ganado, perdido o inacabado
function getMatchResult(m: MatchRow): "Ganado" | "Perdido" | "Inacabado" | null {
  // Si está inacabado, devolver "Inacabado"
  if (isIncompleteMatch(m)) return "Inacabado";

  // Calcula sets ganados vs perdidos
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

  if (us === 0 && them === 0) return null; // no hay resultado suficiente
  if (us === them) return null;

  return us > them ? "Ganado" : "Perdido";
}

export default function FeedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});

  // Filtering
  const [activeTab, setActiveTab] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const { map: publicProfilesMap } = usePublicProfilesMap();

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setMsg(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const userId = userData.user.id;
      if (mounted) setCurrentUserId(userId);

      // Load who I follow
      const { data: followData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const myFollowing = (followData || []).map(f => f.following_id);
      if (mounted) setFollowingIds(myFollowing);

      // Load Matches (limit 50 mostly recent)
      const { data: mData, error: mErr } = await supabase
        .from("matches")
        .select("id,user_id,played_at,match_type,location,partner_name,opponent1_name,opponent2_name,set1_us,set1_them,set2_us,set2_them,set3_us,set3_them,notes,is_public")
        .eq("is_public", true)
        .order("played_at", { ascending: false })
        .limit(100);

      if (!mounted) return;

      if (mErr) {
        setMsg(mErr.message);
        setMatches([]);
        setProfilesById({});
        setLoading(false);
        return;
      }

      const list = (mData ?? []) as MatchRow[];
      const userIds = Array.from(new Set(list.map((x) => x.user_id)));

      // Load Profiles of match owners
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("id,username,is_public")
        .in("id", userIds)
        .eq("is_public", true);

      if (!mounted) return;

      if (pErr) {
        setMsg(pErr.message);
        setMatches([]);
        setProfilesById({});
        setLoading(false);
        return;
      }

      const map: Record<string, ProfileLite> = {};
      (pData ?? []).forEach((p: ProfileLite) => (map[p.id] = p));

      // Filter matches to only valid profiles
      const validMatches = list.filter((m) => !!map[m.user_id]);

      setProfilesById(map);
      setMatches(validMatches);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Derived filtered list
  const filteredMatches = useMemo(() => {
    if (activeTab === "all") return matches;
    return matches.filter(m => followingIds.includes(m.user_id));
  }, [matches, activeTab, followingIds]);

  const empty = !loading && filteredMatches.length === 0;

  return (
    <PageWrapper>
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-500 transition mb-4"
        >
          <span>←</span>
          <span>Volver</span>
        </button>
      </div>

      <PageHeader title="Feed" subtitle="Actividad pública" />

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-2 px-2 text-sm font-medium transition ${activeTab === "all"
              ? "text-white border-b-2 border-green-500"
              : "text-gray-400 hover:text-gray-200"
            }`}
        >
          Global
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`pb-2 px-2 text-sm font-medium transition ${activeTab === "following"
              ? "text-white border-b-2 border-green-500"
              : "text-gray-400 hover:text-gray-200"
            }`}
        >
          Siguiendo
        </button>
      </div>

      <div className="mt-4">
        {loading && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <p className="text-center text-gray-300">Cargando...</p>
          </div>
        )}

        {msg && (
          <div className="rounded-xl bg-gray-800 border border-red-700 p-4 text-sm text-red-400 mb-4">
            {msg}
          </div>
        )}

        {empty && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-300 font-medium mb-2">No hay partidos aquí.</p>
            {activeTab === "following" ? (
              <p className="text-sm text-gray-400">
                Aún no sigues a nadie o tus amigos no han publicado nada. <br />
                ¡Entra en los perfiles para seguir a jugadores!
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Activa tu perfil público en <Link href="/profile" className="text-green-500 hover:underline">/profile</Link> y marca algún partido como público.
              </p>
            )}
          </div>
        )}

        {!loading && !empty && (
          <div className="grid gap-3">
            {filteredMatches.map((m) => {
              const p = profilesById[m.user_id];
              const result = getMatchResult(m);

              const formatPlayersWrapper = (match: MatchRow) => formatPlayers(match, publicProfilesMap);

              return (
                <FeedMatchCard
                  key={m.id}
                  match={m}
                  profile={p}
                  result={result}
                  formatPlayers={formatPlayersWrapper}
                  currentUserId={currentUserId}
                />
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
