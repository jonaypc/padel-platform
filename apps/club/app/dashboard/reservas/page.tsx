"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, Search, User, X, Clock, Edit } from "lucide-react";

interface Court {
    id: string;
    name: string;
    price?: number;
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
    price?: number;
    players?: { name: string, paid: boolean, amount: number }[];
    items?: { name: string, price: number, quantity: number }[];
    payment_status?: 'pending' | 'partial' | 'completed';
    profiles?: { display_name: string | null } | null;
}

export default function ReservationsPage() {
    const [date, setDate] = useState(new Date());
    const [courts, setCourts] = useState<Court[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [clubId, setClubId] = useState<string | null>(null);
    const [duration, setDuration] = useState(90);
    const [clubDefaultPrice, setClubDefaultPrice] = useState(0);
    const [openingHour, setOpeningHour] = useState(8);
    const [closingHour, setClosingHour] = useState(23);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [selectedSlot, setSelectedSlot] = useState<{ court: Court, time: Date } | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [processing, setProcessing] = useState(false);

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [newStartTime, setNewStartTime] = useState("");
    const [newCourtId, setNewCourtId] = useState("");
    const [reservationPrice, setReservationPrice] = useState<string>("0");
    const [editNotes, setEditNotes] = useState("");

    // Form states
    const [reservationType, setReservationType] = useState<'booking' | 'maintenance'>('booking');
    const [createNotes, setCreateNotes] = useState('');
    const [clientType, setClientType] = useState<'registered' | 'occasional'>('occasional');
    const [guestName, setGuestName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [foundUser, setFoundUser] = useState<{ id: string, display_name: string, avatar_url: string | null } | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Advanced features states
    const [reservationPlayers, setReservationPlayers] = useState<{ name: string, paid: boolean, amount: number }[]>([
        { name: '', paid: false, amount: 0 },
        { name: '', paid: false, amount: 0 },
        { name: '', paid: false, amount: 0 },
        { name: '', paid: false, amount: 0 }
    ]);
    const [reservationItems, setReservationItems] = useState<{ name: string, price: number, quantity: number }[]>([]);
    const [availableExtras, setAvailableExtras] = useState<{ name: string, price: number }[]>([]);

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
                .select('club_id, clubs(*)')
                .eq('user_id', user.id)
                .limit(1);

            if (error || !members || members.length === 0) {
                console.error('Error loading club membership:', { error, members });
                setLoading(false);
                return;
            }

            const member = members[0] as any;
            const clubDataRaw = member.clubs;
            const club = Array.isArray(clubDataRaw) ? clubDataRaw[0] : clubDataRaw;

            if (club) {
                const cId = member.club_id;
                setClubId(cId);
                setDuration(club.booking_duration || 90);
                setClubDefaultPrice(club.default_price || 0);
                setOpeningHour(club.opening_hour ?? 8);
                setClosingHour(club.closing_hour ?? 23);
                setAvailableExtras(club.extras || []);

                // 2. Obtener pistas (incluyendo precio específico)
                let { data: courtsData, error: courtsError } = await supabase
                    .from('courts')
                    .select('id, name, price')
                    .eq('club_id', cId)
                    .order('name');

                if (courtsError) {
                    console.warn('Fallo consulta pistas con precio, intentando fallback:', courtsError);
                    const { data: fallbackCourts, error: fallbackError } = await supabase
                        .from('courts')
                        .select('id, name')
                        .eq('club_id', cId)
                        .order('name');
                    if (!fallbackError) {
                        courtsData = fallbackCourts as any;
                    }
                }

                setCourts(courtsData || []);
            }
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

        const { data, error } = await supabase
            .from('reservations')
            .select('*, profiles(display_name)')
            .eq('club_id', clubId)
            // Fix: intersection query instead of containment
            .lt('start_time', endOfDay.toISOString())
            .gt('end_time', startOfDay.toISOString())
            .neq('status', 'cancelled');

        if (error) {
            console.error('Error fetching reservations:', error);
        }

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
        setCreateNotes('');
        setSearchEmail('');
        setFoundUser(null);
        setSelectedSlot(slot);
        setIsEditing(false); // Reset edit state

        // Calcular precio sugerido
        const court = courts.find(c => c.id === slot.court.id);
        const price = court?.price || clubDefaultPrice;
        setReservationPrice(price.toString());

        // Reset advanced features
        setReservationPlayers([
            { name: '', paid: false, amount: 0 },
            { name: '', paid: false, amount: 0 },
            { name: '', paid: false, amount: 0 },
            { name: '', paid: false, amount: 0 }
        ]);
        setReservationItems([]);
    };

    // Abrir modal de detalle
    const openReservationDetail = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsEditing(false);
        setNewStartTime(new Date(reservation.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        setNewCourtId(reservation.court_id);
        setReservationPrice(reservation.price?.toString() || "0");
        setEditNotes(reservation.notes || "");

        // Load advanced features if exist
        if (reservation.players && reservation.players.length > 0) {
            setReservationPlayers(reservation.players);
        } else {
            setReservationPlayers([
                { name: reservation.profiles?.display_name || 'Jugador 1', paid: true, amount: 0 },
                { name: '', paid: false, amount: 0 },
                { name: '', paid: false, amount: 0 },
                { name: '', paid: false, amount: 0 }
            ]);
        }
        setReservationItems(reservation.items || []);
    };

    const handleSearchUser = async () => {
        if (!searchEmail) return;
        setSearchLoading(true);
        try {
            // Buscar por username (display_name) en la tabla profiles
            const { data, error } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url')
                .ilike('display_name', `%${searchEmail}%`)
                .limit(5);
            
            if (error) throw error;
            if (data && data.length > 0) {
                const firstUser = data[0];
                if (firstUser) {
                    setFoundUser({
                        id: firstUser.id,
                        display_name: firstUser.display_name || 'Sin nombre',
                        avatar_url: firstUser.avatar_url
                    });
                }
            } else {
                alert('Usuario no encontrado. Verifica el nombre.');
                setFoundUser(null);
            }
        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            alert('Error al buscar usuario: ' + msg);
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
        let prefixLabel = "";
        const finalType = reservationType;

        if (reservationType === 'maintenance') {
            prefixLabel = guestName ? `Bloqueo: ${guestName}` : 'Bloqueo manual';
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
                prefixLabel = `Cliente: ${guestName}`;
            }
        }

        // Combinar prefijo con notas personalizadas si existen
        const finalNotes = prefixLabel && createNotes
            ? `${prefixLabel} - ${createNotes}`
            : (prefixLabel || createNotes);

        // Calcular estado de pago
        const playersPaid = reservationPlayers.filter(p => p.paid).length;
        let pStatus: 'pending' | 'partial' | 'completed' = 'pending';
        if (playersPaid === reservationPlayers.length) pStatus = 'completed';
        else if (playersPaid > 0) pStatus = 'partial';

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
                price: parseFloat(reservationPrice) || 0,
                notes: finalNotes,
                players: reservationPlayers.filter(p => p.name.trim() !== ''),
                items: reservationItems,
                payment_status: pStatus
            })
            .select();

        if (error) {
            console.error('Error creating reservation:', error);
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
            .eq('id', selectedReservation.id)
            .select();

        if (error) {
            alert('Error al cancelar: ' + error.message);
        } else {
            loadReservations();
            setSelectedReservation(null);
        }
        setProcessing(false);
    };

    const handleMoveReservation = async () => {
        if (!selectedReservation || !newStartTime || !newCourtId) return;
        setProcessing(true);

        // Calcular nuevas fechas
        const timeParts = newStartTime.split(':');
        const hours = parseInt(timeParts[0] || '0');
        const minutes = parseInt(timeParts[1] || '0');

        const newStart = new Date(selectedReservation.start_time);
        newStart.setHours(hours, minutes, 0, 0); // Mismo día, nueva hora

        const newEnd = new Date(newStart);
        newEnd.setMinutes(newStart.getMinutes() + (duration || 90));

        // Validación de conflictos en cliente
        const hasConflict = reservations.some(r => {
            if (r.id === selectedReservation.id) return false; // Ignorar la propia reserva actual
            if (r.court_id !== newCourtId) return false; // IMPORTANTE: Check en la nueva pista seleccionada

            const rStart = new Date(r.start_time).getTime();
            const rEnd = new Date(r.end_time).getTime();

            // Chequeo de solape simple (Intersection)
            // (StartA < EndB) and (EndA > StartB)
            return (newStart.getTime() < rEnd && newEnd.getTime() > rStart);
        });

        if (hasConflict) {
            alert('❌ Conflicto: Ya hay una reserva en ese horario/pista.');
            setProcessing(false);
            return;
        }

        // Calcular estado de pago
        const playersPaid = reservationPlayers.filter(p => p.paid).length;
        let pStatus: 'pending' | 'partial' | 'completed' = 'pending';
        if (playersPaid === reservationPlayers.length) pStatus = 'completed';
        else if (playersPaid > 0) pStatus = 'partial';

        // Actualizar en BD (Hora, Pista, Precio, Notas, Jugadores, Items y Estado Pago)
        const { error } = await supabase
            .from('reservations')
            .update({
                court_id: newCourtId,
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString(),
                price: parseFloat(reservationPrice) || 0,
                notes: editNotes,
                players: reservationPlayers.filter(p => p.name.trim() !== ''),
                items: reservationItems,
                payment_status: pStatus
            })
            .eq('id', selectedReservation.id)
            .select();

        if (error) {
            alert('Error al mover: ' + error.message);
        } else {
            alert('✅ Reserva movida correctamente');
            loadReservations();
            setSelectedReservation(null);
        }
        setProcessing(false);
    };

    // Generar slots usando horario del club
    const baseSlots: Date[] = [];
    const current = new Date(date);
    current.setHours(openingHour, 0, 0, 0);

    // Crear hora de cierre para comparación segura
    const closingTime = new Date(date);
    closingTime.setHours(closingHour, 0, 0, 0);

    // Usar comparación de timestamps para evitar loop infinito
    while (current.getTime() < closingTime.getTime() && baseSlots.length < 50) {
        baseSlots.push(new Date(current));
        current.setMinutes(current.getMinutes() + (duration || 90));
    }

    // Fusionar con los horarios reales de las reservas existentes (inicio y fin)
    const reservationSlots = reservations.flatMap(r => {
        const start = new Date(r.start_time);
        start.setSeconds(0, 0);

        const end = new Date(r.end_time);
        end.setSeconds(0, 0);

        return [start, end];
    });

    const allTimestamps = new Set([
        ...baseSlots.map(d => {
            const normalized = new Date(d);
            normalized.setSeconds(0, 0);
            return normalized.getTime();
        }),
        ...reservationSlots.map(d => d.getTime())
    ]);

    const timeSlots = Array.from(allTimestamps)
        .sort((a, b) => a - b)
        .map(ts => new Date(ts))
        .filter(d => {
            // Filtrar solo los que estén dentro del horario de apertura/cierre visual
            // Ojo: si un juego termina al cierre, no hace falta mostrar esa hora como slot de inicio
            const h = d.getHours();
            // Permitir mostrar hasta la hora de cierre (exclusivo) para no mostrar slot a las 23:00 si cierra a las 23
            return h >= openingHour && h < closingHour;
        });

    if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div></div>;
    if (!clubId) return <div className="p-4 text-center text-gray-400">No tienes acceso a un club</div>;

    return (
        <div className="space-y-4 pb-10 lg:pb-0 relative">
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
                <div className="min-w-[600px] lg:min-w-0">
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
                        const slotMs = slot.getTime();
                        const slotTime = slot.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={slotMs} className="flex border-b border-gray-800 last:border-b-0 h-20">
                                {/* Hora */}
                                <div className="w-16 shrink-0 p-2 text-xs text-gray-400 border-r border-gray-700 bg-gray-900 sticky left-0 z-10 flex flex-col justify-between">
                                    <span>{slotTime}</span>
                                </div>

                                {/* Celdas por pista */}
                                {courts.map(court => {
                                    const slotMs = slot.getTime();

                                    // 1. Buscar si hay reserva que COMIENZA aquí (Master)
                                    const startingReservation = reservations.find(r =>
                                        r.court_id === court.id &&
                                        new Date(r.start_time).getTime() === slotMs
                                    );

                                    // 2. Buscar si hay reserva que OCUPE este slot (pero no empieza aquí)
                                    const overlappingReservation = reservations.find(r => {
                                        if (r.court_id !== court.id) return false;
                                        const start = new Date(r.start_time).getTime();
                                        const end = new Date(r.end_time).getTime();
                                        return slotMs > start && slotMs < end;
                                    });

                                    const getReservationLabel = (res: Reservation) => {
                                        if (res.type === 'maintenance') return res.notes || 'BLOQUEADO';
                                        if (res.profiles?.display_name) return res.profiles.display_name;
                                        if (res.notes?.startsWith('Cliente: ')) return res.notes.replace('Cliente: ', '');
                                        return 'RESERVADO';
                                    };

                                    return (
                                        <div key={`${court.id}-${slotMs}`} className="flex-1 border-r border-gray-800 last:border-r-0 p-1 relative group">
                                            {startingReservation ? (
                                                <button
                                                    onClick={() => openReservationDetail(startingReservation)}
                                                    className={`w-full h-full rounded flex flex-col items-center justify-center text-[10px] leading-tight font-bold cursor-pointer transition p-1 text-center z-10 relative
                                                        ${startingReservation.type === 'maintenance'
                                                            ? 'bg-red-900/90 text-red-400 border border-red-800 hover:bg-red-900'
                                                            : 'bg-green-900/90 text-green-400 border border-green-800 hover:bg-green-900'
                                                        }`}
                                                    style={{ height: 'calc(100% + 2px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                                                >
                                                    <span className="uppercase tracking-tighter opacity-70 block text-[8px] mb-0.5">
                                                        {startingReservation.type === 'maintenance' ? 'Mantenimiento' : 'Pista'}
                                                    </span>
                                                    <span className="truncate w-full inline-block">
                                                        {getReservationLabel(startingReservation)}
                                                    </span>
                                                </button>
                                            ) : overlappingReservation ? (
                                                <div className="w-full h-full rounded bg-gray-800/80 border border-dashed border-gray-700 flex items-center justify-center">
                                                    <span className="text-[10px] text-gray-600">Ocupado</span>
                                                </div>
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
            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setSelectedSlot(null)}>
                    <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl my-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                                                <label className="text-xs text-gray-400 ml-1">Buscar Usuario (Nombre)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre de usuario..."
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
                                                            {foundUser.avatar_url ? (
                                                                <Image
                                                                    src={foundUser.avatar_url}
                                                                    alt={foundUser.display_name}
                                                                    width={32}
                                                                    height={32}
                                                                    className="w-full h-full rounded-full"
                                                                />
                                                            ) : <User size={16} />}
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 ml-1">Precio de la Reserva</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={reservationPrice}
                                                onChange={e => setReservationPrice(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">€</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 invisible">
                                        {/* Spacer */}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 ml-1">Notas / Info Extra (Opcional)</label>
                                    <textarea
                                        placeholder="Información interna relevante..."
                                        value={createNotes}
                                        onChange={e => setCreateNotes(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none placeholder-gray-600 min-h-[60px] resize-none"
                                    />
                                </div>

                                {/* NEW: Seccion de Jugadores */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Jugadores y Pagos</h4>
                                    <div className="space-y-2">
                                        {reservationPlayers.map((player, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    placeholder={`Jugador ${idx + 1}`}
                                                    value={player.name}
                                                    onChange={e => {
                                                    const newPlayers = [...reservationPlayers];
                                                    if (newPlayers[idx]) newPlayers[idx].name = e.target.value;
                                                    setReservationPlayers(newPlayers);
                                                    }}
                                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-green-500 outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newPlayers = [...reservationPlayers];
                                                        if (newPlayers[idx]) newPlayers[idx].paid = !newPlayers[idx].paid;
                                                        setReservationPlayers(newPlayers);
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold transition ${player.paid ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                                >
                                                    {player.paid ? 'PAGADO' : 'PENDIENTE'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 italic ml-1">El importe total se dividirá equitativamente entre los jugadores marcados.</p>
                                </div>

                                {/* NEW: Seccion de Extras */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Extras / Tienda</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {availableExtras.map(extra => (
                                            <button
                                                key={extra.name}
                                                onClick={() => {
                                                    const existing = reservationItems.find(i => i.name === extra.name);
                                                    if (existing) {
                                                        setReservationItems(reservationItems.map(i => i.name === extra.name ? { ...i, quantity: i.quantity + 1 } : i));
                                                    } else {
                                                        setReservationItems([...reservationItems, { ...extra, quantity: 1 }]);
                                                    }
                                                    // Actualizar precio total
                                                    setReservationPrice((prev) => (parseFloat(prev) + extra.price).toString());
                                                }}
                                                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2 border border-gray-600 transition"
                                            >
                                                <span>{extra.name}</span>
                                                <span className="text-green-400 font-bold">+{extra.price}€</span>
                                            </button>
                                        ))}
                                    </div>

                                    {reservationItems.length > 0 && (
                                        <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                                            {reservationItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-300">{item.name} (x{item.quantity})</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-white">{(item.price * item.quantity).toFixed(2)}€</span>
                                                        <button
                                                            onClick={() => {
                                                                const newItems = [...reservationItems];
                                                                const currentItem = newItems[idx];
                                                                if (currentItem && currentItem.quantity > 1) {
                                                                    currentItem.quantity -= 1;
                                                                    setReservationItems(newItems);
                                                                } else {
                                                                    setReservationItems(newItems.filter((_, i) => i !== idx));
                                                                }
                                                                setReservationPrice((prev) => (parseFloat(prev) - item.price).toString());
                                                            }}
                                                            className="text-red-500 hover:text-red-400"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-2 border-t border-gray-800 flex justify-between font-bold text-green-400">
                                                <span>TOTAL EXTRAS</span>
                                                <span>{reservationItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}€</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                                    {isEditing ? 'Mover Reserva' : (selectedReservation.type === 'maintenance' ? 'Bloqueo de Pista' : 'Reserva')}
                                </h3>
                                <div className={`px-2 py-0.5 rounded text-xs ${selectedReservation.status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                    {selectedReservation.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                                </div>
                            </div>

                            {!isEditing ? (
                                // MODO LECTURA
                                <>
                                    <div className="bg-gray-900/50 p-4 rounded-xl mb-6 space-y-3">
                                        <p className="text-gray-300 flex items-center gap-2">
                                            <Clock size={16} className="text-gray-500" />
                                            {new Date(selectedReservation.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedReservation.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>

                                        {selectedReservation.type === 'booking' && (
                                            <p className="text-white flex items-center gap-2">
                                                <User size={16} className="text-gray-500" />
                                                {selectedReservation.profiles?.display_name ||
                                                    (selectedReservation.notes?.startsWith('Cliente: ')
                                                        ? selectedReservation.notes.replace('Cliente: ', '')
                                                        : 'Cliente Ocasional')}
                                            </p>
                                        )}

                                        {selectedReservation.notes && (
                                            <div className="pt-2 border-t border-gray-700">
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Notas:</p>
                                                <p className="text-sm text-gray-300 italic">
                                                    {selectedReservation.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                                        >
                                            <Edit size={16} /> Editar / Mover
                                        </button>

                                        <button
                                            onClick={handleCancel}
                                            disabled={processing}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                                        >
                                            {processing ? 'Procesando...' : 'Cancelar Reserva'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // MODO EDICIÓN
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nueva Hora Inicio</label>
                                        <input
                                            type="time"
                                            value={newStartTime}
                                            onChange={(e) => setNewStartTime(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none text-xl font-mono text-center"
                                        />
                                    </div>

                                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Cambiar Pista</label>
                                        <select
                                            value={newCourtId}
                                            onChange={(e) => setNewCourtId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500 outline-none text-sm"
                                        >
                                            {courts.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Precio de la Reserva (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={reservationPrice}
                                            onChange={(e) => setReservationPrice(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none font-bold text-lg"
                                        />
                                    </div>

                                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Notas / Información</label>
                                        <textarea
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            placeholder="Información relevante para el staff..."
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none min-h-[60px] resize-none"
                                        />
                                    </div>

                                    {/* Edit Players */}
                                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 space-y-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Jugadores y Pagos</label>
                                        <div className="space-y-2">
                                            {reservationPlayers.map((player, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        placeholder={`Jugador ${idx + 1}`}
                                                        value={player.name}
                                                        onChange={e => {
                                                            const newPlayers = [...reservationPlayers];
                                                            if (newPlayers[idx]) newPlayers[idx].name = e.target.value;
                                                            setReservationPlayers(newPlayers);
                                                        }}
                                                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs focus:border-green-500 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newPlayers = [...reservationPlayers];
                                                            if (newPlayers[idx]) newPlayers[idx].paid = !newPlayers[idx].paid;
                                                            setReservationPlayers(newPlayers);
                                                        }}
                                                        className={`px-3 py-2 rounded-lg text-[10px] font-bold transition ${player.paid ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                                    >
                                                        {player.paid ? 'PAGADO' : 'PENDIENTE'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Edit Extras */}
                                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 space-y-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Extras / Tienda</label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableExtras.map(extra => (
                                                <button
                                                    key={extra.name}
                                                    onClick={() => {
                                                        const existing = reservationItems.find(i => i.name === extra.name);
                                                        if (existing) {
                                                            setReservationItems(reservationItems.map(i => i.name === extra.name ? { ...i, quantity: i.quantity + 1 } : i));
                                                        } else {
                                                            setReservationItems([...reservationItems, { ...extra, quantity: 1 }]);
                                                        }
                                                        setReservationPrice((prev) => (parseFloat(prev) + extra.price).toString());
                                                    }}
                                                    className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1.5 rounded-lg text-[10px] flex items-center gap-1 border border-gray-600 transition"
                                                >
                                                    <span>{extra.name}</span>
                                                    <span className="text-green-400 font-bold">+{extra.price}€</span>
                                                </button>
                                            ))}
                                        </div>
                                        {reservationItems.length > 0 && (
                                            <div className="bg-gray-800 rounded-lg p-2 space-y-1">
                                                {reservationItems.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-[10px]">
                                                        <span className="text-gray-300">{item.name} (x{item.quantity})</span>
                                                        <button
                                                            onClick={() => {
                                                                const newItems = [...reservationItems];
                                                                const currentItem = newItems[idx];
                                                                if (currentItem && currentItem.quantity > 1) {
                                                                    currentItem.quantity -= 1;
                                                                    setReservationItems(newItems);
                                                                } else {
                                                                    setReservationItems(newItems.filter((_, i) => i !== idx));
                                                                }
                                                                setReservationPrice((prev) => (parseFloat(prev) - item.price).toString());
                                                            }}
                                                            className="text-red-500"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleMoveReservation}
                                            disabled={processing}
                                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
                                        >
                                            {processing ? 'Guardando...' : 'Confirmar'}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
