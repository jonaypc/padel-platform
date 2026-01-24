"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

type NotificationRow = {
    id: string;
    type: "like" | "comment";
    actor_id: string;
    resource_id: string;
    is_read: boolean;
    created_at: string;
    actor?: {
        username: string | null;
    };
};

function TimeAgo(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return "Ayer";
    return `Hace ${diffDays} días`;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<NotificationRow[]>([]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            const { data: userData } = await supabase.auth.getSession();
            if (!userData.session) {
                router.push("/login");
                return;
            }

            const userId = userData.session.user.id;

            // Cargar notificaciones
            const { data, error } = await supabase
                .from("notifications")
                .select("id, type, actor_id, resource_id, is_read, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (!mounted) return;

            if (error) {
                console.error("Error loading notifications:", error);
                setLoading(false);
                return;
            }

            // Cargar nombres de usuarios (actors)
            const notificationsData = data || [];
            const actorIds = Array.from(new Set(notificationsData.map((n) => n.actor_id)));
            const actorsMap: Record<string, string> = {};

            if (actorIds.length > 0) {
                const { data: pData } = await supabase
                    .from("profiles")
                    .select("id, username")
                    .in("id", actorIds);

                if (pData) {
                    pData.forEach((p) => {
                        if (p.username) {
                            actorsMap[p.id] = p.username;
                        }
                    });
                }
            }

            const formatted: NotificationRow[] = notificationsData.map((n) => ({
                id: n.id,
                type: n.type as "like" | "comment",
                actor_id: n.actor_id,
                resource_id: n.resource_id,
                is_read: n.is_read,
                created_at: n.created_at,
                actor: { username: actorsMap[n.actor_id] || "Usuario" }
            }));

            setNotifications(formatted);
            setLoading(false);

            // Marcar como leídas
            const unreadIds = notificationsData.filter((n) => !n.is_read).map((n) => n.id);
            if (unreadIds.length > 0) {
                await supabase
                    .from("notifications")
                    .update({ is_read: true })
                    .in("id", unreadIds);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [router]);

    return (
        <div className="min-h-screen bg-gray-900 pb-20">
            <AppHeader />

            <div className="max-w-md mx-auto px-4 py-6">
                <div className="mb-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-500 transition mb-4"
                    >
                        <span>←</span>
                        <span>Volver</span>
                    </button>
                </div>

                <PageHeader title="Notificaciones" subtitle="Actividad reciente" />

                <div className="mt-4 space-y-2">
                    {loading && (
                        <div className="text-center py-8 text-gray-500">Cargando...</div>
                    )}

                    {!loading && notifications.length === 0 && (
                        <div className="text-center py-10 bg-gray-800 border border-gray-700 rounded-xl">
                            <p className="text-3xl mb-2">🔕</p>
                            <p className="text-gray-400">No tienes notificaciones nuevas.</p>
                        </div>
                    )}

                    {!loading && notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`p-4 rounded-xl border flex items-start gap-4 transition-colors ${n.is_read
                                    ? "bg-gray-800 border-gray-700 opacity-60"
                                    : "bg-gray-800 border-gray-600 shadow-md"
                                }`}
                        >
                            <div className="text-2xl pt-1">
                                {n.type === "like" ? "❤️" : "💬"}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-200">
                                    <span className="font-bold text-white">
                                        @{n.actor?.username}
                                    </span>
                                    {" "}
                                    {n.type === "like"
                                        ? "le ha gustado tu partido."
                                        : "ha comentado en tu partido."}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {TimeAgo(n.created_at)}
                                </p>
                            </div>
                            {!n.is_read && (
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
