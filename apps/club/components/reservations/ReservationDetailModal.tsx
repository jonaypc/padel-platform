"use client";

import { useState, useEffect } from "react";
import { X, Edit, Save, AlertTriangle, CheckCircle, Check, User, Search } from "lucide-react";
import type { Court } from "@padel/core";
import {
    ClubConfig,
    ClubReservation,
    ReservationPlayer,
    ReservationItem
} from "../../hooks/userReservations";
import { PlayerPaymentList } from "./PlayerPaymentList";
import { ExtrasSelector } from "./ExtrasSelector";

// Interface para datos de actualización
export interface UpdateReservationData {
    courtId?: string;
    startTime?: Date;
    price?: number;
    notes?: string;
    players?: ReservationPlayer[];
    items?: ReservationItem[];
    userId?: string | null;
}

interface ReservationDetailModalProps {
    reservation: ClubReservation | null;
    courts: Court[];
    clubConfig: ClubConfig;
    onClose: () => void;
    onUpdate: (id: string, data: UpdateReservationData, shouldClose?: boolean) => Promise<{ error: string | null }>;
    onCancel: (id: string) => Promise<{ error: string | null }>;
    onSearchUser: (query: string) => Promise<{ data: any[] | null; error: string | null }>;
    processing: boolean;
}

export function ReservationDetailModal({
    reservation,
    courts,
    clubConfig,
    onClose,
    onUpdate,
    onCancel,
    onSearchUser,
    processing
}: ReservationDetailModalProps) {

    // --- ESTADOS ---
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [confirmCancel, setConfirmCancel] = useState(false);

    // Estados de edición
    const [editCourtId, setEditCourtId] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");
    const [editPrice, setEditPrice] = useState(0);
    const [editNotes, setEditNotes] = useState("");
    const [editPlayers, setEditPlayers] = useState<ReservationPlayer[]>([]);
    const [editItems, setEditItems] = useState<ReservationItem[]>([]);

    // Estados para cliente principal
    const [customerType, setCustomerType] = useState<'occasional' | 'registered'>('occasional');
    const [customerName, setCustomerName] = useState("");
    const [selectedUser, setSelectedUser] = useState<{ id: string, name: string } | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (reservation) {
            const start = new Date(reservation.start_time);
            setEditCourtId(reservation.court_id || "");
            setEditDate(start.toISOString().split('T')[0] || "");
            setEditTime(start.toTimeString().slice(0, 5) || "");
            setEditPrice(reservation.price || 0);
            setEditNotes(reservation.notes || "");

            // Inicializar cliente principal
            if (reservation.user_id) {
                setCustomerType('registered');
                setSelectedUser({ id: reservation.user_id, name: reservation.profiles?.display_name || "Usuario registrado" });
                setCustomerName(reservation.profiles?.display_name || "");
            } else {
                setCustomerType('occasional');
                setSelectedUser(null);
                setCustomerName(reservation.players?.[0]?.name || "");
            }

            // Asegurar siempre 4 slots para jugadores en modo edición
            const currentPlayers = reservation.players || [];
            const paddedPlayers = [...currentPlayers];
            while (paddedPlayers.length < 4) {
                paddedPlayers.push({
                    name: "",
                    paid: false,
                    amount: 0,
                    courtPrice: (reservation.price || 0) / 4 // Sugerir el reparto equitativo
                });
            }
            setEditPlayers(paddedPlayers);

            setEditItems(reservation.items || []);
            setMode('view');
            setConfirmCancel(false);
        }
    }, [reservation]);

    if (!reservation) return null;

    const getCourtName = (id: string) => courts.find(c => c.id === id)?.name || "Pista eliminada";
    const isPaid = reservation.payment_status === 'completed';

    const handlePlayersChange = (newPlayers: ReservationPlayer[]) => {
        setEditPlayers(newPlayers);
        // Sincronizar precio total
        const total = newPlayers.reduce((sum, p) => sum + (p.courtPrice || 0), 0);
        setEditPrice(total);
    };

    const handleTotalManualChange = (newTotal: number) => {
        setEditPrice(newTotal);
        // Redistribuir entre jugadores
        if (editPlayers.length > 0) {
            const perPlayer = Number((newTotal / editPlayers.length).toFixed(2));
            setEditPlayers(editPlayers.map(p => ({ ...p, courtPrice: perPlayer })));
        }
    };

    const handleSearchUser = async (query: string) => {
        setUserSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const { data } = await onSearchUser(query);
        setSearchResults(data || []);
        setIsSearching(false);
    };

    const selectUser = (user: any) => {
        setSelectedUser({ id: user.id, name: user.display_name });
        setCustomerName(user.display_name);
        setSearchResults([]);
        setUserSearchQuery("");

        // Poner al usuario como primer jugador
        const newPlayers = [...editPlayers];
        if (newPlayers[0]) {
            newPlayers[0] = { ...newPlayers[0], name: user.display_name, id: user.id };
            setEditPlayers(newPlayers);
        }
    };

    const handleUpdate = async () => {
        if (!reservation) return;
        const newStart = new Date(`${editDate}T${editTime}`);
        if (isNaN(newStart.getTime())) {
            alert("Fecha u hora inválida");
            return;
        }

        const updateData: UpdateReservationData = {
            notes: editNotes,
            price: editPrice,
            players: editPlayers,
            items: editItems,
            userId: customerType === 'registered' ? selectedUser?.id : null
        };

        const currentStart = new Date(reservation.start_time);
        if (newStart.getTime() !== currentStart.getTime()) {
            updateData.startTime = newStart;
        }
        if (editCourtId !== reservation.court_id) {
            updateData.courtId = editCourtId;
        }

        const res = await onUpdate(reservation.id, updateData);
        if (!res.error) {
            setMode('view');
        } else {
            alert("Error al actualizar: " + res.error);
        }
    };

    const toggleAttendance = async (playerIndex: number) => {
        if (!reservation || !reservation.players) return;

        const newPlayers = [...reservation.players];
        if (newPlayers[playerIndex]) {
            newPlayers[playerIndex] = {
                ...newPlayers[playerIndex],
                confirmed: !newPlayers[playerIndex].confirmed
            };

            // Aquí podemos disparar el update directamente para una mejor UX
            const res = await onUpdate(reservation.id, { players: newPlayers }, false);
            if (res.error) {
                alert("Error al actualizar asistencia: " + res.error);
            }
        }
    };

    const handleCancelReservation = async () => {
        if (!reservation) return;
        const res = await onCancel(reservation.id);
        if (res?.error) {
            alert("Error al cancelar: " + res.error);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-300">
            <div className={`bg-gray-900 border-t md:border ${reservation.type === 'maintenance' ? 'border-red-900/50' : 'border-gray-700/50'} rounded-t-3xl md:rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-2xl h-[92dvh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 md:duration-300 ring-1 ring-white/5`}>

                {/* DRAG HANDLE (Mobile) */}
                <div className="flex justify-center pt-2 md:hidden">
                    <div className="w-12 h-1.5 bg-gray-700/50 rounded-full" />
                </div>

                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                {reservation.type === 'maintenance' ? 'Bloqueo Manual' : 'Detalle Reserva'}
                            </h2>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${reservation.status === 'confirmed' ? 'bg-green-600/10 text-green-400 border border-green-500/30' : 'bg-red-600/10 text-red-400 border border-red-500/30'}`}>
                                {reservation.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                            </span>
                        </div>
                        <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-3 mt-1 font-bold uppercase tracking-widest leading-none">
                            <span className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${reservation.type === 'maintenance' ? 'bg-red-500' : 'bg-green-500'}`} />
                                {getCourtName(reservation.court_id)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="flex items-center gap-1.5 text-white/80">
                                {new Date(reservation.start_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="flex items-center gap-1.5 text-green-400">
                                {new Date(reservation.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all">
                        <X size={24} className="md:w-5 md:h-5" />
                    </button>
                </div>

                {/* BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 overscroll-contain custom-scrollbar bg-linear-to-b from-gray-900 to-gray-950">

                    {confirmCancel && (
                        <div className="bg-red-600/10 border border-red-500/30 rounded-3xl p-6 md:p-10 animate-in zoom-in-95 duration-300 text-center ring-1 ring-red-500/20 shadow-2xl">
                            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-[0_10px_30px_rgba(220,38,38,0.4)]">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-white font-black text-2xl mb-3 tracking-tight">¿Anular Reserva?</h3>
                            <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto font-medium">Esta acción liberará la pista inmediatamente.</p>
                            <div className="flex flex-col gap-4">
                                <button onClick={handleCancelReservation} disabled={processing} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4.5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs">
                                    {processing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "SÍ, ANULAR AHORA"}
                                </button>
                                <button onClick={() => setConfirmCancel(false)} disabled={processing} className="w-full py-4 text-gray-500 hover:text-white font-black transition-all uppercase tracking-widest text-[10px]">
                                    VOLVER ATRÁS
                                </button>
                            </div>
                        </div>
                    )}

                    {!confirmCancel && mode === 'view' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-gray-950/50 border border-gray-800/50 rounded-3xl p-5 flex items-center gap-5 shadow-inner group">
                                    <div className="w-14 h-14 bg-linear-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0 group-hover:scale-105 transition-transform">
                                        {reservation.profiles?.display_name?.charAt(0) || reservation.players?.[0]?.name?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-gray-600 uppercase font-black mb-1 tracking-widest">Responsable</p>
                                        <p className="text-white font-black text-xl truncate uppercase tracking-tight leading-none overflow-hidden">
                                            {reservation.profiles?.display_name || reservation.players?.[0]?.name || 'Sin nombre'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-950/50 border border-gray-800/50 rounded-3xl p-5 flex items-center gap-5 shadow-inner group">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl group-hover:scale-105 transition-transform ${isPaid ? 'bg-linear-to-br from-green-600 to-green-800' : 'bg-linear-to-br from-red-600 to-red-800'}`}>
                                        {isPaid ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-600 uppercase font-black mb-1 tracking-widest">Total Pista</p>
                                        <p className={`font-black text-2xl leading-none ${isPaid ? 'text-green-400' : 'text-red-400'}`}>
                                            {(reservation.price || 0).toFixed(2)}€
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {reservation.type !== 'maintenance' && reservation.players && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Equipo / Jugadores</label>
                                    <div className="bg-gray-950/40 rounded-3xl border border-gray-800 shadow-inner overflow-hidden font-medium">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-gray-800/50">
                                                {reservation.players.map((p, i) => (
                                                    <tr key={i} className="hover:bg-white/2 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => toggleAttendance(i)}
                                                                    disabled={processing}
                                                                    className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center shrink-0 ${p.confirmed ? 'bg-green-600 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-gray-700 hover:border-gray-500'}`}
                                                                >
                                                                    {p.confirmed && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </button>
                                                                <span className={`font-bold uppercase tracking-tight text-[11px] ${p.confirmed ? 'text-white' : 'text-gray-400'}`}>
                                                                    {p.name || `Jugador Vacío`}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                {p.paid ? (
                                                                    <span className="text-[9px] bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/20 font-black uppercase tracking-widest leading-none">Pagado</span>
                                                                ) : (
                                                                    <span className="text-[9px] bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 font-black uppercase tracking-widest leading-none">Pendiente</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {reservation.notes && (
                                <div className="bg-gray-950/50 border border-gray-800/80 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-700 opacity-30" />
                                    <label className="text-[10px] text-gray-600 uppercase font-black mb-3 block tracking-widest">Observaciones</label>
                                    <p className="text-gray-400 text-sm leading-relaxed font-medium group-hover:text-gray-200 transition-colors">&quot;{reservation.notes}&quot;</p>
                                </div>
                            )}
                        </>
                    )}

                    {!confirmCancel && mode === 'edit' && (
                        <div className="space-y-8">
                            {/* Titular de la Reserva */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Titular de la Reserva</label>
                                    <div className="flex bg-gray-950 rounded-xl p-1 border border-gray-800 shadow-inner">
                                        <button
                                            onClick={() => setCustomerType('occasional')}
                                            className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${customerType === 'occasional' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500'}`}
                                        >
                                            Ocasional
                                        </button>
                                        <button
                                            onClick={() => setCustomerType('registered')}
                                            className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${customerType === 'registered' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}
                                        >
                                            Registrado
                                        </button>
                                    </div>
                                </div>

                                {customerType === 'occasional' ? (
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => {
                                                setCustomerName(e.target.value);
                                                const newPlayers = [...editPlayers];
                                                if (newPlayers[0]) newPlayers[0] = { ...newPlayers[0], name: e.target.value };
                                                setEditPlayers(newPlayers);
                                            }}
                                            placeholder="Introduce nombre del cliente..."
                                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white font-medium focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all shadow-inner placeholder:text-gray-700 font-bold"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            value={selectedUser ? selectedUser.name : userSearchQuery}
                                            onChange={(e) => {
                                                if (selectedUser) setSelectedUser(null);
                                                handleSearchUser(e.target.value);
                                            }}
                                            placeholder="Buscar por nombre o email..."
                                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white font-medium focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-inner placeholder:text-gray-700 font-bold"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {searchResults.length > 0 && !selectedUser && (
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 max-h-64 overflow-y-auto overflow-x-hidden p-2 ring-1 ring-white/5 animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                                                {searchResults.map((user: any) => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => selectUser(user)}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl flex items-center gap-4 transition-all group/item"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-blue-800 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg group-hover/item:scale-105 transition-transform">
                                                            {user.display_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-200 truncate group-hover/item:text-white uppercase tracking-tight">{user.display_name}</p>
                                                            <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest font-black leading-none mt-1">{user.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {selectedUser && (
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(null);
                                                    setCustomerName("");
                                                    setUserSearchQuery("");
                                                }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1.5 hover:bg-gray-800 rounded-xl transition-all"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Fecha</label>
                                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500/50 transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Tarifa Total</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-black">€</span>
                                        <input
                                            type="number"
                                            value={editPrice}
                                            onChange={(e) => handleTotalManualChange(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-10 pr-5 text-white outline-none focus:border-blue-500/50 transition-all font-mono font-bold text-lg shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Mover a Pista</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {courts.map(court => (
                                        <button key={court.id} onClick={() => setEditCourtId(court.id)} className={`py-4 px-4 rounded-2xl text-[10px] font-black transition-all border tracking-widest uppercase ${editCourtId === court.id ? 'bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'}`}>{court.name}</button>
                                    ))}
                                </div>
                            </div>

                            {reservation.type !== 'maintenance' && (
                                <>
                                    <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Gestión de Cobros</label>
                                        <div className="bg-gray-950/40 rounded-3xl border border-gray-800/80 p-2 shadow-inner">
                                            <PlayerPaymentList
                                                players={editPlayers}
                                                items={editItems}
                                                priceTemplates={clubConfig.priceTemplates || []}
                                                onPlayersChange={handlePlayersChange}
                                                onPayAll={() => setEditPlayers(prev => prev.map(p => ({ ...p, paid: true })))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Tienda / Extras</label>
                                        <div className="bg-gray-950/40 rounded-3xl border border-gray-800/80 p-4 shadow-inner">
                                            <ExtrasSelector availableExtras={clubConfig.extras || []} items={editItems} players={editPlayers} onItemsChange={setEditItems} />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-4 pt-4 pb-4">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Anotaciones del Staff</label>
                                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-5 text-sm text-gray-200 outline-none resize-none transition-all font-medium" placeholder="Solo visible por el equipo..." />
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-8 bg-gray-900 border-t border-gray-800 shrink-0 flex flex-col md:flex-row gap-4">
                    {!confirmCancel && (
                        <>
                            {mode === 'view' ? (
                                <>
                                    <button onClick={() => setConfirmCancel(true)} className="order-2 md:order-1 px-8 py-4 text-xs font-black text-red-500 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-red-900/30" disabled={processing}>ANULAR</button>
                                    <div className="flex-1 md:order-2 hidden md:block"></div>
                                    <button onClick={() => setMode('edit')} className="order-1 md:order-3 px-10 py-4 text-xs font-black text-white bg-linear-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest"><Edit size={16} /> MODIFICAR</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setMode('view')} className="order-2 md:order-1 px-8 py-4 text-xs font-black text-gray-500 hover:text-white rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-gray-800" disabled={processing}>DESCARTAR</button>
                                    <div className="flex-1 md:order-2 hidden md:block"></div>
                                    <button onClick={handleUpdate} disabled={processing} className="order-1 md:order-3 px-10 py-4 text-xs font-black text-white bg-linear-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
                                        {processing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> GUARDAR CAMBIOS</>}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
