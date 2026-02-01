"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import { Calendar, MapPin, Clock, Users, CheckCircle2, AlertCircle, ChevronLeft, Check } from "lucide-react";

interface ReservationPlayer {
    name: string;
    paid: boolean;
    amount: number;
    confirmed?: boolean;
    id?: string;
}

interface Reservation {
    id: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'cancelled';
    price: number;
    players: ReservationPlayer[] | null;
    clubs: {
        name: string;
        location: string | null;
    };
    courts: {
        name: string;
    };
}

export default function ReservationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const loadReservationData = async () => {
        const { data, error } = await supabase
            .from('reservations')
            .select(`
                id, 
                start_time, 
                end_time, 
                status,
                price,
                players,
                clubs (name, location),
                courts (name)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error loading reservation:", error);
        } else {
            setReservation(data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);
            await loadReservationData();
        }

        if (id) {
            init();

            // Suscripción Realtime para esta reserva específica
            const channel = supabase
                .channel(`reservation-detail-${id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'reservations',
                        filter: `id=eq.${id}`
                    },
                    (payload) => {
                        console.log('Realtime update in player detail:', payload);
                        loadReservationData();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [id, supabase]);

    const handleConfirmAttendance = async () => {
        console.log("handleConfirmAttendance: Starting...", { userId, reservationId: reservation?.id });
        if (!reservation || !userId || !reservation.players) {
            console.log("handleConfirmAttendance: Early return", { reservation, userId });
            return;
        }
        setProcessing(true);

        const newPlayers = reservation.players.map(p => {
            if (p.id === userId) {
                return { ...p, confirmed: true };
            }
            return p;
        });

        console.log("handleConfirmAttendance: New players array", newPlayers);

        try {
            console.log("handleConfirmAttendance: Sending update to Supabase...");
            const { error } = await supabase
                .from('reservations')
                .update({ players: newPlayers })
                .eq('id', reservation.id);

            if (error) {
                console.error("handleConfirmAttendance: Supabase error", error);
                alert("Error al confirmar asistencia: " + error.message);
            } else {
                console.log("handleConfirmAttendance: Success!");
                setReservation({ ...reservation, players: newPlayers });
            }
        } catch (err) {
            console.error("handleConfirmAttendance: Unexpected error", err);
            alert("Error inesperado: " + (err as Error).message);
        } finally {
            setProcessing(false);
            console.log("handleConfirmAttendance: Finished processing.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h1 className="text-white font-bold text-xl">Reserva no encontrada</h1>
                <button onClick={() => router.back()} className="mt-4 text-green-500 font-bold">Volver atrás</button>
            </div>
        );
    }

    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);
    const isConfirmedByUser = reservation.players?.find(p => p.id === userId)?.confirmed;
    const isPlayerInList = reservation.players?.some(p => p.id === userId);

    return (
        <div className="min-h-screen bg-gray-900 pb-24">
            <AppHeader />

            <div className="max-w-md mx-auto px-4 py-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-400 mb-6 hover:text-white transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span className="font-bold text-sm uppercase tracking-widest">Mis Reservas</span>
                </button>

                <div className="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700 shadow-2xl">
                    {/* Header Image/Background */}
                    <div className="h-32 bg-gradient-to-br from-green-600 to-blue-700 relative">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute bottom-4 left-6">
                            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none">
                                {reservation.clubs.name}
                            </h1>
                            <p className="text-green-300 font-bold text-sm mt-1">{reservation.courts.name}</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Fecha</p>
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <Calendar size={14} className="text-green-500" />
                                    <span className="capitalize">{start.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Horario</p>
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <Clock size={14} className="text-green-500" />
                                    <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        {reservation.clubs.location && (
                            <div className="flex items-start gap-3 text-gray-400">
                                <MapPin size={18} className="shrink-0 text-gray-600" />
                                <span className="text-sm font-medium">{reservation.clubs.location}</span>
                            </div>
                        )}

                        {/* Players Section */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                    <Users size={16} className="text-green-500" />
                                    Jugadores
                                </h2>
                                <span className="text-[10px] font-black text-gray-500 uppercase">
                                    {reservation.players?.filter(p => p.name.trim() !== "").length || 0} / 4
                                </span>
                            </div>

                            <div className="space-y-2">
                                {reservation.players?.filter(p => p.name.trim() !== "").map((player, idx) => (
                                    <div key={idx} className="bg-gray-900/40 rounded-2xl p-4 border border-gray-700/30 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-black text-gray-500 border border-gray-700">
                                                {player.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-gray-200">{player.name}</span>
                                        </div>
                                        {player.confirmed ? (
                                            <div className="flex items-center gap-1.5 text-green-500">
                                                <CheckCircle2 size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Confirmado</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <AlertCircle size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Pendiente</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Action Section */}
                        {isPlayerInList && !isConfirmedByUser && (
                            <div className="pt-4">
                                <button
                                    onClick={handleConfirmAttendance}
                                    disabled={processing}
                                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-900/20 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-xs italic"
                                >
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={18} strokeWidth={4} />
                                            Confirmar mi asistencia
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-500 text-center mt-4 font-medium italic">
                                    Al confirmar, el club sabrá que ya estás listo para jugar.
                                </p>
                            </div>
                        )}

                        {isConfirmedByUser && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 text-green-400">
                                <CheckCircle2 size={24} />
                                <div>
                                    <p className="font-bold text-sm">¡Asistencia Confirmada!</p>
                                    <p className="text-[10px] uppercase font-black tracking-widest opacity-70">Tu plaza está validada</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
