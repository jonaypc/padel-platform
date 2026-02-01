"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageWrapper from "../../components/PageWrapper";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import { calculateBadges, getBadgeColorClass } from "@/lib/badges";

type PublicStats = {
  matches: number;
  wins: number;
  losses: number;
  incomplete?: number;
  win_rate: number;
  ranking: number | null;
};

type PublicProfile = {
  username: string;
  display_name: string | null;
  public_stats: PublicStats | null;
  updated_at: string;
  id: string;
};

type MatchRow = {
  played_at: string | null;
  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;
  notes: string | null;
};


export default function PublicPlayerPage() {
  const router = useRouter();
  const params = useParams();

  // `useParams()` puede devolver string | string[]; normalizamos
  const username = useMemo(() => {
    const raw = params?.username;

    if (typeof raw === "string") return raw.toLowerCase();
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0].toLowerCase();

    return "";
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<{ matches: number; wins: number; losses: number; incomplete: number; win_rate: number } | null>(null);

  // Follow states
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Diagnóstico: si falla, mostramos el error real
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProfile(null);
      setFetchError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id || null;
      setCurrentUser(currentUserId);

      if (!username) {
        setFetchError("No se recibió username en la URL.");
        setLoading(false);
        return;
      }

      // Primero buscar el perfil en la tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, public_stats, updated_at, is_public")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();

      if (profileError) {
        setFetchError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setFetchError("No existe perfil público para ese username.");
        setLoading(false);
        return;
      }

      setProfile({
        username: profileData.username,
        display_name: profileData.display_name,
        public_stats: profileData.public_stats,
        updated_at: profileData.updated_at,
        id: profileData.id,
      });

      // Load FOLLOW DATA
      // Check if I follow them
      if (currentUserId && currentUserId !== profileData.id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUserId)
          .eq("following_id", profileData.id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      // Counts
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: 'exact', head: true })
        .eq("following_id", profileData.id);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: 'exact', head: true })
        .eq("follower_id", profileData.id);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);

      // Cargar estadísticas y ranking desde la vista consolidada
      const { data: rankingData, error: rankingError } = await supabase
        .from("player_rankings")
        .select("*")
        .eq("user_id", profileData.id)
        .maybeSingle();

      if (rankingError) {
        console.error("Error cargando estadísticas de ranking:", rankingError);
        setStats(null);
      } else if (rankingData) {
        setStats({
          matches: rankingData.matches_played,
          wins: rankingData.wins,
          losses: rankingData.losses,
          incomplete: 0, // La vista no expone inacabados actualmente, se podría añadir si es necesario
          win_rate: rankingData.win_rate
        });
      } else {
        setStats({ matches: 0, wins: 0, losses: 0, incomplete: 0, win_rate: 0 });
      }

      setLoading(false);
    };

    load();
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    setFollowLoading(true);

    if (isFollowing) {
      // Unfollow
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser)
        .eq("following_id", profile.id);

      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
    } else {
      // Follow
      await supabase
        .from("follows")
        .insert({
          follower_id: currentUser,
          following_id: profile.id
        });

      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-300">
          Cargando…
        </div>
      </PageWrapper>
    );
  }

  if (!profile) {
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
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold text-white mb-2">
            Perfil no disponible
          </h1>
          <p className="text-gray-400 mb-4">
            Este jugador no tiene el perfil público.
          </p>

          {/* Diagnóstico visible (temporal) */}
          {fetchError && (
            <div className="mt-4 p-3 bg-gray-700 border border-gray-600 rounded text-sm text-left">
              <div className="text-gray-300">
                <span className="text-gray-400">username URL:</span>{" "}
                <span className="font-mono text-green-400">{username || "(vacío)"}</span>
              </div>
              <div className="mt-1 text-gray-300">
                <span className="text-gray-400">detalle:</span>{" "}
                <span className="text-red-400">{fetchError}</span>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    );
  }

  // Usar estadísticas calculadas en tiempo real si están disponibles, sino usar las guardadas
  const displayStats: PublicStats = stats
    ? { ...stats, ranking: null }
    : (profile.public_stats as PublicStats) || { matches: 0, wins: 0, losses: 0, incomplete: 0, win_rate: 0, ranking: null };

  const isMe = currentUser === profile.id;

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
        title={profile.display_name || profile.username}
        subtitle={`@${profile.username}`}
      />

      {/* Stats e Info Social */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        {/* Card stats principales */}
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col justify-center items-center gap-1">
          <div className="text-2xl font-bold text-white">{followersCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Seguidores</div>
        </div>
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col justify-center items-center gap-1">
          <div className="text-2xl font-bold text-white">{followingCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Siguiendo</div>
        </div>

        {/* Botón Seguir */}
        {!isMe && currentUser && (
          <div className="flex-1 flex items-stretch">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`w-full rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${isFollowing
                ? "bg-gray-700 text-gray-300 border border-gray-600 hover:bg-red-900/50 hover:text-red-400 hover:border-red-900"
                : "bg-green-600 text-white hover:bg-green-500 border border-green-500"
                }`}
            >
              {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">Estadísticas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <StatCard value={displayStats.matches ?? 0} label="Partidos" />
          <StatCard
            value={`${displayStats.win_rate ?? 0}%`}
            label="% Victorias"
            valueColor="text-blue-500"
          />
          <StatCard
            value={displayStats.wins ?? 0}
            label="Victorias"
            valueColor="text-green-500"
          />
          <StatCard
            value={displayStats.losses ?? 0}
            label="Derrotas"
            valueColor="text-red-500"
          />
          <StatCard
            value={displayStats.incomplete ?? 0}
            label="Inacabados"
            valueColor="text-yellow-500"
          />
        </div>

        {displayStats.ranking != null && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="bg-gray-700 border border-gray-600 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Ranking</p>
              <p className="text-xl font-semibold text-white">{displayStats.ranking}</p>
            </div>
          </div>
        )}
      </div>

      {/* Insignias Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">Logros e Insignias</h3>

        {(() => {
          const badges = calculateBadges(displayStats, followersCount);

          if (badges.length === 0) {
            return (
              <div className="text-center py-6">
                <p className="text-3xl grayscale opacity-30">🎖️</p>
                <p className="text-gray-500 text-sm mt-2">Aún no hay insignias desbloqueadas.</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badges.map(b => (
                <div key={b.id} className={`flex items-center gap-3 p-3 rounded-lg border ${getBadgeColorClass(b.color)}`}>
                  <div className="text-2xl">{b.icon}</div>
                  <div>
                    <div className="text-sm font-bold">{b.label}</div>
                    <div className="text-[10px] opacity-80 leading-tight">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

    </PageWrapper>
  );
}
