"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";

type ProfileLite = {
  id: string;
  username: string | null;
  is_public: boolean;
};

type FollowRow = {
  follower_id: string;
  followed_id: string;
};

type MatchRow = {
  id: string;
  user_id: string;
  played_at: string | null;
  match_type: string | null;
  location: string | null;
  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;
  is_public: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const dayName = days[d.getDay()];
  
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hoursStr = hours < 10 ? '0' + hours : hours;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${dayName}, ${day} de ${month} de ${year} ${hoursStr}:${minutesStr}`;
}

function scoreText(m: MatchRow) {
  const parts: string[] = [];
  if (m.set1_us != null && m.set1_them != null) parts.push(`${m.set1_us}-${m.set1_them}`);
  if (m.set2_us != null && m.set2_them != null) parts.push(`${m.set2_us}-${m.set2_them}`);
  if (m.set3_us != null && m.set3_them != null) parts.push(`${m.set3_us}-${m.set3_them}`);
  return parts.join("  ");
}

function normalizeUsername(input: string) {
  return input.trim().replace(/^@+/, "");
}

export default function FollowingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});
  const [matches, setMatches] = useState<MatchRow[]>([]);

  const [searchUsername, setSearchUsername] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundProfile, setFoundProfile] = useState<ProfileLite | null>(null);

  async function loadAll(uid: string) {
    setLoading(true);
    setMsg(null);

    const { data: fData, error: fErr } = await supabase
      .from("follows")
      .select("follower_id,followed_id")
      .eq("follower_id", uid);

    if (fErr) {
      setMsg(fErr.message);
      setFollowingIds([]);
      setProfilesById({});
      setMatches([]);
      setLoading(false);
      return;
    }

    const follows = (fData ?? []) as FollowRow[];
    const ids = Array.from(new Set(follows.map((f) => f.followed_id)));
    setFollowingIds(ids);

    if (ids.length === 0) {
      setProfilesById({});
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: pData, error: pErr } = await supabase
      .from("profiles")
      .select("id,username,is_public")
      .in("id", ids)
      .eq("is_public", true);

    if (pErr) {
      setMsg(pErr.message);
      setProfilesById({});
      setMatches([]);
      setLoading(false);
      return;
    }

    const pMap: Record<string, ProfileLite> = {};
    (pData ?? []).forEach((p: ProfileLite) => (pMap[p.id] = p));
    setProfilesById(pMap);

    const publicFollowedIds = ids.filter((id) => !!pMap[id]);
    if (publicFollowedIds.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: mData, error: mErr } = await supabase
      .from("matches")
      .select("id,user_id,played_at,match_type,location,set1_us,set1_them,set2_us,set2_them,set3_us,set3_them,is_public")
      .in("user_id", publicFollowedIds)
      .eq("is_public", true)
      .order("played_at", { ascending: false })
      .limit(50);

    if (mErr) {
      setMsg(mErr.message);
      setMatches([]);
      setLoading(false);
      return;
    }

    setMatches((mData ?? []) as MatchRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      if (!mounted) return;
      const uid = userData.user.id;
      setUserId(uid);
      await loadAll(uid);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function search() {
    setMsg(null);
    setFoundProfile(null);

    const u = normalizeUsername(searchUsername);
    if (!u) return setMsg("Escribe un username para buscar.");

    setSearching(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,is_public")
      .eq("username", u)
      .eq("is_public", true)
      .maybeSingle<ProfileLite>();

    setSearching(false);

    if (error) return setMsg(error.message);
    if (!data) return setMsg("No encontrado (o no es público).");

    setFoundProfile(data);
  }

  async function follow(profileId: string) {
    if (!userId) return;
    setMsg(null);

    const { error } = await supabase.from("follows").insert({
      follower_id: userId,
      followed_id: profileId,
    });

    if (error) return setMsg(error.message);

    await loadAll(userId);
    setFoundProfile(null);
    setSearchUsername("");
  }

  async function unfollow(profileId: string) {
    if (!userId) return;
    setMsg(null);

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("followed_id", profileId);

    if (error) return setMsg(error.message);

    await loadAll(userId);
  }

  const empty = useMemo(() => !loading && matches.length === 0, [loading, matches.length]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-500 transition"
          >
            <span>←</span>
            <span>Volver</span>
          </button>
        </div>
        <PageHeader title="Following" subtitle="Actividad pública de los jugadores que sigues" />

        <div className="mt-4 grid gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-white font-medium">Seguir a alguien</div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="username (sin @)"
              />
              <button
                className="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition"
                disabled={searching}
                onClick={search}
              >
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {foundProfile && (
              <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3 flex items-center justify-between">
                <div className="text-gray-200">
                  @{foundProfile.username}
                </div>
                <button
                  className="rounded-lg bg-green-600 px-3 py-2 text-white font-medium hover:bg-green-700 transition"
                  onClick={() => follow(foundProfile.id)}
                >
                  Seguir
                </button>
              </div>
            )}

            {msg && (
              <div className="mt-3 rounded-lg bg-gray-900 p-3 text-sm text-gray-300 border border-gray-700 whitespace-pre-line">
                {msg}
              </div>
            )}
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-white font-medium">Siguiendo</div>
            <div className="mt-3 grid gap-2">
              {followingIds.length === 0 ? (
                <p className="text-gray-300 text-sm">No sigues a nadie todavía.</p>
              ) : (
                followingIds.map((id) => {
                  const p = profilesById[id];
                  const label = p ? `@${p.username}` : "(usuario no público)";
                  return (
                    <div key={id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-3">
                      <div className="text-gray-200 text-sm">{label}</div>
                      <button
                        className="rounded-lg bg-gray-700 px-3 py-2 text-white text-sm hover:bg-gray-600 transition"
                        onClick={() => unfollow(id)}
                      >
                        Dejar de seguir
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            {loading && <p className="text-gray-300">Cargando...</p>}

            {empty && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-gray-300">
                No hay actividad pública de tus seguidos (o aún no sigues a nadie).
              </div>
            )}

            <div className="grid gap-3">
              {matches.map((m) => {
                const p = profilesById[m.user_id];
                const name = p?.username ? `@${p.username}` : "Jugador";

                return (
                  <div key={m.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-medium">{name}</div>
                        <div className="text-xs text-gray-400">
                          {m.match_type || "partido"} {m.location ? `· ${m.location}` : ""}{" "}
                          {m.played_at ? `· ${formatDate(m.played_at)}` : ""}
                        </div>
                      </div>
                      <div className="text-sm text-gray-200 font-semibold">{scoreText(m)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
