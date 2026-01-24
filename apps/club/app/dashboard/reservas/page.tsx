"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import { ChevronLeft, ChevronRight, Plus, Search, User, X } from "lucide-react";

interface Court {
    id: string;
    name: string;
}

interface Reservation {
    id: string;
    court_id: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'cancelled';
    type: 'booking' | 'maintenance' | 'class';
    user_id: string | null;
    notes?: string;
    // Mock user for UI if needed, though we fetch it separately or rely on join later
}

export default function ReservationsPage() {
    const [date, setDate] = useState(new Date());
    const [courts, setCourts] = useState<Court[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [clubId, setClubId] = useState<string | null>(null);
    const [duration, setDuration] = useState(90);
    const [openingHour, setOpeningHour] = useState(8);
    const [closingHour, setClosingHour] = useState(23);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [selectedSlot, setSelectedSlot] = useState<{ court: Court, time: Date } | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [processing, setProcessing] = useState(false);

    // Form states
    const [reservationType, setReservationType] = useState<'booking' | 'maintenance'>('booking');
    const [clientType, setClientType] = useState<'registered' | 'occasional'>('occasional');
    const [guestName, setGuestName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [foundUser, setFoundUser] = useState<{ id: string, display_name: string, avatar_url: string | null } | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const supabase = createBrowserClient();

    // Cargar datos iniciales
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Obtener club
            const { data: members, error } = await supabase
                .from('club_members')
                .select('club_id, clubs(booking_duration, opening_hour, closing_hour)')
                .eq('user_id', user.id)
                .limit(1);

            if (error || !members || members.length === 0) {
                setLoading(false);
                return;
            }

            // Tipado para la respuesta de Supabase
            interface MemberResponse {
                club_id: string;
                clubs: { booking_duration: number; opening_hour: number; closing_hour: number } | { booking_duration: number; opening_hour: number; closing_hour: number }[] | null;
            }
            const member = members[0] as MemberResponse;
            const cId = member.club_id;

            const clubData = Array.isArray(member.clubs) ? member.clubs[0] : member.clubs;

            setClubId(cId);
            setDuration(clubData?.booking_duration || 90);
            setOpeningHour(clubData?.opening_hour ?? 8);
            setClosingHour(clubData?.closing_hour ?? 23);

            // 2. Obtener pistas
            const { data: courtsData } = await supabase
                .from('courts')
                .select('id, name')
                .eq('club_id', cId)
                .order('name');

            setCourts(courtsData || []);
            setLoading(false);
        }

        loadData();
    }, [supabase]);

    // Cargar reservas con useCallback
    const loadReservations = useCallback(async () => {
        if (!clubId) return;
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data } = await supabase
            .from('reservations')
            .select('*')
            .eq('club_id', clubId)
            .gte('start_time', startOfDay.toISOString())
            .lte('end_time', endOfDay.toISOString())
            .neq('status', 'cancelled');

        // Cast seguro ya que definimos la interfaz localmente igual que la de BD
        setReservations((data as unknown as Reservation[]) || []);
    }, [clubId, date, supabase]);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    const changeDate = (days: number) => {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + days);
        setDate(newDate);
    };

    const openNewReservation = (slot: { court: Court, time: Date }) => {
        setReservationType('booking');
        setClientType('occasional');
        setGuestName('');
        setSearchEmail('');
        setFoundUser(null);
        setSelectedSlot(slot);
    };

    const handleSearchUser = async () => {
        if (!searchEmail) return;
        setSearchLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_player_by_email', { email_input: searchEmail });
            if (error) throw error;
            if (data && data.length > 0) {
                setFoundUser(data[0]);
            } else {
                alert('Usuario no encontrado. Verifica el email.');
                setFoundUser(null);
            }
        } catch (err: any) {
            console.error(err);
            alert('Error al buscar usuario: ' + (err.message || 'Error desconocido') + '. Asegúrate de haber ejecutado las migraciones.');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedSlot || !clubId) return;
        setProcessing(true);

        const endTime = new Date(selectedSlot.time);
        endTime.setMinutes(selectedSlot.time.getMinutes() + duration);

        // Logic to determine fields based on form state
        let finalUserId = null;
        let finalNotes = null;
        const finalType = reservationType;

        if (reservationType === 'maintenance') {
            finalNotes = guestName || 'Bloqueo manual'; // Reuse guestInput for maintenance reason if needed, or separate state
        } else {
            // BOOKING
            if (clientType === 'registered') {
                if (!foundUser) {
                    alert('Debes buscar y seleccionar un usuario registrado.');
                    setProcessing(false);
                    return;
                }
                finalUserId = foundUser.id;
            } else {
                // Occasional
                if (!guestName.trim()) {
                    alert('Ingresa el nombre del cliente.');
                    setProcessing(false);
                    return;
                }
                finalNotes = `Cliente: ${guestName}`;
            }
        }

        const { error } = await supabase
            .from('reservations')
            .insert({
                club_id: clubId,
                court_id: selectedSlot.court.id,
                user_id: finalUserId,
                start_time: selectedSlot.time.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                type: finalType,
                notes: finalNotes
            });

        if (error) {
            alert('Error al crear reserva: ' + error.message);
        } else {
            loadReservations();
            setSelectedSlot(null);
        }
        setProcessing(false);
    };

    const handleCancel = async () => {
        if (!selectedReservation) return;
        if (!confirm('¿Cancelar esta reserva?')) return;
        setProcessing(true);

        const { error } = await supabase
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', selectedReservation.id);

        if (error) {
            alert('Error al cancelar: ' + error.message);
        } else {
            loadReservations();
            setSelectedReservation(null);
        }
        setProcessing(false);
    };

    // Generar slots usando horario del club
    const timeSlots: Date[] = [];
    const current = new Date(date);
    current.setHours(openingHour, 0, 0, 0);

    // Crear hora de cierre para comparación segura
    const closingTime = new Date(date);
    closingTime.setHours(closingHour, 0, 0, 0);

    // Usar comparación de timestamps para evitar loop infinito
    while (current.getTime() < closingTime.getTime() && timeSlots.length < 50) {
        timeSlots.push(new Date(current));
        current.setMinutes(current.getMinutes() + duration);
    }

    if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div></div>;
    if (!clubId) return <div className="p-4 text-center text-gray-400">No tienes acceso a un club</div>;

    return (
        <div className="space-y-4 pb-20 relative">
            {/* Header Calendario */}
            <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-700 rounded-lg">
                    <ChevronLeft className="text-gray-400" />
                </button>

                <div className="text-center">
                    <h2 className="text-lg font-bold text-white capitalize">
                        {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h2>
                    <p className="text-xs text-gray-500">Duración: {duration} min</p>
                </div>

                <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-700 rounded-lg">
                    <ChevronRight className="text-gray-400" />
                </button>
            </div>

            {/* Grid Calendario con Scroll */}
            <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900/50">
                <div className="min-w-[600px]">
                    {/* Cabecera Pistas */}
                    <div className="flex border-b border-gray-700">
                        <div className="w-16 shrink-0 bg-gray-800 sticky left-0 z-10 border-r border-gray-700"></div>
                        {courts.map(court => (
                            <div key={court.id} className="flex-1 p-3 text-center border-r border-gray-700 bg-gray-800 last:border-r-0">
                                <span className="font-semibold text-white text-sm">{court.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Cuerpo Horarios */}
                    {timeSlots.map((slot) => {
                        const slotTime = slot.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={slotTime} className="flex border-b border-gray-800 last:border-b-0 h-20">
                                {/* Hora */}
                                <div className="w-16 shrink-0 p-2 text-xs text-gray-400 border-r border-gray-700 bg-gray-900 sticky left-0 z-10 flex flex-col justify-between">
                                    <span>{slotTime}</span>
                                </div>

                                {/* Celdas por pista */}
                                {courts.map(court => {
                                    const reservation = reservations.find(r =>
                                        r.court_id === court.id &&
                                        new Date(r.start_time).getTime() === slot.getTime()
                                    );

                                    return (
                                        <div key={`${court.id}-${slotTime}`} className="flex-1 border-r border-gray-800 last:border-r-0 p-1 relative group">
                                            {reservation ? (
                                                <button
                                                    onClick={() => setSelectedReservation(reservation)}
                                                    className={`w-full h-full rounded flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition p-1 text-center
                                                        ${reservation.type === 'maintenance'
                                                            ? 'bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-900/70'
                                                            : 'bg-green-900/50 text-green-400 border border-green-800 hover:bg-green-900/70'
                                                        }`}
                                                >
                                                    <span>{reservation.type === 'maintenance' ? 'BLOQUEADO' : 'RESERVADO'}</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openNewReservation({ court, time: slot })}
                                                    className="w-full h-full rounded hover:bg-gray-800/50 text-transparent hover:text-gray-500 text-xs flex items-center justify-center transition"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal Crear Reserva */}
            {/* Modal Crear Reserva */}
            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedSlot(null)}>
                    <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Tabs Header */}
                        <div className="flex border-b border-gray-700">
                            <button
                                onClick={() => setReservationType('booking')}
                                className={`flex-1 py-4 text-sm font-bold transition ${reservationType === 'booking' ? 'bg-gray-700/50 text-green-400 border-b-2 border-green-500' : 'text-gray-400 hover:bg-gray-700/30'}`}
                            >
                                Reserva
                            </button>
                            <button
                                onClick={() => setReservationType('maintenance')}
                                className={`flex-1 py-4 text-sm font-bold transition ${reservationType === 'maintenance' ? 'bg-gray-700/50 text-red-400 border-b-2 border-red-500' : 'text-gray-400 hover:bg-gray-700/30'}`}
                            >
                                Bloqueo / Mantenimiento
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-400 mb-6 text-center bg-gray-900 py-2 rounded-lg">
                                {selectedSlot.court.name} • {selectedSlot.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>

                            <div className="space-y-4">
                                {reservationType === 'booking' ? (
                                    <>
                                        {/* Client Type Toggle */}
                                        <div className="flex bg-gray-900 p-1 rounded-lg">
                                            <button
                                                onClick={() => setClientType('occasional')}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${clientType === 'occasional' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Ocasional
                                            </button>
                                            <button
                                                onClick={() => setClientType('registered')}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${clientType === 'registered' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Registrado
                                            </button>
                                        </div>

                                        {clientType === 'registered' ? (
                                            <div className="space-y-3">
                                                <label className="text-xs text-gray-400 ml-1">Buscar Usuario (Email)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="email"
                                                        placeholder="ejemplo@email.com"
                                                        value={searchEmail}
                                                        onChange={e => setSearchEmail(e.target.value)}
                                                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-green-500 focus:outline-none placeholder-gray-600"
                                                    />
                                                    <button
                                                        onClick={handleSearchUser}
                                                        disabled={searchLoading || !searchEmail}
                                                        className="bg-gray-700 hover:bg-gray-600 text-white p-2.5 rounded-lg transition disabled:opacity-50"
                                                    >
                                                        {searchLoading ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <Search size={20} />}
                                                    </button>
                                                </div>

                                                {foundUser && (
                                                    <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-900/50 rounded-lg animate-in fade-in slide-in-from-top-1">
                                                        <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center text-green-200 font-bold text-xs">
                                                            {foundUser.avatar_url ? <img src={foundUser.avatar_url} className="w-full h-full rounded-full" /> : <User size={16} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-green-400 text-sm font-medium truncate">{foundUser.display_name}</p>
                                                            <p className="text-green-500/60 text-xs">Usuario verificado</p>
                                                        </div>
                                                        <button onClick={() => setFoundUser(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-400 ml-1">Nombre del Cliente</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nombre completo"
                                                    value={guestName}
                                                    onChange={e => setGuestName(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-green-500 focus:outline-none placeholder-gray-600"
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 ml-1">Motivo del bloqueo</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Mantenimiento, Limpieza..."
                                            value={guestName}
                                            onChange={e => setGuestName(e.target.value)}
                                            className="w-full bg-gray-900 border border-red-900/30 rounded-lg px-3 py-2.5 text-white text-sm focus:border-red-500 focus:outline-none placeholder-gray-600"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={handleCreate}
                                    disabled={processing}
                                    className={`w-full py-3.5 rounded-xl font-bold text-white transition disabled:opacity-50 mt-2 shadow-lg
                                        ${reservationType === 'booking'
                                            ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                                            : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'}`}
                                >
                                    {processing ? 'Procesando...' : (reservationType === 'booking' ? 'Confirmar Reserva' : 'Bloquear Pista')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalles Reserva */}
            {selectedReservation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedReservation(null)}>
                    <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-white">
                                    {selectedReservation.type === 'maintenance' ? 'Bloqueo de Pista' : 'Reserva'}
                                </h3>
                                <div className={`px-2 py-0.5 rounded text-xs ${selectedReservation.status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                    {selectedReservation.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                                </div>
                            </div>

                            <p className="text-gray-300 mb-6">
                                {new Date(selectedReservation.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedReservation.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>

                            <button
                                onClick={handleCancel}
                                disabled={processing}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                            >
                                {processing ? 'Procesando...' : 'Cancelar Reserva'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
