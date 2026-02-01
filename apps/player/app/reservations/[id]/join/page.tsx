"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppHeader from "../../../components/AppHeader";
import BottomNav from "../../../components/BottomNav";
import { Calendar, Clock, Users, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";

interface Reservation {
    id: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'cancelled';
    players: any[] | null;
    clubs: {
        id: string;
        name: string;
    };
    courts: {
        name: string;
    };
}

export default function JoinReservationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);

            const { data, error: fetchErr } = await supabase
                .from('reservations')
                .select(`
                    id, start_time, end_time, status, players,
                    clubs (id, name),
                    courts (name)
                `)
                .eq('id', id)
                .single();

            if (fetchErr || !data) {
                setError("No se pudo encontrar la reserva.");
            } else {
                setReservation(data as any);
            }
            setLoading(false);
        };
        init();
    }, [id]);

    const handleJoin = async () => {
        if (!userId) {
            router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        setJoining(true);
        setError(null);

        try {
            const { data, error: rpcErr } = await supabase.rpc('join_reservation', {
                res_id: id
            });

            if (rpcErr) {
                setError(rpcErr.message);
            } else {
                router.push(`/reservations/${id}`);
            }
        } catch (err: any) {
            setError(err.message || "Error al unirse");
        } finally {
            setJoining(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
    );

    if (error && !reservation) return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="text-red-500 mb-4" size={48} />
            <h1 className="text-white font-bold text-xl mb-2">¡Vaya!</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button onClick={() => router.push('/dashboard')} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold">
                Volver al inicio
            </button>
        </div>
    );

    const start = new Date(reservation!.start_time);
    const isAlreadyIn = reservation!.players?.some(p => p.id === userId);
    const isFull = (reservation!.players?.length || 0) >= 4;

    return (
        <div className="min-h-screen bg-gray-900 pb-24">
            <AppHeader />

            <div className="max-w-md mx-auto px-4 py-8">
                <div className="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700 shadow-2xl">
                    <div className="p-8 text-center bg-linear-to-br from-green-600/20 to-blue-600/20">
                        <div className="w-20 h-20 bg-green-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-green-900/40 rotate-3">
                            <span className="text-4xl">🎾</span>
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                            ¡Te han invitado!
                        </h1>
                        <p className="text-gray-400 text-sm font-medium">
                            Únete al partido en <span className="text-green-400">{reservation!.clubs.name}</span>
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4 bg-gray-900/50 rounded-2xl p-5 border border-gray-700/50">
                            <div className="flex items-center gap-4 text-gray-200">
                                <Calendar className="text-green-500" size={20} />
                                <span className="font-bold capitalize">{start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-200">
                                <Clock className="text-green-500" size={20} />
                                <span className="font-bold">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-200">
                                <Users className="text-green-500" size={20} />
                                <span className="font-bold">{reservation!.players?.length || 0} / 4 Jugadores</span>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle size={18} />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        {isAlreadyIn ? (
                            <div className="space-y-3">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 text-green-400">
                                    <CheckCircle2 size={20} />
                                    <p className="font-bold text-sm">Ya estás en este partido</p>
                                </div>
                                <button
                                    onClick={() => router.push(`/reservations/${id}`)}
                                    className="w-full bg-gray-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs italic"
                                >
                                    Ir al detalle →
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleJoin}
                                disabled={joining || isFull}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-green-900/20 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-sm italic"
                            >
                                {joining ? "Uniéndote..." : isFull ? "Partido Completo" : "Unirme al Partido"}
                            </button>
                        )}

                        <p className="text-[10px] text-gray-500 text-center font-medium italic px-4">
                            Al unirte, aparecerás en la lista de jugadores y el creador será notificado.
                        </p>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
