"use client";

import { useState, useEffect } from "react";
import { X, Edit, Save, AlertTriangle, CheckCircle } from "lucide-react";
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
}

interface ReservationDetailModalProps {
    reservation: ClubReservation | null;
    courts: Court[];
    clubConfig: ClubConfig;
    onClose: () => void;
    onUpdate: (id: string, data: UpdateReservationData) => Promise<{ error: string | null }>;
    onCancel: (id: string) => Promise<{ error: string | null }>;
    processing: boolean;
}

export function ReservationDetailModal({
    reservation,
    courts,
    clubConfig,
    onClose,
    onUpdate,
    onCancel,
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

    // Inicializar estados al abrir o cambiar reserva

    useEffect(() => {
        if (reservation) {
            const start = new Date(reservation.start_time);
            setEditCourtId(reservation.court_id || "");
            setEditDate(start.toISOString().split('T')[0] || "");
            setEditTime(start.toTimeString().slice(0, 5) || "");
            setEditPrice(reservation.price || 0);
            setEditNotes(reservation.notes || "");
            setEditPlayers(reservation.players || []);
            setEditItems(reservation.items || []);
            setMode('view');
            setConfirmCancel(false);
        }
    }, [reservation]);

    // --- HELPERS ---

    if (!reservation) return null;

    const getCourtName = (id: string) => courts.find(c => c.id === id)?.name || "Pista eliminada";



    const isPaid = reservation.payment_status === 'completed';

    // --- HANDLERS ---

    const handleUpdate = async () => {
        if (!reservation) return;

        // Construir nueva fecha start
        const newStart = new Date(`${editDate}T${editTime}`);

        // Validar que sea válida
        if (isNaN(newStart.getTime())) {
            alert("Fecha u hora inválida");
            return;
        }

        const updateData: UpdateReservationData = {
            notes: editNotes,
            price: editPrice,
            players: editPlayers,
            items: editItems
        };

        // Solo incluir cambios de corte/tiempo si cambiaron
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
            <div className={`bg-gray-900 border-t md:border ${reservation.type === 'maintenance' ? 'border-red-900/50' : 'border-gray-700/50'} rounded-t-3xl md:rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-2xl h-[92vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 md:duration-300 ring-1 ring-white/5`}>

                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                {reservation.type === 'maintenance' ? 'Bloqueo Manual' : 'Detalle Reserva'}
                            </h2>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${reservation.status === 'confirmed' ? 'bg-green-600/10 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-red-600/10 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
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
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"
                    >
                        <X size={24} className="md:w-5 md:h-5" />
                    </button>
                </div>

                {/* BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 overscrell-contain custom-scrollbar bg-gradient-to-b from-gray-900 to-gray-950">

                    {/* Alerta de Cancelación */}
                    {confirmCancel && (
                        <div className="bg-red-600/10 border border-red-500/30 rounded-3xl p-6 md:p-10 animate-in zoom-in-95 duration-300 text-center ring-1 ring-red-500/20 shadow-2xl">
                            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-[0_10px_30px_rgba(220,38,38,0.4)] rotate-3">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-white font-black text-2xl mb-3 tracking-tight">¿Anular Reserva?</h3>
                            <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto font-medium">Esta acción liberará la pista inmediatamente y no podrá revertirse.</p>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleCancelReservation}
                                    disabled={processing}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-red-900/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs ring-1 ring-white/10"
                                >
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "SÍ, ANULAR AHORA"
                                    )}
                                </button>
                                <button
                                    onClick={() => setConfirmCancel(false)}
                                    disabled={processing}
                                    className="w-full py-4 text-gray-500 hover:text-white font-black transition-all uppercase tracking-widest text-[10px]"
                                >
                                    VOLVER ATRÁS
                                </button>
                            </div>
                        </div>
                    )}

                    {!confirmCancel && mode === 'view' && (
                        <>
                            {/* Info Principal View */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-gray-950/50 border border-gray-800/50 rounded-3xl p-5 flex items-center gap-5 shadow-inner group">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0 group-hover:scale-105 transition-transform">
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
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl group-hover:scale-105 transition-transform ${isPaid ? 'bg-gradient-to-br from-green-600 to-green-800' : 'bg-gradient-to-br from-red-600 to-red-800'}`}>
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

                            {/* Jugadores Table */}
                            {reservation.type !== 'maintenance' && reservation.players && reservation.players.length > 0 && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Equipo / Jugadores</label>
                                    <div className="bg-gray-950/40 rounded-3xl border border-gray-800 shadow-inner overflow-hidden font-medium">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-gray-800/50">
                                                {reservation.players.map((p, i) => (
                                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-5 text-gray-300 font-bold uppercase tracking-tight text-[11px]">{p.name || `Jugador Vacío`}</td>
                                                        <td className="px-6 py-5 text-right">
                                                            {p.paid ? (
                                                                <span className="text-[9px] bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/20 font-black uppercase tracking-widest">Pagado</span>
                                                            ) : (
                                                                <span className="text-[9px] bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 font-black uppercase tracking-widest">Pendiente</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Notas */}
                            {reservation.notes && (
                                <div className="bg-gray-950/50 border border-gray-800/80 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-700 opacity-30" />
                                    <label className="text-[10px] text-gray-600 uppercase font-black mb-3 block tracking-widest">Observaciones</label>
                                    <p className="text-gray-400 text-sm leading-relaxed font-medium group-hover:text-gray-200 transition-colors">
                                        &quot;{reservation.notes}&quot;
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {!confirmCancel && mode === 'edit' && (
                        <div className="space-y-8">
                            {/* Inputs de Edición */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Horario</label>
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner font-mono font-bold"
                                    />
                                </div>
                            </div>

                            {/* Pista */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Mover a Pista</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {courts.map(court => (
                                        <button
                                            key={court.id}
                                            onClick={() => setEditCourtId(court.id)}
                                            className={`py-4 px-4 rounded-2xl text-[10px] font-black transition-all border tracking-widest uppercase flex flex-col items-center justify-center gap-1
                                                ${editCourtId === court.id
                                                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                                                }`}
                                        >
                                            {court.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Jugadores y Pagos en Edit */}
                            {reservation.type !== 'maintenance' && (
                                <div className="space-y-4 pt-4">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Gestión de Cobros</label>
                                    <div className="bg-gray-950/40 rounded-3xl border border-gray-800/80 p-2 shadow-inner">
                                        <PlayerPaymentList
                                            players={editPlayers}
                                            items={editItems}
                                            priceTemplates={clubConfig.priceTemplates || []}
                                            onPlayersChange={setEditPlayers}
                                            onPayAll={() => setEditPlayers(prev => prev.map(p => ({ ...p, paid: true })))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tienda */}
                            {reservation.type !== 'maintenance' && (
                                <div className="space-y-4 pt-4">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Tienda / Extras</label>
                                    <div className="bg-gray-950/40 rounded-3xl border border-gray-800/80 p-4 shadow-inner">
                                        <ExtrasSelector
                                            availableExtras={clubConfig.extras || []}
                                            items={editItems}
                                            players={editPlayers}
                                            onItemsChange={setEditItems}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Notas en Edit */}
                            <div className="space-y-4 pt-4 pb-4">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block leading-none">Anotaciones del Staff</label>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-5 text-sm text-gray-200 focus:border-gray-600 outline-none resize-none transition-all shadow-inner placeholder:text-gray-700 font-medium"
                                    placeholder="Solo visible por el equipo..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-5 md:p-8 bg-gray-900 border-t border-gray-800 shrink-0 flex flex-col md:flex-row gap-4">
                    {!confirmCancel && (
                        <>
                            {mode === 'view' ? (
                                <>
                                    <button
                                        onClick={() => setConfirmCancel(true)}
                                        className="order-2 md:order-1 px-8 py-4 text-xs font-black text-red-500 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-red-900/30"
                                        disabled={processing}
                                    >
                                        ANULAR
                                    </button>
                                    <div className="flex-1 md:order-2 hidden md:block"></div>
                                    <button
                                        onClick={() => setMode('edit')}
                                        className="order-1 md:order-3 px-10 py-4 text-xs font-black text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-2xl shadow-2xl shadow-blue-900/40 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 ring-1 ring-white/10 uppercase tracking-widest"
                                    >
                                        <Edit size={16} /> MODIFICAR
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setMode('view')}
                                        className="order-2 md:order-1 px-8 py-4 text-xs font-black text-gray-500 hover:text-white rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-gray-800"
                                        disabled={processing}
                                    >
                                        DESCARTAR
                                    </button>
                                    <div className="flex-1 md:order-2 hidden md:block"></div>
                                    <button
                                        onClick={handleUpdate}
                                        disabled={processing}
                                        className="order-1 md:order-3 px-10 py-4 text-xs font-black text-white bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 rounded-2xl shadow-2xl shadow-green-900/40 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 ring-1 ring-white/10 uppercase tracking-widest"
                                    >
                                        {processing ? (
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <><Save size={16} /> GUARDAR CAMBIOS</>
                                        )}
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


