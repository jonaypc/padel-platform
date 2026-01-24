"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Tipos
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

type CommentRow = {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: {
        username: string | null;
    } | null;
};

// Utils 
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
    return `${dayName}, ${day} de ${month} de ${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function scoreText(m: MatchRow) {
    const parts: string[] = [];
    if (m.set1_us != null && m.set1_them != null) parts.push(`${m.set1_us}-${m.set1_them}`);
    if (m.set2_us != null && m.set2_them != null) parts.push(`${m.set2_us}-${m.set2_them}`);
    if (m.set3_us != null && m.set3_them != null) parts.push(`${m.set3_us}-${m.set3_them}`);
    return parts.join("  ");
}

function formatMatchType(type: string | null): string {
    if (!type) return "Partido";
    const types: Record<string, string> = {
        pachanga: "Pachanga",
        entrenamiento: "Entrenamiento",
        liga: "Liga",
        torneo: "Torneo",
    };
    return types[type] || type;
}

type Props = {
    match: MatchRow;
    profile: ProfileLite | undefined;
    result: string | null;
    formatPlayers: (m: MatchRow) => React.ReactNode;
    currentUserId: string | null;
};

export default function FeedMatchCard({
    match,
    profile,
    result,
    formatPlayers,
    currentUserId,
}: Props) {
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<CommentRow[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    // Cargar estado inicial de likes
    useEffect(() => {
        async function loadLikes() {
            // Contar likes
            const { count } = await supabase
                .from("match_likes")
                .select("*", { count: "exact", head: true })
                .eq("match_id", match.id);

            setLikesCount(count || 0);

            // Ver si yo le di like
            if (currentUserId) {
                const { data } = await supabase
                    .from("match_likes")
                    .select("id")
                    .eq("match_id", match.id)
                    .eq("user_id", currentUserId)
                    .maybeSingle();

                setIsLiked(!!data);
            }
        }

        loadLikes();
    }, [match.id, currentUserId]);

    const toggleLike = async () => {
        if (!currentUserId) return;

        // Optimistic update
        const prevLiked = isLiked;
        const prevCount = likesCount;

        setIsLiked(!prevLiked);
        setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

        try {
            if (prevLiked) {
                // Quitar like
                await supabase
                    .from("match_likes")
                    .delete()
                    .eq("match_id", match.id)
                    .eq("user_id", currentUserId);
            } else {
                // Dar like
                await supabase
                    .from("match_likes")
                    .insert({ match_id: match.id, user_id: currentUserId });
            }
        } catch (err) {
            console.error("Error toggling like:", err);
            setIsLiked(prevLiked);
            setLikesCount(prevCount);
        }
    };

    const loadComments = async () => {
        setLoadingComments(true);

        // 1. Cargar comentarios raw
        const { data, error } = await supabase
            .from("match_comments")
            .select("id, user_id, content, created_at")
            .eq("match_id", match.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error loading comments:", error);
        } else if (data) {
            // Typed raw data to avoid implicit any
            type RawComment = { id: string; user_id: string; content: string; created_at: string };
            const rawData = data as RawComment[];

            const userIds = Array.from(new Set(rawData.map((c) => c.user_id)));

            // 3. Cargar perfiles manualmente
            const usernameMap: Record<string, string> = {};
            if (userIds.length > 0) {
                const { data: pData } = await supabase
                    .from("profiles")
                    .select("id, username")
                    .in("id", userIds);

                if (pData) {
                    pData.forEach((p) => {
                        if (p.username) usernameMap[p.id] = p.username;
                    });
                }
            }

            // 4. Combinar datos
            const formattedComments: CommentRow[] = rawData.map((c) => ({
                id: c.id,
                user_id: c.user_id,
                content: c.content,
                created_at: c.created_at,
                profiles: { username: usernameMap[c.user_id] || null }
            }));

            setComments(formattedComments);
        }
        setLoadingComments(false);
    };

    const toggleComments = () => {
        if (!showComments && comments.length === 0) {
            loadComments();
        }
        setShowComments(!showComments);
    };

    const submitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId) return;

        setSubmittingComment(true);

        // Insertar comentario
        const { error } = await supabase
            .from("match_comments")
            .insert({
                match_id: match.id,
                user_id: currentUserId,
                content: newComment.trim(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error inserting comment:", error);
        } else {
            // Recargar comentarios para ver el nuevo
            await loadComments();
            setNewComment("");
        }

        setSubmittingComment(false);
    };

    const name = profile?.username ? `@${profile.username}` : "Jugador";

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-medium">{name}</div>
                        {result && (
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${result === "Ganado"
                                        ? "bg-green-900/50 border border-green-700 text-green-400"
                                        : result === "Perdido"
                                            ? "bg-red-900/50 border border-red-700 text-red-400"
                                            : "bg-yellow-900/50 border border-yellow-700 text-yellow-400"
                                    }`}
                            >
                                {result}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-300 mt-2 font-medium">
                        {formatPlayers(match)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        {match.location ? `${match.location}` : ""}{" "}
                        {match.played_at ? `· ${formatDate(match.played_at)}` : ""}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {formatMatchType(match.match_type)}
                    </div>
                </div>
                <div className="text-sm text-white font-semibold">{scoreText(match) || "—"}</div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-700/50">
                <button
                    onClick={toggleLike}
                    className={`flex items-center gap-1.5 text-sm transition ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"
                        }`}
                >
                    <span className="text-lg">{isLiked ? "❤️" : "🤍"}</span>
                    <span>{likesCount}</span>
                </button>

                <button
                    onClick={toggleComments}
                    className={`flex items-center gap-1.5 text-sm transition ${showComments ? "text-blue-400" : "text-gray-400 hover:text-blue-400"
                        }`}
                >
                    <span className="text-lg">💬</span>
                    <span>Comentar</span>
                </button>
            </div>

            {/* Sección de comentarios */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
                    {loadingComments ? (
                        <p className="text-xs text-gray-500 text-center">Cargando comentarios...</p>
                    ) : comments.length > 0 ? (
                        <div className="space-y-3">
                            {comments.map((c) => (
                                <div key={c.id} className="text-sm">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-gray-300 font-semibold text-xs">
                                            {c.profiles?.username ? `@${c.profiles.username}` : "Usuario"}
                                        </span>
                                        <span className="text-gray-500 text-[10px]">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mt-0.5">{c.content}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 text-center">Sé el primero en comentar.</p>
                    )}

                    {/* Formulario de comentario */}
                    <form onSubmit={submitComment} className="flex gap-2 mt-2">
                        <input
                            name="comment"
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escribe un comentario..."
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={submittingComment || !newComment.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                        >
                            Enviar
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
