"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Match } from "@padel/core";
import { Calendar, MapPin, CheckCircle, Clock, Trophy, Filter, ChevronRight, LayoutGrid, Info } from "lucide-react";
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
                return (
                    <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                        <CheckCircle size={12} className="text-green-500" />
                        <span>Confirmado</span>
                    </div>
                );
            case 'pending_confirmation':
                return (
                    <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                        <Clock size={12} className="text-yellow-500" />
                        <span>Pendiente</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <Info size={12} />
                        <span>Borrador</span>
                    </div>
                );
        }
    };

    if (loading && matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                    <Trophy size={20} className="absolute inset-0 m-auto text-green-500/40" />
                </div>
                <p className="text-gray-400 font-medium animate-pulse italic">Sincronizando partidos...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 text-white px-4 md:px-0">

            {/* Header Premium */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 to-green-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-gray-900/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                                <Trophy size={28} className="text-yellow-400" />
                            </div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500 tracking-tighter italic">
                                GESTIÓN DE PARTIDOS
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm md:text-base font-medium pl-1 flex items-center gap-2">
                            Valida resultados oficiales y mantén el Ranking ELO actualizado
                        </p>
                    </div>

                    {/* Filtros Estilo Tab */}
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 self-start md:self-center shadow-inner">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${filter === 'all' ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/20' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <LayoutGrid size={14} />
                            <span>Todos</span>
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${filter === 'pending' ? 'bg-yellow-500/20 text-yellow-400 shadow-lg ring-1 ring-yellow-500/30' : 'text-gray-500 hover:text-yellow-400/60'}`}
                        >
                            <Clock size={14} />
                            <span>Pendientes</span>
                        </button>
                        <button
                            onClick={() => setFilter('confirmed')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${filter === 'confirmed' ? 'bg-green-500/20 text-green-400 shadow-lg ring-1 ring-green-500/30' : 'text-gray-500 hover:text-green-400/60'}`}
                        >
                            <CheckCircle size={14} />
                            <span>Oficiales</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Listado de Partidos */}
            <div className="grid gap-6">
                {matches.map(match => (
                    <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className="group relative"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 pr-8 flex flex-col lg:flex-row items-center gap-8 cursor-pointer transition-all duration-300 group-hover:border-white/20 group-hover:-translate-y-1 shadow-xl">

                            {/* Fecha y Hora Lateral */}
                            <div className="flex lg:flex-col items-center justify-center gap-3 lg:gap-1 min-w-[100px] py-2 border-r lg:border-r-0 lg:border-b border-white/5 px-4">
                                <span className="text-xs font-black text-green-500/80 uppercase tracking-[0.2em]">
                                    {new Date(match.played_at).toLocaleDateString([], { month: 'short' })}
                                </span>
                                <span className="text-3xl font-black text-white italic leading-none">
                                    {new Date(match.played_at).getDate()}
                                </span>
                                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold mt-1">
                                    <Clock size={12} />
                                    {new Date(match.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {/* Marcador Central */}
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between gap-4 md:gap-12">
                                    {/* Local */}
                                    <div className="flex-1 flex flex-col items-end text-right">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 italic">Equipo A</span>
                                        <h4 className="text-lg font-bold text-white leading-tight group-hover:text-green-400 transition-colors">
                                            {match.partner_name || "Sin asignar"}
                                        </h4>
                                    </div>

                                    {/* Score Display */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="bg-black/60 px-6 py-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-5 min-w-[140px] justify-center relative overflow-hidden group-hover:border-green-500/30 transition-all">
                                            {match.status === 'confirmed' || (match.set1_us !== null) ? (
                                                <div className="flex items-center gap-4 font-black italic text-2xl tracking-tighter">
                                                    <span className="text-white">{match.set1_us ?? 0}-{match.set1_them ?? 0}</span>
                                                    {match.set2_us !== null && <span className="text-gray-700 font-normal leading-none">/</span>}
                                                    {match.set2_us !== null && <span className="text-gray-400 text-xl">{match.set2_us}-{match.set2_them}</span>}
                                                    {match.set3_us !== null && <span className="text-gray-700 font-normal leading-none">/</span>}
                                                    {match.set3_us !== null && <span className="text-gray-500 text-lg">{match.set3_us}-{match.set3_them}</span>}
                                                </div>
                                            ) : (
                                                <div className="text-gray-600 font-black italic text-xl tracking-[0.3em]">VS</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                            <MapPin size={10} className="text-green-500" />
                                            {match.location || "Pista Principal"}
                                        </div>
                                    </div>

                                    {/* Visitante */}
                                    <div className="flex-1 flex flex-col items-start text-left">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 italic">Equipo B</span>
                                        <h4 className="text-lg font-bold text-white leading-tight group-hover:text-red-400 transition-colors">
                                            {match.opponent1_name || "Rival pend."}
                                        </h4>
                                    </div>
                                </div>
                            </div>

                            {/* Estado y Acción */}
                            <div className="flex flex-row lg:flex-col items-center md:items-end justify-between lg:justify-center gap-4 min-w-[160px] pl-4 lg:pl-0 border-l lg:border-l-0 border-white/5">
                                {getStatusBadge(match.status)}
                                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-blue-400 hover:text-white border border-transparent hover:border-blue-500/30">
                                    Gestionar
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {matches.length === 0 && !loading && (
                <div className="text-center py-24 px-8 bg-gray-900/40 backdrop-blur-sm rounded-[3rem] border border-dashed border-white/10 space-y-6">
                    <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-2xl rotate-3">
                        <Calendar size={40} className="text-gray-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Cero Resultados</h3>
                        <p className="text-gray-500 max-w-sm mx-auto font-medium">
                            Aún no hay registros de partidos en tu club para este filtro.
                            Los partidos aparecerán aquí una vez que los jugadores finalicen sus reservas.
                        </p>
                    </div>
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
