"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import Link from "next/link";
import { Calendar, MapPin, Clock } from "lucide-react";

interface Reservation {
    id: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'cancelled';
    clubs: {
        name: string;
        location: string | null;
    };
    courts: {
        name: string;
    };
}

export default function MyReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadReservations() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false); // Ensure loading is set to false even if no user
                return;
            }

            const selectFields = `
            id, 
            start_time, 
            end_time, 
            status,
            clubs (name, location),
            courts (name)
            `;

            // 1. Reservas donde soy el dueño
            const ownedPromise = supabase
                .from('reservations')
                .select(selectFields)
                .eq('user_id', user.id)
                .in('type', ['booking', 'match'])
                .order('start_time', { ascending: true });

            // 2. Reservas donde soy jugador invitado
            const participatingPromise = supabase
                .from('reservations')
                .select(selectFields)
                .contains('players', [{ id: user.id }])
                .in('type', ['booking', 'match'])
                .order('start_time', { ascending: true });

            const [ownedRes, participatingRes] = await Promise.all([ownedPromise, participatingPromise]);

            const owned = ownedRes.data || [];
            const participating = participatingRes.data || [];

            // Combinar y eliminar duplicados por ID
            const allReservationsMap = new Map();
            [...owned, ...participating].forEach((r: any) => {
                allReservationsMap.set(r.id, r);
            });

            const allReservations = Array.from(allReservationsMap.values());

            // Ordenar por fecha
            allReservations.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            setReservations(allReservations);
            setLoading(false);
        }

        loadReservations();
    }, []);

    // Usar referencia de tiempo fijada al cargar las reservas para evitar funciones impuras
    const [filterTimestamp] = useState(() => Date.now());
    const futureReservations = reservations.filter(r => new Date(r.end_time).getTime() > filterTimestamp && r.status === 'confirmed');
    const pastReservations = reservations.filter(r => new Date(r.end_time).getTime() <= filterTimestamp && r.status === 'confirmed');

    return (
        <div className="min-h-screen bg-gray-900 pb-24">
            <AppHeader />

            <div className="max-w-md mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold text-white mb-6">Mis Reservas</h1>



                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                ) : (
                    <div className="space-y-8">

                        {/* Próximas */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Próximas Partidas</h2>
                            {futureReservations.length > 0 ? (
                                <div className="space-y-4">
                                    {futureReservations.map(res => (
                                        <ReservationCard key={res.id} reservation={res} />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 text-center">
                                    <p className="text-gray-400 mb-4">No tienes reservas activas.</p>
                                    <Link href="/clubs" className="inline-block bg-green-600 px-4 py-2 rounded-lg text-white font-semibold text-sm">
                                        Reservar Pista
                                    </Link>
                                </div>
                            )}
                        </section>

                        {/* Pasadas */}
                        {pastReservations.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Historial</h2>
                                <div className="space-y-4 opacity-75">
                                    {pastReservations.map(res => (
                                        <ReservationCard key={res.id} reservation={res} isPast />
                                    ))}
                                </div>
                            </section>
                        )}

                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

function ReservationCard({ reservation, isPast }: { reservation: Reservation, isPast?: boolean }) {
    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);

    // Formato fecha: Lunes, 23 Enero
    const dateStr = start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    // Formato hora: 18:30 - 20:00
    const timeStr = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

    return (
        <div className={`bg-gray-800 border ${isPast ? 'border-gray-700' : 'border-gray-600'} rounded-xl p-4 shadow-lg overflow-hidden relative`}>
            {!isPast && <div className="absolute top-0 right-0 bg-green-500 w-16 h-16 blur-2xl opacity-10 rounded-full"></div>}

            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-white font-bold text-lg capitalize">{reservation.clubs.name}</h3>
                    <p className="text-green-400 font-medium text-sm">{reservation.courts.name}</p>
                </div>
                <div className="bg-gray-700/50 p-2 rounded-lg text-center min-w-[60px]">
                    <span className="block text-xl font-bold text-white leading-none">{start.getDate()}</span>
                    <span className="block text-xs text-gray-400 uppercase">{start.toLocaleDateString('es-ES', { month: 'short' })}</span>
                </div>
            </div>

            <div className="space-y-2 mt-2 pt-3 border-t border-gray-700/50">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <Calendar size={14} className="text-gray-500" />
                    <span className="capitalize">{dateStr}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <Clock size={14} className="text-gray-500" />
                    <span>{timeStr}</span>
                </div>
                {reservation.clubs.location && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <MapPin size={12} />
                        <span>{reservation.clubs.location}</span>
                    </div>
                )}

            </div>
        </div>
    );
}
