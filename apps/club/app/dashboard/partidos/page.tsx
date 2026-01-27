"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Match } from "@padel/core";
import { Calendar, MapPin, CheckCircle, Clock } from "lucide-react";
import MatchResultModal from "../../../components/matches/MatchResultModal";

export default function PartidosPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const supabase = createBrowserClient();

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        // 1. Obtener ID del club del usuario
        const { data: members } = await supabase
            .from('club_members')
            .select('club_id')
            .eq('user_id', user.id)
            .limit(1);

        if (!members || members.length === 0 || !members[0]) {
            setLoading(false);
            return;
        }

        const clubId = members[0].club_id;

        // 2. Obtener Partidos del Club
        let query = supabase
            .from('matches')
            .select('*')
            .eq('club_id', clubId)
            .order('played_at', { ascending: false });

        if (filter === 'pending') {
            query = query.neq('status', 'confirmed');
        } else if (filter === 'confirmed') {
            query = query.eq('status', 'confirmed');
        }

        const { data, error } = await query;

        if (!error && data) {
            setMatches(data as Match[]);
        }
        setLoading(false);
    }, [filter, supabase]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-full border border-green-800"><CheckCircle size={12} /> CONFIRMADO</span>;
            case 'pending_confirmation':
                return <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-full border border-yellow-800"><Clock size={12} /> PENDIENTE</span>;
            default:
                return <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">BORRADOR</span>;
        }
    };

    if (loading && matches.length === 0) {
        return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div></div>;
    }

    return (
        <div className="space-y-6 text-white pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Partidos</h1>
                    <p className="text-gray-400 text-sm">Validar resultados y gestionar competición</p>
                </div>

                <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700 self-start">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'pending' ? 'bg-yellow-900/40 text-yellow-400 shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('confirmed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'confirmed' ? 'bg-green-900/40 text-green-400 shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Confirmados
                    </button>
                </div>
            </div>

            {matches.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
                    <div className="inline-flex p-4 rounded-full bg-gray-900 mb-4 text-gray-500">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No hay partidos encontrados</h3>
                    <p className="text-gray-400 text-sm">No se han encontrado partidos con los filtros actuales.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {matches.map(match => (
                        <div
                            key={match.id}
                            onClick={() => setSelectedMatch(match)}
                            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition cursor-pointer group hover:border-gray-600"
                        >
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

                                {/* Info Hora y Fecha */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className="bg-gray-900 p-3 rounded-lg text-center min-w-[60px] border border-gray-700">
                                        <div className="text-xs text-gray-500 font-bold uppercase">
                                            {new Date(match.played_at).toLocaleDateString([], { month: 'short' })}
                                        </div>
                                        <div className="text-xl font-bold text-white leading-none mt-1">
                                            {new Date(match.played_at).getDate()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-white font-medium">
                                            <Clock size={14} className="text-green-500" />
                                            {new Date(match.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <MapPin size={12} />
                                            {match.location || 'Pista sin asignar'}
                                        </div>
                                    </div>
                                </div>

                                {/* Jugadores y Resultado */}
                                <div className="flex-1 w-full md:w-auto">
                                    <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                        <div className="flex flex-col items-start w-[40%]">
                                            <span className="text-xs text-gray-500 font-bold uppercase mb-1">Local</span>
                                            <span className="text-sm font-medium text-white line-clamp-1">{match.partner_name || "Sin nombre"}</span>
                                        </div>

                                        <div className="font-mono font-bold text-lg text-white px-4">
                                            {match.status === 'confirmed' || (match.set1_us !== null) ? (
                                                <div className="flex gap-2">
                                                    <span>{match.set1_us ?? '-'}-{match.set1_them ?? '-'}</span>
                                                    {match.set2_us !== null && <span className="text-gray-500">/</span>}
                                                    {match.set2_us !== null && <span>{match.set2_us ?? '-'}-{match.set2_them ?? '-'}</span>}
                                                    {match.set3_us !== null && <span className="text-gray-500">/</span>}
                                                    {match.set3_us !== null && <span>{match.set3_us ?? '-'}-{match.set3_them ?? '-'}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 text-sm">VS</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end w-[40%]">
                                            <span className="text-xs text-gray-500 font-bold uppercase mb-1">Visitante</span>
                                            <span className="text-sm font-medium text-white line-clamp-1 text-right">{match.opponent1_name || "Sin nombre"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Estado */}
                                <div className="flex md:flex-col items-center gap-3 md:items-end min-w-[120px]">
                                    {getStatusBadge(match.status)}
                                    <span className="text-xs text-blue-400 font-medium group-hover:underline">
                                        Editar Resultado →
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedMatch && (
                <MatchResultModal
                    match={selectedMatch}
                    isOpen={!!selectedMatch}
                    onClose={() => setSelectedMatch(null)}
                    onUpdate={fetchMatches}
                />
            )}
        </div>
    );
}
