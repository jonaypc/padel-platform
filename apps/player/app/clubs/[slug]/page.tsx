"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

interface Club {
    id: string;
    name: string;
    slug: string;
    location: string | null;
    logo_url: string | null;
    booking_duration: number;
    opening_hour: number;
    closing_hour: number;
}

interface Court {
    id: string;
    name: string;
    type: string;
    surface: string;
}

interface Reservation {
    start_time: string;
    end_time: string;
    court_id: string;
}

export default function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const router = useRouter();
    const [slug, setSlug] = useState<string>("");

    // Unwrap params using useEffect or use() hook if available. For now standard async resolution.
    useEffect(() => {
        params.then(p => setSlug(p.slug));
    }, [params]);

    const [club, setClub] = useState<Club | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ court: Court, time: Date } | null>(null);
    const [selectingCourt, setSelectingCourt] = useState<{ time: Date, courts: Court[] } | null>(null);

    // Cargar datos del club
    useEffect(() => {
        if (!slug) return;
        let isMounted = true;

        async function loadClubData() {
            try {
                // 1. Club info
                const { data: clubData, error: clubError } = await supabase
                    .from('clubs')
                    .select('id, name, slug, location, logo_url, booking_duration, opening_hour, closing_hour')
                    .eq('slug', slug)
                    .single();

                if (!isMounted) return;

                if (clubError) {
                    if (clubError.message?.includes('AbortError')) return;
                    console.error('Error loading club:', clubError);
                    setLoading(false);
                    return;
                }

                if (!clubData) {
                    setLoading(false);
                    return;
                }
                setClub(clubData);

                // 2. Pistas
                const { data: courtsData } = await supabase
                    .from('courts')
                    .select('id, name, type, surface')
                    .eq('club_id', clubData.id)
                    .eq('is_active', true)
                    .order('name');

                if (isMounted) {
                    setCourts(courtsData || []);
                    setLoading(false);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Error loading club data:', err);
                setLoading(false);
            }
        }

        loadClubData();

        return () => {
            isMounted = false;
        };
    }, [slug]);

    // Cargar disponibilidad al cambiar fecha
    useEffect(() => {
        if (!club) return;
        let isMounted = true;

        const clubId = club.id;

        async function loadAvailability() {
            try {
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                const { data, error } = await supabase
                    .from('reservations')
                    .select('start_time, end_time, court_id')
                    .eq('club_id', clubId)
                    .gte('start_time', startOfDay.toISOString())
                    .lte('end_time', endOfDay.toISOString())
                    .neq('status', 'cancelled');

                if (!isMounted) return;
                if (error && error.message?.includes('AbortError')) return;

                setReservations(data || []);
            } catch (err) {
                if (!isMounted) return;
                console.error('Error loading availability:', err);
            }
        }

        loadAvailability();

        return () => {
            isMounted = false;
        };
    }, [selectedDate, club]);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectedSlot(null);
    };

    const handleBooking = async () => {
        if (!selectedSlot || !club) return;
        setBooking(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const endTime = new Date(selectedSlot.time);
        endTime.setMinutes(selectedSlot.time.getMinutes() + club.booking_duration);

        const { error } = await supabase
            .from('reservations')
            .insert({
                club_id: club.id,
                court_id: selectedSlot.court.id,
                user_id: user.id,
                start_time: selectedSlot.time.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                type: 'booking'
            });

        if (error) {
            alert('Error al reservar: ' + error.message);
        } else {
            alert('¡Reserva confirmada!');
            setSelectedSlot(null);
            // Recargar reservas
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const { data } = await supabase
                .from('reservations')
                .select('start_time, end_time, court_id')
                .eq('club_id', club.id)
                .gte('start_time', startOfDay.toISOString())
                .neq('status', 'cancelled');
            setReservations(data || []);
        }
        setBooking(false);
    };

    // Generar slots usando horario del club
    const timeSlots: Date[] = [];
    if (club) {
        const startHour = club.opening_hour ?? 9;
        const endHour = club.closing_hour ?? 22;
        const current = new Date(selectedDate);
        current.setHours(startHour, 0, 0, 0);

        const endDateTime = new Date(selectedDate);
        endDateTime.setHours(endHour, 0, 0, 0);

        // Protección contra bucles infinitos: duración mínima 30 mins
        const duration = Math.max(club.booking_duration || 60, 30);

        while (current < endDateTime) {
            timeSlots.push(new Date(current));
            current.setMinutes(current.getMinutes() + duration);
        }
    }

    // Comprobar disponibilidad de un slot
    const checkAvailability = (time: Date) => {
        if (!club) return [];

        const availableCourts = courts.filter(court => {
            // Buscar si hay reserva que solape
            const hasCollision = reservations.some(res => {
                if (res.court_id !== court.id) return false;
                const resStart = new Date(res.start_time).getTime();
                // Simplificación: coincidencia exacta de inicio
                // Idealmente checkear rangos
                return Math.abs(resStart - time.getTime()) < 60000; // 1 min tolerancia
            });
            return !hasCollision;
        });

        return availableCourts;
    };

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-green-500">Cargando...</div>;
    if (!club) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Club no encontrado</div>;

    return (
        <div className="min-h-screen bg-gray-900 pb-24">
            <AppHeader />

            {/* Hero Club */}
            <div className="bg-gray-800 pb-6 pt-4 px-4 rounded-b-3xl shadow-lg border-b border-gray-700">
                <div className="max-w-md mx-auto">
                    <button onClick={() => router.back()} className="text-gray-400 mb-4 flex items-center gap-1 text-sm">
                        <ChevronLeft size={16} /> Volver
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-3xl overflow-hidden border-2 border-green-500/30">
                            {club.logo_url ? <Image src={club.logo_url} alt={club.name} width={64} height={64} className="w-full h-full object-cover" /> : <span>🏟️</span>}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                            {club.location && (
                                <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                                    <MapPin size={14} /> {club.location}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 mt-6">
                {/* Selector Fecha */}
                <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-700 rounded-lg">
                        <ChevronLeft className="text-gray-400" />
                    </button>
                    <div className="text-center">
                        <h2 className="text-white font-semibold capitalize">
                            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h2>
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                            <Clock size={10} /> Duración: {club.booking_duration} min
                        </p>
                    </div>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-700 rounded-lg">
                        <ChevronRight className="text-gray-400" />
                    </button>
                </div>

                {/* Lista de Horarios */}
                <div className="space-y-3">
                    <h3 className="text-white font-semibold mb-4">Horarios Disponibles</h3>

                    <div className="grid grid-cols-1 gap-3">
                        {timeSlots.map((slot, i) => {
                            const freeCourts = checkAvailability(slot);
                            const isFull = freeCourts.length === 0;
                            const timeStr = slot.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                            // Comprobar si ya pasó la hora (usamos selectedDate como referencia del día actual)
                            const today = new Date();
                            const isToday = selectedDate.toDateString() === today.toDateString();
                            const isPast = isToday && slot.getTime() < today.getTime();

                            if (isPast) return null; // No mostrar horarios pasados

                            return (
                                <div key={i} className={`bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-between items-center ${isFull ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-900 px-3 py-2 rounded-lg text-white font-mono font-bold border border-gray-700">
                                            {timeStr}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                                                {isFull ? 'Completo' : 'Disponible'}
                                            </p>
                                            {!isFull && (
                                                <p className="text-xs text-gray-500">
                                                    {freeCourts.length} pista{freeCourts.length > 1 ? 's' : ''} libre{freeCourts.length > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {!isFull && (
                                        <button
                                            onClick={() => {
                                                if (freeCourts.length === 1) {
                                                    setSelectedSlot({ court: freeCourts[0], time: slot });
                                                } else {
                                                    setSelectingCourt({ time: slot, courts: freeCourts });
                                                }
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                        >
                                            Reservar
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {timeSlots.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No hay horarios disponibles.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Selección de Pista */}
            {selectingCourt && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectingCourt(null)}>
                    <div className="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Selecciona Pista</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                {selectingCourt.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {selectingCourt.courts.length} pistas disponibles
                            </p>

                            <div className="space-y-2">
                                {selectingCourt.courts.map(court => (
                                    <button
                                        key={court.id}
                                        onClick={() => {
                                            setSelectedSlot({ court, time: selectingCourt.time });
                                            setSelectingCourt(null);
                                        }}
                                        className="w-full bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-green-500 rounded-xl p-4 text-left transition group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-semibold group-hover:text-green-400">{court.name}</p>
                                                <p className="text-xs text-gray-500">{court.surface} • {court.type}</p>
                                            </div>
                                            <ChevronRight className="text-gray-600 group-hover:text-green-500" size={20} />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setSelectingCourt(null)}
                                className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmación */}
            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Confirmar Reserva</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Estás a punto de reservar una pista.
                            </p>

                            <div className="bg-gray-900/50 rounded-xl p-4 mb-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Club</span>
                                    <span className="text-white font-medium">{club.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Fecha</span>
                                    <span className="text-white font-medium capitalize">
                                        {selectedSlot.time.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Hora</span>
                                    <span className="text-white font-medium">
                                        {selectedSlot.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Pista</span>
                                    <span className="text-white font-medium">{selectedSlot.court.name}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-gray-700 pt-3 mt-2">
                                    <span className="text-gray-400">Total</span>
                                    <span className="text-green-400 font-bold">Gratis</span> {/* Precio pendiente */}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedSlot(null)}
                                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={booking}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {booking ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <span>Confirmar</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
