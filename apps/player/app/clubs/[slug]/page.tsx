"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Calendar, Info } from "lucide-react";

interface Club {
    id: string;
    name: string;
    slug: string;
    location: string | null;
    logo_url: string | null;
    booking_duration: number;
    opening_hour: number;
    closing_hour: number;
    shifts?: { start: string; end: string }[] | Record<string, { start: string; end: string }[]> | null;
    default_price: number;
}

interface Court {
    id: string;
    name: string;
    type: string;
    price?: number;
}

interface Reservation {
    start_time: string;
    end_time: string;
    court_id: string;
    id?: string;
    status?: string;
}

interface Player {
    id: string;
    display_name: string;
    avatar_url: string;
    username: string;
}

export default function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const router = useRouter();
    const [slug, setSlug] = useState<string>("");

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

    // Social & Tabs
    const [activeTab, setActiveTab] = useState<'availability' | 'players' | 'info'>('availability');
    const [isFollower, setIsFollower] = useState(false);
    const [checkingFollower, setCheckingFollower] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    // Cargar datos del club
    useEffect(() => {
        if (!slug) return;
        let isMounted = true;

        async function loadClubData() {
            try {
                const { data: clubData, error: clubError } = await supabase
                    .from('clubs')
                    .select('id, name, slug, location, logo_url, booking_duration, default_price, opening_hour, closing_hour, shifts')
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

                const { data: courtsData } = await supabase
                    .from('courts')
                    .select('id, name, type, price')
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

    // Comprobar si el usuario sigue al club
    useEffect(() => {
        if (!club?.id) return;

        async function checkFollowStatus() {
            setCheckingFollower(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setCheckingFollower(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('club_followers')
                    .select('id')
                    .eq('club_id', club?.id)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error al comprobar seguimiento:', error.message);
                } else {
                    setIsFollower(!!data);
                }
            } catch (err) {
                console.error('Error inesperado en checkFollowStatus:', err);
            } finally {
                setCheckingFollower(false);
            }
        }

        checkFollowStatus();
    }, [club]);

    // Cargar jugadores (comunidad)
    useEffect(() => {
        if (!club?.id || activeTab !== 'players') return;

        async function loadPlayers() {
            setLoadingPlayers(true);
            try {
                const { data } = await supabase.rpc('get_club_community', {
                    p_club_id: club!.id,
                    p_search: ''
                });

                if (data) {
                    setPlayers(data as Player[]);
                }
            } catch (err) {
                console.error('Error loading players:', err);
            } finally {
                setLoadingPlayers(false);
            }
        }

        loadPlayers();
    }, [club, activeTab]);

    const handleToggleFollow = async () => {
        if (!club) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        setCheckingFollower(true);
        try {
            if (isFollower) {
                const { error } = await supabase
                    .from('club_followers')
                    .delete()
                    .eq('club_id', club.id)
                    .eq('user_id', user.id);

                if (error) throw error;
                setIsFollower(false);
            } else {
                const { error } = await supabase
                    .from('club_followers')
                    .insert({ club_id: club.id, user_id: user.id });

                if (error) throw error;
                setIsFollower(true);
            }
        } catch (error) {
            console.error('Error al cambiar estado de seguimiento:', error);
            alert('No se pudo actualizar el seguimiento. Verifica tu conexión.');
        } finally {
            setCheckingFollower(false);
        }
    };

    // Cargar disponibilidad
    useEffect(() => {
        if (!club?.id) return;
        let isMounted = true;

        async function loadAvailability() {
            try {
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                if (!club) return;
                const { data, error: availabilityError } = await supabase
                    .from('reservations')
                    .select('id, start_time, end_time, court_id, status')
                    .eq('club_id', club.id)
                    .gte('start_time', startOfDay.toISOString())
                    .lte('end_time', endOfDay.toISOString())
                    .neq('status', 'cancelled');

                if (!isMounted) return;
                if (availabilityError && availabilityError.message?.includes('AbortError')) return;

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

        // SYNC: Incluimos al creador en la lista de jugadores para que aparezca en su feed y comunidad
        const initialPlayers = [{
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Jugador',
            confirmed: true,
            paid: false,
            amount: 0
        }];

        const { error } = await supabase
            .from('reservations')
            .insert({
                club_id: club.id,
                court_id: selectedSlot.court.id,
                user_id: user.id,
                start_time: selectedSlot.time.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                type: 'booking',
                players: initialPlayers
            });

        if (error) {
            alert('Error al reservar: ' + error.message);
        } else {
            alert('¡Reserva confirmada!');
            setSelectedSlot(null);

            // Recargar disponibilidad
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const { data } = await supabase
                .from('reservations')
                .select('id, start_time, end_time, court_id, status')
                .eq('club_id', club.id)
                .gte('start_time', startOfDay.toISOString())
                .neq('status', 'cancelled');
            setReservations(data || []);
        }
        setBooking(false);
    };

    // --- LÓGICA DE GENERACIÓN DE SLOTS (SMART SLOTS) ---
    const generateTimeSlots = useCallback(() => {
        if (!club) return [];

        // SYNC: Default to 90 minutes to match Club App
        const duration = Math.max(club.booking_duration || 90, 30);

        // 1. Obtener turnos diarios (Shifts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shiftsData = club.shifts as any;
        let dailyShifts: Array<{ start: string; end: string }> = [];

        const dayKey = selectedDate.getDay() === 0 ? "7" : selectedDate.getDay().toString();

        if (shiftsData && Array.isArray(shiftsData[dayKey])) {
            dailyShifts = shiftsData[dayKey];
        }

        // Fallback
        if (dailyShifts.length === 0) {
            const startHour = club.opening_hour ?? 8;
            const endHour = club.closing_hour ?? 22;
            dailyShifts = [{
                start: `${startHour.toString().padStart(2, '0')}:00`,
                end: `${endHour.toString().padStart(2, '0')}:00`
            }];
        }

        // 2. Generar slots base (Opening Hour Steps)
        const baseSlots: Date[] = [];
        dailyShifts.forEach(shift => {
            const [sH, sM] = shift.start.split(':').map(Number);
            const [eH, eM] = shift.end.split(':').map(Number);

            if (isNaN(sH) || isNaN(eH)) return;

            const current = new Date(selectedDate);
            current.setHours(sH, sM || 0, 0, 0);

            const endDateTime = new Date(selectedDate);
            endDateTime.setHours(eH, eM || 0, 0, 0);

            while (current.getTime() < endDateTime.getTime()) {
                const slotEnd = new Date(current);
                slotEnd.setMinutes(current.getMinutes() + duration);

                if (slotEnd.getTime() <= endDateTime.getTime()) {
                    baseSlots.push(new Date(current));
                }
                current.setMinutes(current.getMinutes() + duration);
            }
        });

        // 3. Añadir slots basados en RESERVAS EXISTENTES (Inicio y Fin)
        // SYNC: Club App usa start_time y end_time como anchors
        const reservationSlots = reservations
            .filter(r => r.status && r.status !== 'cancelled')
            .flatMap(r => {
                const start = new Date(r.start_time);
                start.setSeconds(0, 0);
                const end = new Date(r.end_time);
                end.setSeconds(0, 0);
                return [start, end];
            });

        // 4. Combinar, Deduplicar y Ordenar
        const allPotentialSlots = [...baseSlots, ...reservationSlots];
        const uniqueTimestamps = Array.from(new Set(allPotentialSlots.map(d => d.getTime())));
        uniqueTimestamps.sort((a, b) => a - b);

        // 5. Filtrar solo los que caen dentro de un turno válido
        const validSlots: Date[] = [];
        uniqueTimestamps.forEach(ts => {
            const dateObj = new Date(ts);

            const isInShift = dailyShifts.some(shift => {
                const [sH, sM] = shift.start.split(':').map(Number);
                const [eH, eM] = shift.end.split(':').map(Number);

                const shiftStart = new Date(selectedDate);
                shiftStart.setHours(sH, sM || 0, 0, 0);

                const shiftEnd = new Date(selectedDate);
                shiftEnd.setHours(eH, eM || 0, 0, 0);

                // El slot debe terminar dentro del turno
                const slotEnd = new Date(dateObj);
                slotEnd.setMinutes(dateObj.getMinutes() + duration);

                return dateObj >= shiftStart && slotEnd <= shiftEnd;
            });

            if (isInShift) {
                validSlots.push(dateObj);
            }
        });

        return validSlots;
    }, [club, selectedDate, reservations]);

    const timeSlots = generateTimeSlots();

    // Comprobar disponibilidad de un slot (Range overlap check)
    const checkAvailability = (time: Date) => {
        if (!club) return [];

        const proposedStart = time.getTime();
        const proposedEnd = new Date(time).getTime() + (club.booking_duration * 60000);

        const availableCourts = courts.filter(court => {
            const hasCollision = reservations.some(res => {
                if (res.court_id !== court.id) return false;

                const existingStart = new Date(res.start_time).getTime();
                const existingEnd = new Date(res.end_time).getTime();

                // Colisión si se solapan los intervalos
                return proposedStart < existingEnd && proposedEnd > existingStart;
            });
            return !hasCollision;
        });

        return availableCourts;
    };

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-green-500">Cargando...</div>;
    if (!club) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Club no encontrado</div>;

    const isDateTodayOrPast = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const current = new Date(selectedDate);
        current.setHours(0, 0, 0, 0);
        return current <= today;
    };

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
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                            {club.location && (
                                <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                                    <MapPin size={14} /> {club.location}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleToggleFollow}
                            disabled={checkingFollower}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isFollower
                                ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                : 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                                }`}
                        >
                            {checkingFollower ? '...' : isFollower ? 'Siguiendo' : 'Seguir Club'}
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setActiveTab('availability')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'availability' ? 'bg-green-600 text-white' : 'bg-gray-700/50 text-gray-400'
                                }`}
                        >
                            <Calendar size={16} /> Disponibilidad
                        </button>
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'players' ? 'bg-green-600 text-white' : 'bg-gray-700/50 text-gray-400'
                                }`}
                        >
                            <Users size={16} /> Jugadores
                        </button>
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-green-600 text-white' : 'bg-gray-700/50 text-gray-400'
                                }`}
                        >
                            <Info size={16} /> Información
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 mt-6">
                {activeTab === 'availability' && (
                    <>
                        {/* Selector Fecha */}
                        <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
                            <button
                                onClick={() => changeDate(-1)}
                                disabled={isDateTodayOrPast()}
                                className={`p-2 rounded-lg ${isDateTodayOrPast() ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-gray-700 text-gray-400'}`}
                            >
                                <ChevronLeft size={20} />
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

                                    const today = new Date();
                                    const isToday = selectedDate.toDateString() === today.toDateString();
                                    const isPast = isToday && slot.getTime() < today.getTime();

                                    if (isPast) return null;

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
                    </>
                )}

                {activeTab === 'players' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold text-lg">Comunidad del Club</h3>
                            <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-lg text-xs font-bold">
                                {players.length} Jugadores
                            </span>
                        </div>

                        {loadingPlayers ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Buscando equipo...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {players.map((player) => (
                                    <div key={player.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col items-center gap-3 group hover:border-green-500/50 transition-all">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-700 overflow-hidden border border-gray-600 group-hover:scale-105 transition-transform">
                                                {player.avatar_url ? (
                                                    <Image src={player.avatar_url} alt={player.display_name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                                                        {player.display_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-800 rounded-full" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-white uppercase italic tracking-tight leading-none">
                                                {player.display_name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                @{player.username || 'jugador'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/players/${player.username || player.id}`)}
                                            className="w-full bg-gray-900 hover:bg-gray-750 text-[10px] text-gray-400 hover:text-white font-black uppercase py-2 rounded-xl border border-gray-700 transition-all"
                                        >
                                            Ver Perfil
                                        </button>
                                    </div>
                                ))}

                                {players.length === 0 && (
                                    <div className="col-span-2 py-12 text-center bg-gray-800/50 rounded-3xl border border-gray-700/50">
                                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                                            <Users size={32} />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 uppercase italic tracking-widest">
                                            Sé el primero en unirte
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-green-500" /> Horarios de Apertura
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { d: 'Lunes', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                    { d: 'Martes', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                    { d: 'Miércoles', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                    { d: 'Jueves', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                    { d: 'Viernes', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                    { d: 'Sábado', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                    { d: 'Domingo', h: `${club.opening_hour}:00 - ${club.closing_hour}:00` },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-0">
                                        <span className="text-gray-400 text-sm">{row.d}</span>
                                        <span className="text-white text-sm font-medium">{row.h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectingCourt && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectingCourt(null)}>
                    <div className="h-full overflow-y-auto py-4 px-4">
                        <div className="min-h-full flex items-end sm:items-center justify-center">
                            <div className="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl animate-in slide-in-from-bottom duration-300 my-auto" onClick={e => e.stopPropagation()}>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-white mb-2">Selecciona Pista</h3>
                                    <p className="text-gray-400 text-sm mb-4">
                                        {selectingCourt.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {selectingCourt.courts.length} pistas disponibles
                                    </p>

                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
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
                                                        <p className="text-xs text-gray-500">{court.type}</p>
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
                    </div>
                </div>
            )}

            {selectedSlot && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="h-full overflow-y-auto py-4 px-4">
                        <div className="min-h-full flex items-end sm:items-center justify-center">
                            <div className="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl animate-in slide-in-from-bottom duration-300 my-auto">
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
                                            <span className="text-green-400 font-bold">
                                                {(selectedSlot.court.price || club.default_price) ? `${selectedSlot.court.price || club.default_price}€` : 'Gratis'}
                                            </span>
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
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
