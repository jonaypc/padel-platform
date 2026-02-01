
import * as React from 'react';
import type { ReservationPlayer, ReservationItem } from "../../hooks/userReservations";
import { Search, User, X } from 'lucide-react';

interface PlayerPaymentListProps {
    players: ReservationPlayer[];
    items: ReservationItem[];
    priceTemplates: { label: string; price: number }[];
    onPlayersChange: (players: ReservationPlayer[]) => void;
    onPayAll?: () => void;
    onSearchUser?: (query: string) => Promise<{ data: any[] | null; error: string | null }>;
    showTemplates?: boolean;
    compact?: boolean;
}

export function PlayerPaymentList({
    players,
    items,
    priceTemplates,
    onPlayersChange,
    onPayAll,
    onSearchUser,
    showTemplates = true,
    compact = false,
}: PlayerPaymentListProps) {
    // Estado para búsqueda
    const [searchingIndex, setSearchingIndex] = React.useState<number | null>(null);
    const [searchResults, setSearchResults] = React.useState<any[]>([]);
    const [query, setQuery] = React.useState("");

    const handleSearch = async (idx: number, q: string) => {
        setSearchingIndex(idx);
        setQuery(q);
        updatePlayer(idx, { name: q }); // Actualizar nombre visualmente mientras busca

        if (q.length < 3 || !onSearchUser) {
            setSearchResults([]);
            return;
        }

        const { data } = await onSearchUser(q);
        setSearchResults(data || []);
    };

    const selectUser = (idx: number, user: any) => {
        updatePlayer(idx, {
            name: user.display_name,
            id: user.id,
            email: user.email
        });
        setSearchingIndex(null);
        setSearchResults([]);
        setQuery("");
    };

    const updatePlayer = (index: number, updates: Partial<ReservationPlayer>) => {
        const newPlayers = [...players];
        if (newPlayers[index]) {
            newPlayers[index] = { ...newPlayers[index], ...updates };
            onPlayersChange(newPlayers);
        }
    };

    const calculatePlayerDebt = (playerIndex: number) => {
        const player = players[playerIndex];
        if (!player) return 0;

        const courtShare = player.courtPrice || 0;

        const itemsShare = items.reduce((acc, item) => {
            const itemTotal = item.price * item.quantity;
            const assignees = item.assignedTo || [];

            if (assignees.length === 0) {
                return acc + (itemTotal / (players.length || 1));
            }

            if (assignees.includes(playerIndex.toString())) {
                return acc + (itemTotal / assignees.length);
            }

            return acc;
        }, 0);

        return courtShare + itemsShare;
    };

    const applyTemplateToAll = (price: number) => {
        const newPlayers = players.map(p => ({ ...p, courtPrice: price }));
        onPlayersChange(newPlayers);
    };

    return (
        <div className="space-y-2">
            {/* Header con templates y cobrar todo */}
            {showTemplates && (priceTemplates.length > 0 || onPayAll) && (
                <div className="flex justify-between items-center flex-wrap gap-2">
                    {priceTemplates.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {priceTemplates.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => applyTemplateToAll(t.price)}
                                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-[10px] text-gray-300 transition"
                                >
                                    {t.label} ({t.price}€)
                                </button>
                            ))}
                        </div>
                    )}
                    {onPayAll && (
                        <button
                            onClick={onPayAll}
                            className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded border border-green-900 hover:bg-green-900/60 transition font-bold"
                        >
                            COBRAR TODO
                        </button>
                    )}
                </div>
            )}

            {/* Lista de jugadores */}
            <div className="space-y-1.5">
                {players.map((player, idx) => {
                    const debt = calculatePlayerDebt(idx);

                    return (
                        <div key={idx} className="flex gap-2 items-center">
                            {/* Selector de template individual */}
                            {showTemplates && priceTemplates.length > 0 && (
                                <select
                                    className="w-5 h-7 bg-gray-950 border border-gray-800 rounded-lg text-[10px] text-gray-500 outline-none p-0 text-center hover:border-gray-600 hover:text-gray-300 transition-all cursor-pointer"
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            updatePlayer(idx, { courtPrice: val });
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="" disabled>€</option>
                                    {priceTemplates.map((t, i) => (
                                        <option key={i} value={t.price}>{t.label} ({t.price}€)</option>
                                    ))}
                                </select>
                            )}

                            {/* Nombre */}
                            {/* Input Nombre con Búsqueda */}
                            <div className="relative flex-1">
                                <div className={`flex items-center bg-gray-${compact ? '900' : '800'} border border-gray-${compact ? '700' : '600'} rounded-${compact ? 'lg' : 'md'} pr-2 focus-within:border-green-500`}>
                                    {player.id ? (
                                        <div className="flex items-center gap-1 pl-2 py-1.5 flex-1 min-w-0">
                                            <User size={12} className="text-blue-400 shrink-0" />
                                            <span className="text-white text-xs truncate font-medium">{player.name}</span>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder={`Jugador ${idx + 1}`}
                                            value={player.name}
                                            onChange={(e) => handleSearch(idx, e.target.value)}
                                            onFocus={() => {
                                                if (player.name) handleSearch(idx, player.name);
                                            }}
                                            className="w-full bg-transparent text-white text-xs px-2 py-1.5 outline-none"
                                        />
                                    )}

                                    {player.id && (
                                        <button
                                            onClick={() => updatePlayer(idx, { id: undefined, email: undefined, name: '' })}
                                            className="text-gray-500 hover:text-white"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown de resultados */}
                                {searchingIndex === idx && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-32 overflow-y-auto">
                                        {searchResults.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => selectUser(idx, user)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2 transition"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-white">
                                                    {user.display_name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-xs text-gray-200 truncate">{user.display_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Precio individual */}
                            {showTemplates && (
                                <div className="relative w-14">
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={player.courtPrice || 0}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updatePlayer(idx, { courtPrice: isNaN(val) ? 0 : val });
                                        }}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-1 py-1.5 text-right text-xs text-blue-300 focus:border-blue-500 outline-none"
                                        title="Precio Pista Individual"
                                    />
                                </div>
                            )}

                            {/* Deuda calculada */}
                            {showTemplates && (
                                <span className={`text-xs font-mono w-14 text-right ${debt > 0 ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                                    {debt.toFixed(2)}€
                                </span>
                            )}

                            {/* Botón pago */}
                            <button
                                onClick={() => updatePlayer(idx, { paid: !player.paid })}
                                className={`px-${compact ? '3' : '2'} py-${compact ? '2' : '1.5'} rounded-${compact ? 'lg' : 'md'} text-[10px] font-bold transition ${compact ? 'w-auto' : 'w-16'} text-center
                                    ${player.paid
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                            >
                                {player.paid ? 'PAGADO' : 'PENDIENTE'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {compact && (
                <p className="text-[10px] text-gray-500 italic ml-1">
                    El importe se dividirá entre los jugadores marcados.
                </p>
            )}
        </div>
    );
}