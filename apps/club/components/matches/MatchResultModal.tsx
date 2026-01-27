"use client";

import { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
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
            // Validar scores (básico)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Editar Resultado</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Enfrentamiento */}
                    <div className="flex justify-between items-center text-sm font-medium text-gray-300 bg-gray-900/50 p-3 rounded-xl border border-gray-700">
                        <div className="w-5/12 text-center break-words pr-2">
                            <div className="text-green-400 font-bold mb-1">Equipo A (Local)</div>
                            {match.partner_name || "Jugador 1"}
                        </div>
                        <div className="font-bold text-gray-500">VS</div>
                        <div className="w-5/12 text-center break-words pl-2">
                            <div className="text-red-400 font-bold mb-1">Equipo B (Visitante)</div>
                            {match.opponent1_name || "Rival 1"}
                            {match.opponent2_name && ` / ${match.opponent2_name}`}
                        </div>
                    </div>

                    {/* Inputs de Sets */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                            <div>Set 1</div>
                            <div>Set 2</div>
                            <div>Set 3 (Opcional)</div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Set 1 */}
                            <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
                                <input
                                    type="number" className="w-full bg-transparent text-center text-white font-bold outline-none" placeholder="0"
                                    value={set1Us} onChange={e => setSet1Us(e.target.value)}
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="number" className="w-full bg-transparent text-center text-white font-bold outline-none" placeholder="0"
                                    value={set1Them} onChange={e => setSet1Them(e.target.value)}
                                />
                            </div>

                            {/* Set 2 */}
                            <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
                                <input
                                    type="number" className="w-full bg-transparent text-center text-white font-bold outline-none" placeholder="0"
                                    value={set2Us} onChange={e => setSet2Us(e.target.value)}
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="number" className="w-full bg-transparent text-center text-white font-bold outline-none" placeholder="0"
                                    value={set2Them} onChange={e => setSet2Them(e.target.value)}
                                />
                            </div>

                            {/* Set 3 */}
                            <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
                                <input
                                    type="number" className="w-full bg-transparent text-center text-white font-bold outline-none" placeholder="-"
                                    value={set3Us} onChange={e => setSet3Us(e.target.value)}
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="number" className="w-full bg-transparent text-center text-white font-bold outline-none" placeholder="-"
                                    value={set3Them} onChange={e => setSet3Them(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Checkbox Confirmar */}
                    <div className="bg-yellow-900/10 border border-yellow-900/30 p-4 rounded-xl">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-600 transition-all checked:border-yellow-500 checked:bg-yellow-500 hover:border-yellow-400"
                                    checked={confirmStatus}
                                    onChange={e => setConfirmStatus(e.target.checked)}
                                />
                                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 peer-checked:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-white text-sm group-hover:text-yellow-400 transition">Confirmar Partido Oficialmente</div>
                                <p className="text-xs text-gray-400 mt-1">Al marcar esto, el resultado se considera definitivo y <strong>se actualizará el Ranking ELO</strong> de los jugadores implicados.</p>
                            </div>
                        </label>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl font-bold bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center gap-2 transition"
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Save size={18} /> Guardar Resultado
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
