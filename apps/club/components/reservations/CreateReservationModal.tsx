"use client";

import { useState, useEffect } from "react";
import { X, User, Search, Calendar, Clock } from "lucide-react";
import type { Court, ReservationType } from "@padel/core";
import {
    ClubConfig,
    ReservationPlayer,
    ReservationItem
} from "../../hooks/userReservations";
import { PlayerPaymentList } from "./PlayerPaymentList";
import { ExtrasSelector } from "./ExtrasSelector";

// Interface para datos de creación
export interface CreateReservationData {
    courtId: string;
    startTime: Date;
    userId?: string | null;
    type: ReservationType;
    price: number;
    notes?: string;
    players?: ReservationPlayer[];
    items?: ReservationItem[];
}

interface CreateReservationModalProps {
    slot: { court: Court, time: Date } | null;
    clubConfig: ClubConfig;
    onClose: () => void;
    onConfirm: (data: CreateReservationData) => Promise<{ error: string | null }>;
    onSearchUser: (query: string) => Promise<{ data: any[] | null; error: string | null }>;
    processing: boolean;
}

export function CreateReservationModal({
    slot,
    clubConfig,
    onClose,
    onConfirm,
    onSearchUser,
    processing
}: CreateReservationModalProps) {
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState<'reservation' | 'maintenance'>('reservation');

    // Si no hay slot, null al final

    const [customerType, setCustomerType] = useState<'occasional' | 'registered'>('occasional');

    // Datos básicos del formulario
    const [customerName, setCustomerName] = useState("");
    const [selectedUser, setSelectedUser] = useState<{ id: string, name: string } | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [price, setPrice] = useState(0);
    const [notes, setNotes] = useState("");

    // Jugadores y Extras
    const [players, setPlayers] = useState<ReservationPlayer[]>([]);
    const [items, setItems] = useState<ReservationItem[]>([]);

    // --- EFECTOS ---

    // Inicializar precio y jugadores al abrir
    useEffect(() => {
        if (slot && clubConfig) {
            // Precio por defecto de la pista o del club
            const initialPrice = slot.court.price || clubConfig.defaultPrice;
            setPrice(initialPrice);

            // Inicializar 4 jugadores vacíos por defecto para pádel
            setPlayers(Array(4).fill(null).map(() => ({
                name: "",
                paid: false,
                amount: 0,
                courtPrice: initialPrice / 4 // Dividir precio equitativamente inicialmente
            })));
        }
    }, [slot, clubConfig]);

    // Calcular precio total de jugadores para actualizar el precio global si cambia (opcional, 
    // pero aquí el precio global manda sobre los jugadores, o viceversa. 
    // Mantendremos que price es el "total pista" y los jugadores se reparten eso).

    // --- HANDLERS ---

    if (!slot) return null;

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
        setCustomerName(user.display_name); // Para consistencia visual
        setSearchResults([]);
        setUserSearchQuery("");

        // Poner al usuario como primer jugador
        const newPlayers = [...players];
        if (newPlayers[0]) {
            newPlayers[0] = { ...newPlayers[0], name: user.display_name };
            setPlayers(newPlayers);
        }
    };

    const handleSubmit = async () => {
        if (!slot) return;

        // Validaciones básicas
        if (activeTab === 'reservation') {
            if (customerType === 'occasional' && !customerName.trim() && !players.some(p => p.name.trim())) {
                // Si es ocasional, al menos un nombre
                // Usamos el primer jugador como referencia si customerName está vacío
            }
        }

        const reservationData: CreateReservationData = {
            courtId: slot.court.id,
            startTime: slot.time,
            type: (activeTab === 'maintenance' ? 'maintenance' : 'match') as ReservationType,
            price: activeTab === 'maintenance' ? 0 : price,
            notes: notes,
            items: items,
            // Si es mantenimiento no hay jugadores
            players: activeTab === 'maintenance' ? [] : players,
            userId: customerType === 'registered' ? selectedUser?.id : null
        };

        const res = await onConfirm(reservationData);
        if (res?.error) {
            alert("Error al crear la reserva: " + res.error);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getEndTime = (start: Date) => {
        if (!clubConfig) return start;
        const end = new Date(start);
        end.setMinutes(start.getMinutes() + clubConfig.duration);
        return end;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Nueva {activeTab === 'reservation' ? 'Reserva' : 'Bloqueo'}
                        </h2>
                        <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                            <span className="bg-gray-800 px-2 py-0.5 rounded text-white border border-gray-700">
                                {slot.court.name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {slot.time.toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1 text-green-400">
                                <Clock size={14} />
                                {formatTime(slot.time)} - {formatTime(getEndTime(slot.time))}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* TABS TIPO */}
                <div className="flex p-2 gap-2 bg-gray-800/50">
                    <button
                        onClick={() => setActiveTab('reservation')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'reservation'
                            ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                    >
                        RESERVA
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'maintenance'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                    >
                        BLOQUEO / MANTENIMIENTO
                    </button>
                </div>

                {/* BODY */}
                <div className="p-4 space-y-6 flex-1">

                    {activeTab === 'reservation' && (
                        <>
                            {/* SELECCIÓN DE CLIENTE */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-300">Cliente Principal</label>
                                    <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                                        <button
                                            onClick={() => setCustomerType('occasional')}
                                            className={`px-3 py-1 text-xs rounded-md transition ${customerType === 'occasional' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                                        >
                                            Ocasional
                                        </button>
                                        <button
                                            onClick={() => setCustomerType('registered')}
                                            className={`px-3 py-1 text-xs rounded-md transition ${customerType === 'registered' ? 'bg-blue-900/40 text-blue-400 ring-1 ring-blue-500/50' : 'text-gray-400'}`}
                                        >
                                            Registrado
                                        </button>
                                    </div>
                                </div>

                                {customerType === 'occasional' ? (
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => {
                                                setCustomerName(e.target.value);
                                                // Actualizar primer jugador también
                                                const newPlayers = [...players];
                                                if (newPlayers[0]) newPlayers[0] = { ...newPlayers[0], name: e.target.value };
                                                setPlayers(newPlayers);
                                            }}
                                            placeholder="Nombre del cliente..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            value={selectedUser ? selectedUser.name : userSearchQuery}
                                            onChange={(e) => {
                                                if (selectedUser) setSelectedUser(null);
                                                handleSearchUser(e.target.value);
                                            }}
                                            placeholder="Buscar usuario..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                        />
                                        {/* Resultados de búsqueda */}
                                        {searchResults.length > 0 && !selectedUser && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => selectUser(user)}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 transition"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                                                            {user.display_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <span className="text-sm text-gray-200">{user.display_name}</span>
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
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PRECIO */}
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-1 block">Precio Pista</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-8 pr-4 text-white font-mono focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    {/* Templates de precio */}
                                    {clubConfig.priceTemplates?.map((tpl, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPrice(tpl.price)}
                                            className="px-3 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition"
                                        >
                                            {tpl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* JUGADORES */}
                            <div className="border-t border-gray-800 pt-4">
                                <label className="text-sm font-medium text-gray-300 mb-2 block">Jugadores y Pagos</label>
                                <PlayerPaymentList
                                    players={players}
                                    items={items}
                                    priceTemplates={clubConfig.priceTemplates || []}
                                    onPlayersChange={setPlayers}
                                    onSearchUser={onSearchUser}
                                    onPayAll={() => {
                                        setPlayers(players.map(p => ({ ...p, paid: true })));
                                    }}
                                />
                            </div>

                            {/* EXTRAS */}
                            <div className="border-t border-gray-800 pt-4">
                                <label className="text-sm font-medium text-gray-300 mb-2 block">Extras / Tienda</label>
                                <ExtrasSelector
                                    availableExtras={clubConfig.extras || []}
                                    items={items}
                                    players={players}
                                    onItemsChange={setItems}
                                />
                            </div>
                        </>
                    )}

                    {/* NOTAS */}
                    <div className={activeTab === 'reservation' ? "border-t border-gray-800 pt-4" : ""}>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Notas internas</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none resize-none"
                            placeholder="Notas visibles solo para el club..."
                        />
                    </div>

                </div>

                {/* FOOTER */}
                <div className="p-4 bg-gray-900 border-t border-gray-800 sticky bottom-0 z-10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                        disabled={processing}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing}
                        className={`px-6 py-2 text-sm font-bold text-white rounded-lg shadow-lg transform active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2
                            ${activeTab === 'reservation'
                                ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                                : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                            }`}
                    >
                        {processing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                {activeTab === 'reservation' ? 'Crear Reserva' : 'Bloquear Pista'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
