"use client";

import { useState, useEffect } from "react";
import { X, User, Search } from "lucide-react";
import type { Court, ReservationType } from "@padel/core";
import {
    ClubConfig,
    ReservationPlayer,
    ReservationItem
} from "../../hooks/userReservations";
import { PlayerPaymentList } from "./PlayerPaymentList";
import { ExtrasSelector } from "./ExtrasSelector";

interface SearchUser {
    id: string;
    display_name: string;
    email: string;
    avatar_url?: string;
}

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
    onSearchUser: (query: string) => Promise<{ data: SearchUser[] | null; error: string | null }>;
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
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
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

    // --- NUEVA LÓGICA DE SINCRONIZACIÓN DE PRECIOS ---

    const handlePlayersChange = (newPlayers: ReservationPlayer[]) => {
        setPlayers(newPlayers);
        // El precio total es la suma de los precios individuales de la pista
        const total = newPlayers.reduce((sum, p) => sum + (p.courtPrice || 0), 0);
        setPrice(total);
    };

    const handleTotalManualChange = (newTotal: number) => {
        setPrice(newTotal);
        // Redistribuir el total entre los jugadores registrados
        if (players.length > 0) {
            const perPlayer = Number((newTotal / players.length).toFixed(2));
            setPlayers(players.map(p => ({ ...p, courtPrice: perPlayer })));
        }
    };

    const applyPriceTemplate = (tplPrice: number) => {
        // Multiplicar el precio de la plantilla por el número de jugadores 
        // para obtener el precio total de la pista (según feedback del usuario)
        const total = tplPrice * players.length;
        setPrice(total);
        setPlayers(players.map(p => ({ ...p, courtPrice: tplPrice })));
    };

    const selectUser = (user: SearchUser) => {
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
            type: (activeTab === 'maintenance' ? 'maintenance' : 'booking') as ReservationType,
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



    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 border-t md:border border-gray-700/50 rounded-t-3xl md:rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-2xl h-[92dvh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 md:duration-300 ring-1 ring-white/5">

                {/* DRAG HANDLE (Mobile) */}
                <div className="flex justify-center pt-2 md:hidden">
                    <div className="w-12 h-1.5 bg-gray-700/50 rounded-full" />
                </div>

                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                            Nueva {activeTab === 'reservation' ? 'Reserva' : 'Bloqueo'}
                        </h2>
                        <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-3 mt-1 font-bold uppercase tracking-widest leading-none">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {slot.court.name}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="flex items-center gap-1.5 text-white/80">
                                {slot.time.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="flex items-center gap-1.5 text-green-400">
                                {formatTime(slot.time)}
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

                {/* BUTTONS TIPO (TABS) */}
                <div className="flex p-3 gap-3 bg-gray-950/20 shrink-0 border-b border-gray-800/50">
                    <button
                        onClick={() => setActiveTab('reservation')}
                        className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all tracking-widest uppercase ${activeTab === 'reservation'
                            ? 'bg-linear-to-r from-green-600 to-green-700 text-white shadow-[0_8px_20px_-6px_rgba(22,163,74,0.5)] ring-1 ring-white/20'
                            : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300 border border-transparent'
                            }`}
                    >
                        RESERVA ESTÁNDAR
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all tracking-widest uppercase ${activeTab === 'maintenance'
                            ? 'bg-linear-to-r from-red-600 to-red-700 text-white shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] ring-1 ring-white/20'
                            : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300 border border-transparent'
                            }`}
                    >
                        BLOQUEO MANUAL
                    </button>
                </div>

                {/* BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 overscroll-contain custom-scrollbar bg-linear-to-b from-gray-900 to-gray-950">

                    {activeTab === 'reservation' && (
                        <>
                            {/* SELECCIÓN DE CLIENTE */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente Principal</label>
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
                                                const newPlayers = [...players];
                                                if (newPlayers[0]) newPlayers[0] = { ...newPlayers[0], name: e.target.value };
                                                setPlayers(newPlayers);
                                            }}
                                            placeholder="Introduce nombre del cliente..."
                                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white font-medium focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all shadow-inner placeholder:text-gray-700"
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
                                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white font-medium focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-inner placeholder:text-gray-700"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {/* Resultados de búsqueda */}
                                        {searchResults.length > 0 && !selectedUser && (
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-30 max-h-64 overflow-y-auto overflow-x-hidden p-2 ring-1 ring-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => selectUser(user)}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl flex items-center gap-4 transition-all group/item"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-blue-800 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg group-hover/item:scale-105 transition-transform">
                                                            {user.display_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-200 truncate group-hover/item:text-white">{user.display_name}</p>
                                                            <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest font-bold">{user.email}</p>
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

                            {/* PRECIO */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none block">Tarifa Aplicada (Total Pista)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-black group-focus-within:text-green-500 transition-colors">€</span>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => handleTotalManualChange(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-10 pr-4 text-white font-mono font-black text-lg focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                        {clubConfig.priceTemplates?.map((tpl, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => applyPriceTemplate(tpl.price)}
                                                className={`px-4 py-4 rounded-2xl text-[11px] font-black transition-all shrink-0 flex flex-col items-center justify-center min-w-[80px] border
                                                    ${(price / (players.length || 1)) === tpl.price
                                                        ? 'bg-green-600/10 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                                                        : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                                    }`}
                                            >
                                                <span className="text-lg leading-none mb-1">{tpl.price}€</span>
                                                <span className="opacity-50 text-[8px] uppercase">{tpl.label || 'BASE'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* JUGADORES */}
                            <div className="space-y-4 pt-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none block">Distribución de Jugadores</label>
                                <div className="bg-gray-950/40 rounded-3xl border border-gray-800/80 p-2 shadow-inner">
                                    <PlayerPaymentList
                                        players={players}
                                        items={items}
                                        priceTemplates={clubConfig.priceTemplates || []}
                                        onPlayersChange={handlePlayersChange}
                                        onSearchUser={onSearchUser}
                                        onPayAll={() => {
                                            setPlayers(players.map(p => ({ ...p, paid: true })));
                                        }}
                                    />
                                </div>
                            </div>

                            {/* EXTRAS */}
                            <div className="space-y-4 pt-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none block">Complementos y Alquileres</label>
                                <div className="bg-gray-950/40 rounded-3xl border border-gray-800/80 p-4 shadow-inner">
                                    <ExtrasSelector
                                        availableExtras={clubConfig.extras || []}
                                        items={items}
                                        players={players}
                                        onItemsChange={setItems}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* NOTAS */}
                    <div className="space-y-4 pt-4 pb-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none block">Observaciones Internas</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-5 text-sm text-gray-200 focus:border-gray-600 outline-none resize-none transition-all shadow-inner placeholder:text-gray-700 font-medium"
                            placeholder="Añade detalles relevantes sobre esta reserva..."
                        />
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-8 bg-gray-900 border-t border-gray-800 shrink-0 flex flex-col md:flex-row gap-4">
                    <button
                        onClick={onClose}
                        className="order-2 md:order-1 flex-1 md:flex-none px-8 py-4 text-xs font-black text-gray-500 hover:text-white rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-gray-800"
                        disabled={processing}
                    >
                        DESCARTAR
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing}
                        className={`order-1 md:order-2 flex-2 md:flex-none px-10 py-4 text-xs font-black text-white rounded-2xl shadow-2xl transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 ring-1 ring-white/10 tracking-widest uppercase
                            ${activeTab === 'reservation'
                                ? 'bg-linear-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 shadow-green-900/40'
                                : 'bg-linear-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 shadow-red-900/40'
                            }`}
                    >
                        {processing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                PROCESANDO
                            </>
                        ) : (
                            <>
                                {activeTab === 'reservation' ? 'CONFIRMAR RESERVA' : 'CONFIRMAR BLOQUEO'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
