"use client";

import { useState } from "react";
import { X, Search, UserPlus, User, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PlayerSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (player: { id: string, name: string }) => void;
    excludeIds?: string[];
}

export default function PlayerSearchModal({ isOpen, onClose, onSelect, excludeIds = [] }: PlayerSearchModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || query.length < 3) return;

        setLoading(true);
        setError(null);

        try {
            // Nota: usamos la función RPC existente que busca por email exacto o parcial según la implementación
            // En este caso, la migración 20240123000001_search_players.sql indica get_player_by_email(email_input)
            const { data, error: searchError } = await supabase.rpc('get_player_by_email', {
                email_input: query.trim()
            });

            if (searchError) throw searchError;

            // Filtrar ya incluidos
            const filtered = (data || []).filter((p: any) => !excludeIds.includes(p.id));
            setResults(filtered);

            if (filtered.length === 0) {
                setError("No se encontraron jugadores con ese email.");
            }
        } catch (err: any) {
            console.error("Search error:", err);
            setError("Error al buscar jugadores.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Buscar Jugador</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors" size={20} />
                        <input
                            type="email"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Introduce el email del amigo..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-700 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all"
                            autoFocus
                        />
                    </form>

                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="py-10 flex flex-col items-center justify-center gap-3 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                <Loader2 className="animate-spin text-green-500" size={32} />
                                Buscando...
                            </div>
                        ) : error ? (
                            <div className="py-10 flex flex-col items-center justify-center gap-3 text-red-400 text-center font-bold italic">
                                <AlertCircle size={32} />
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : results.length > 0 ? (
                            results.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => onSelect({ id: player.id, name: player.display_name })}
                                    className="w-full bg-gray-950/50 hover:bg-gray-800 border border-gray-800/50 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center text-green-500 font-black shadow-lg">
                                            {player.display_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-white uppercase italic tracking-tight">{player.display_name}</p>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{player.email || 'Jugador Registrado'}</p>
                                        </div>
                                    </div>
                                    <UserPlus className="text-gray-600 group-hover:text-green-500 transition-colors" size={20} />
                                </button>
                            ))
                        ) : query.length >= 3 ? (
                            <div className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest text-[10px] italic">
                                Pulsa Enter para buscar
                            </div>
                        ) : (
                            <div className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest text-[10px] italic">
                                Escribe al menos 3 letras para buscar
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 pt-0">
                    <p className="text-[10px] text-gray-600 font-medium italic text-center">
                        Solo puedes añadir jugadores con cuenta en la plataforma.
                    </p>
                </div>
            </div>
        </div>
    );
}
