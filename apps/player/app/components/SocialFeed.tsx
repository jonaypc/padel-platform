"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Calendar, Trophy, Heart, MessageCircle, Share2, MapPin } from "lucide-react";
import Image from "next/image";

interface FeedItem {
    id: string;
    user_id: string;
    type: string;
    club_id: string | null;
    content: any;
    created_at: string;
    profiles: {
        display_name: string;
        avatar_url: string;
        username: string;
    };
    clubs?: {
        name: string;
    };
}

export default function SocialFeed() {
    const [activities, setActivities] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadFeed() {
            const { data, error } = await supabase
                .from('activity_feed')
                .select(`
                    *,
                    profiles:user_id (display_name, avatar_url, username),
                    clubs:club_id (name)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) setActivities(data as any);
            setLoading(false);
        }

        loadFeed();

        // Suscribirse a tiempo real para nuevas actividades
        const channel = supabase
            .channel('social_feed')
            .on('postgres_changes' as any, { event: 'INSERT', table: 'activity_feed' }, () => {
                loadFeed();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-800/50 rounded-3xl border border-gray-700/50" />
        ))}
    </div>;

    const renderActivity = (item: FeedItem) => {
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        switch (item.type) {
            case 'reservation':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white uppercase italic">Reserva Confirmada</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                                    {item.clubs?.name || 'Club'} • {item.content.court_name}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed italic">
                            "<span className="text-white font-bold">{item.profiles.display_name}</span> ha reservado pista para entrenar."
                        </p>
                    </div>
                );
            case 'club_join':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center text-green-500">
                                <Heart size={20} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white uppercase italic">Nuevo Miembro</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                                    {item.content.club_name}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed italic">
                            "<span className="text-white font-bold">{item.profiles.display_name}</span> se ha unido a la comunidad."
                        </p>
                    </div>
                );
            case 'club_follow':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-600/20 flex items-center justify-center text-pink-500">
                                <Heart size={20} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white uppercase italic">Siguiendo Club</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                                    {item.content.club_name}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed italic">
                            "<span className="text-white font-bold">{item.profiles.display_name}</span> ahora sigue a este club."
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {activities.map((item) => (
                <div key={item.id} className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-5 shadow-inner hover:bg-gray-850 transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-gray-700 to-gray-900 overflow-hidden border border-gray-600 shadow-xl group-hover:scale-105 transition-transform">
                                    {item.profiles.avatar_url ? (
                                        <Image src={item.profiles.avatar_url} alt={item.profiles.display_name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                                            {item.profiles.display_name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-gray-900 rounded-full" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white uppercase italic tracking-tight">{item.profiles.display_name}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">@{item.profiles.username || 'jugador'}</p>
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-gray-600 bg-black/20 px-2 py-1 rounded-lg uppercase tracking-widest">
                            Hace {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-4">
                        {renderActivity(item)}
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                        <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors group/btn">
                            <Heart size={16} className="group-hover/btn:fill-current" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Mola</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors group/btn">
                            <MessageCircle size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Opinar</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors group/btn ml-auto">
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>
            ))}

            {activities.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto text-gray-600 border border-gray-700">
                        <Users size={40} />
                    </div>
                    <p className="text-sm font-bold text-gray-500 italic uppercase italic tracking-widest">No hay actividad todavía.<br />¡Únete a un club para empezar!</p>
                </div>
            )}
        </div>
    );
}
