"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Edit, Trash2, Save, AlertTriangle, User, CheckCircle } from "lucide-react";
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

    const formatDateTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isPaid = reservation.payment_status === 'completed';
    const isPartial = reservation.payment_status === 'partial';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-gray-900 border ${reservation.type === 'maintenance' ? 'border-red-900/50' : 'border-gray-700'} rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col transition-all duration-300`}>

                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 flex-wrap gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">
                                {reservation.type === 'maintenance' ? 'Bloqueo / Mantenimiento' : 'Detalle de Reserva'}
                            </h2>
                            {mode === 'view' && (
                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold
                                    ${reservation.status === 'confirmed' ? 'bg-green-900/30 text-green-400 border-green-900' : ''}
                                    ${reservation.status === 'cancelled' ? 'bg-red-900/30 text-red-400 border-red-900' : ''}
                                `}>
                                    {reservation.status === 'confirmed' ? 'CONFIRMADA' : reservation.status}
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                            ID: <span className="font-mono text-xs">{reservation.id.slice(0, 8)}...</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {mode === 'view' && reservation.status !== 'cancelled' && (
                            <button
                                onClick={() => setMode('edit')}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2 transition border border-gray-700"
                            >
                                <Edit size={14} /> Editar
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* BODY VIEW MODE */}
                {mode === 'view' && (
                    <div className="p-6 space-y-6">

                        {/* Info Principal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-3">
                                <div className="flex items-start gap-3">
                                    <Calendar className="text-green-500 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Fecha y Hora</p>
                                        <p className="text-white font-medium text-lg">
                                            {formatDateTime(reservation.start_time)}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            {(clubConfig.duration / 60).toFixed(1)}h duración
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-[18px] flex justify-center mt-1">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Pista</p>
                                        <p className="text-white font-medium">{getCourtName(reservation.court_id)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-3">
                                <div className="flex items-start gap-3">
                                    <User className="text-purple-500 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Cliente Principal</p>
                                        {reservation.profiles?.display_name ? (
                                            <p className="text-white font-medium flex items-center gap-2">
                                                {reservation.profiles.display_name}
                                                <span className="text-[10px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900">App</span>
                                            </p>
                                        ) : (
                                            <p className="text-gray-300 font-medium italic">
                                                {reservation.players?.[0]?.name || "Cliente Ocasional"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        {isPaid ? <CheckCircle className="text-green-500" size={18} /> : <AlertTriangle className="text-yellow-500" size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Estado de Pago</p>
                                        <p className={`font-medium ${isPaid ? 'text-green-400' : isPartial ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {isPaid ? 'PAGADO' : isPartial ? 'PARCIAL' : 'PENDIENTE'}
                                        </p>
                                        <p className="text-white font-mono text-xl">{(reservation.price || 0).toFixed(2)}€</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Jugadores */}
                        {reservation.type !== 'maintenance' && reservation.players && reservation.players.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase">Jugadores</h3>
                                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-2">Nombre</th>
                                                <th className="px-4 py-2 text-right">Importe</th>
                                                <th className="px-4 py-2 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {reservation.players.map((p, i) => (
                                                <tr key={i} className="hover:bg-gray-700/30">
                                                    <td className="px-4 py-2 text-white">{p.name || `Jugador ${i + 1}`}</td>
                                                    <td className="px-4 py-2 text-right font-mono text-gray-300">
                                                        {(p.courtPrice || 0).toFixed(2)}€
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        {p.paid ? (
                                                            <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900">PAGADO</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900">PENDIENTE</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Items */}
                        {reservation.items && reservation.items.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase">Extras / Artículos</h3>
                                <div className="flex flex-wrap gap-2">
                                    {reservation.items.map((item, i) => (
                                        <div key={i} className="bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 text-sm flex items-center gap-2">
                                            <span className="text-white">{item.name}</span>
                                            <span className="text-gray-400">x{item.quantity}</span>
                                            <span className="text-green-400 font-mono">{(item.price * item.quantity).toFixed(2)}€</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notas */}
                        {reservation.notes && (
                            <div className="bg-yellow-900/10 border border-yellow-900/30 p-3 rounded-lg">
                                <p className="text-xs text-yellow-500 uppercase font-bold mb-1">Notas</p>
                                <p className="text-yellow-200 text-sm italic">&quot;{reservation.notes}&quot;</p>
                            </div>
                        )}

                        {/* Actions Footer */}
                        <div className="pt-6 border-t border-gray-800 flex justify-between items-center">
                            {!confirmCancel ? (
                                <button
                                    onClick={() => setConfirmCancel(true)}
                                    className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 hover:underline"
                                >
                                    <Trash2 size={14} /> Cancelar Reserva
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                    <span className="text-sm text-white font-bold">¿Seguro?</span>
                                    <button
                                        onClick={handleCancelReservation}
                                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold"
                                        disabled={processing}
                                    >
                                        SÍ, CANCELAR
                                    </button>
                                    <button
                                        onClick={() => setConfirmCancel(false)}
                                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
                                    >
                                        NO
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* BODY EDIT MODE */}
                {mode === 'edit' && (
                    <div className="p-6 space-y-6">

                        <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg flex gap-3 text-blue-200 text-sm">
                            <AlertTriangle className="shrink-0" size={20} />
                            <p>Editando reserva. Verifica disponibilidad si cambias fecha u hora.</p>
                        </div>

                        {/* Fechas y Pista */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Pista</label>
                                <select
                                    value={editCourtId}
                                    onChange={(e) => setEditCourtId(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                                >
                                    {courts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Fecha</label>
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Hora</label>
                                <input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Precio Global */}
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Precio Total Pista</label>
                            <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                                className="w-full md:w-1/3 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 font-mono"
                            />
                        </div>

                        {/* Jugadores */}
                        <div className="border-t border-gray-800 pt-4">
                            <label className="text-sm font-medium text-gray-300 mb-2 block">Jugadores y Pagos</label>
                            <PlayerPaymentList
                                players={editPlayers}
                                items={editItems}
                                priceTemplates={clubConfig.priceTemplates || []}
                                onPlayersChange={setEditPlayers}
                            />
                        </div>

                        {/* Extras */}
                        <div className="border-t border-gray-800 pt-4">
                            <label className="text-sm font-medium text-gray-300 mb-2 block">Extras / Tienda</label>
                            <ExtrasSelector
                                availableExtras={clubConfig.extras || []}
                                items={editItems}
                                players={editPlayers}
                                onItemsChange={setEditItems}
                            />
                        </div>

                        {/* Notas */}
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Notas</label>
                            <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={3}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Footer Edición */}
                        <div className="pt-6 border-t border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-gray-900 pb-2">
                            <button
                                onClick={() => setMode('view')}
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={processing}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2"
                            >
                                {processing ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
