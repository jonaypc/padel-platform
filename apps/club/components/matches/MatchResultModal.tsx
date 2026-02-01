"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Trophy, Check, Loader2, Info } from "lucide-react";
import { Match } from "@padel/core";
import { createBrowserClient } from "@padel/supabase";

interface MatchResultModalProps {
    match: Match;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function MatchResultModal({ match, isOpen, onClose, onUpdate }: MatchResultModalProps) {
    const [loading, setLoading] = useState(false);
    const [set1Us, setSet1Us] = useState<string>(match.set1_us?.toString() || "");
    const [set1Them, setSet1Them] = useState<string>(match.set1_them?.toString() || "");
    const [set2Us, setSet2Us] = useState<string>(match.set2_us?.toString() || "");
    const [set2Them, setSet2Them] = useState<string>(match.set2_them?.toString() || "");
    const [set3Us, setSet3Us] = useState<string>(match.set3_us?.toString() || "");
    const [set3Them, setSet3Them] = useState<string>(match.set3_them?.toString() || "");
    const [confirmStatus, setConfirmStatus] = useState<boolean>(match.status === 'confirmed');
    const [error, setError] = useState<string | null>(null);

    const supabase = createBrowserClient();

    if (!isOpen) return null;

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        try {
            const s1u = parseInt(set1Us) || 0;
            const s1t = parseInt(set1Them) || 0;
            const s2u = parseInt(set2Us) || 0;
            const s2t = parseInt(set2Them) || 0;
            const s3u = set3Us ? parseInt(set3Us) : null;
            const s3t = set3Them ? parseInt(set3Them) : null;

            if (confirmStatus && (s1u === 0 && s1t === 0)) {
                throw new Error("No se puede confirmar un partido sin resultado en el primer set.");
            }

            const updates: Partial<Match> = {
                set1_us: s1u,
                set1_them: s1t,
                set2_us: s2u,
                set2_them: s2t,
                set3_us: s3u,
                set3_them: s3t,
                status: (confirmStatus ? 'confirmed' : 'pending_confirmation') as any
            };

            const { error: updateError } = await supabase
                .from('matches')
                .update(updates)
                .eq('id', match.id);

            if (updateError) throw updateError;

            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al guardar resultado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className="relative bg-gray-900/90 border border-white/10 w-full max-w-xl shadow-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Decorative TOP Glow */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>

                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/5">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white flex items-center gap-3 italic tracking-tight">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Trophy size={20} className="text-yellow-400" />
                            </div>
                            REGISTRAR MARCADOR
                        </h3>
                        <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">
                            VALIDACIÓN DE RESULTADO OFICIAL
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">

                    {/* ENFRENTAMIENTO VISUAL */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-red-500/20 rounded-2xl blur-lg opacity-20"></div>
                        <div className="relative flex items-center justify-between bg-black/40 border border-white/5 p-6 rounded-2xl shadow-inner">
                            <div className="flex-1 text-center space-y-2">
                                <span className="text-[10px] font-black text-green-500/80 uppercase tracking-widest italic">Local</span>
                                <p className="text-sm font-black text-white leading-tight uppercase truncate px-2">{match.partner_name || "Equipo A"}</p>
                            </div>

                            <div className="px-6">
                                <div className="text-xs font-black text-gray-600 italic tracking-[0.3em]">VS</div>
                            </div>

                            <div className="flex-1 text-center space-y-2">
                                <span className="text-[10px] font-black text-red-500/80 uppercase tracking-widest italic">Visitante</span>
                                <p className="text-sm font-black text-white leading-tight uppercase truncate px-2">{match.opponent1_name || "Equipo B"}</p>
                            </div>
                        </div>
                    </div>

                    {/* SCORE INPUTS */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'set1', label: '1er SET', us: set1Us, setUs: set1Us, them: set1Them, setThem: set1Them, setterUs: setSet1Us, setterThem: setSet1Them },
                                { id: 'set2', label: '2do SET', us: set2Us, setUs: set2Us, them: set2Them, setThem: set2Them, setterUs: setSet2Us, setterThem: setSet2Them },
                                { id: 'set3', label: '3er SET', us: set3Us, setUs: set3Us, them: set3Them, setThem: set3Them, setterUs: setSet3Us, setterThem: setSet3Them },
                            ].map((set, idx) => (
                                <div key={set.id} className="space-y-3">
                                    <label className="block text-center text-[10px] font-black text-gray-500 tracking-widest uppercase italic">{set.label}</label>
                                    <div className="bg-black/40 rounded-2xl border border-white/10 p-3 flex flex-col items-center gap-2 focus-within:border-green-500/50 transition-all shadow-xl">
                                        <input
                                            type="number"
                                            value={set.setterUs === setSet1Us ? set1Us : set.setterUs === setSet2Us ? set2Us : set3Us}
                                            onChange={e => set.setterUs(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent text-center text-3xl font-black text-white placeholder:text-gray-800 outline-none p-1"
                                        />
                                        <div className="w-8 h-[1px] bg-white/5"></div>
                                        <input
                                            type="number"
                                            value={set.setterThem === setSet1Them ? set1Them : set.setterThem === setSet2Them ? set2Them : set3Them}
                                            onChange={e => set.setterThem(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent text-center text-3xl font-black text-white/50 placeholder:text-gray-800 outline-none p-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CONFIRMATION SWITCH PREMIUM */}
                    <button
                        onClick={() => setConfirmStatus(!confirmStatus)}
                        className={`w-full group relative overflow-hidden p-6 rounded-3xl border transition-all duration-500 flex flex-col items-center gap-3 ${confirmStatus
                                ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.1)]'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${confirmStatus ? 'bg-yellow-500 text-black rotate-0 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'bg-gray-800 text-gray-500 -rotate-12'
                                }`}>
                                {confirmStatus ? <Check size={24} strokeWidth={4} /> : <Info size={24} />}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className={`font-black text-sm uppercase italic tracking-wider transition-colors ${confirmStatus ? 'text-yellow-400' : 'text-gray-400'}`}>
                                    CONVERTIR EN RESULTADO OFICIAL
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                                    Al confirmar, se actualizará el <span className="text-green-400 font-bold">Ranking ELO</span> de todos los jugadores implicados.
                                </p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center shrink-0 ${confirmStatus ? 'border-yellow-500 bg-yellow-500' : 'border-white/10'
                                }`}>
                                {confirmStatus && <div className="w-2 h-2 bg-black rounded-full"></div>}
                            </div>
                        </div>
                    </button>

                    {error && (
                        <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold italic animate-bounce">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-white/5 flex gap-4 bg-white/5">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black italic tracking-widest transition-all uppercase text-sm"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-[2] relative overflow-hidden px-8 py-5 bg-green-600 disabled:opacity-30 text-white rounded-2xl font-black italic tracking-widest transition-all hover:bg-green-500 active:scale-95 shadow-[0_0_50px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3 uppercase text-sm group"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                <span>GUARDAR RESULTADO</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
