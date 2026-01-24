"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Save, Clock, Sun, Moon } from "lucide-react";

export default function SettingsPage() {
    const [duration, setDuration] = useState<number>(90);
    const [openingHour, setOpeningHour] = useState<number>(8);
    const [closingHour, setClosingHour] = useState<number>(23);
    const [clubId, setClubId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const supabase = createBrowserClient();

    useEffect(() => {
        async function loadSettings() {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: members } = await supabase
                .from('club_members')
                .select('club_id, clubs(booking_duration, opening_hour, closing_hour)')
                .eq('user_id', user.id)
                .limit(1);

            if (members && members.length > 0) {
                interface MemberSettingsResponse {
                    club_id: string;
                    clubs: { booking_duration?: number; opening_hour?: number; closing_hour?: number } | null;
                }
                const member = members[0] as MemberSettingsResponse;
                setClubId(member.club_id);
                setDuration(member.clubs?.booking_duration || 90);
                setOpeningHour(member.clubs?.opening_hour ?? 8);
                setClosingHour(member.clubs?.closing_hour ?? 23);
            }

            setLoading(false);
        }

        loadSettings();
    }, [supabase]);

    const handleSave = async () => {
        if (!clubId) return;
        setSaving(true);
        setMsg(null);

        try {
            const { error } = await supabase
                .from('clubs')
                .update({
                    booking_duration: duration,
                    opening_hour: openingHour,
                    closing_hour: closingHour
                })
                .eq('id', clubId);

            if (error) throw error;

            setMsg({ type: 'success', text: 'Configuración guardada correctamente' });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setMsg({ type: 'error', text: 'Error al guardar: ' + errorMessage });
        } finally {
            setSaving(false);
        }
    };

    // Generar opciones de horas (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!clubId) {
        return (
            <div className="p-4 text-center text-gray-400">
                No tienes acceso a ningún club.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white mb-6">Ajustes del Club</h1>

            {/* Duración de Reservas */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-900/30 rounded-lg text-green-400">
                        <Clock size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Duración de Reservas</h2>
                </div>

                <p className="text-sm text-gray-400 mb-6">
                    Define la duración estándar para las reservas en tu club.
                </p>

                <div className="grid grid-cols-3 gap-4">
                    {[60, 90, 120].map((min) => (
                        <button
                            key={min}
                            onClick={() => setDuration(min)}
                            className={`py-3 px-4 rounded-xl border font-medium transition-all ${duration === min
                                ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20"
                                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                                }`}
                        >
                            {min} min
                        </button>
                    ))}
                </div>
            </div>

            {/* Horario del Club */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
                        <Sun size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Horario del Club</h2>
                </div>

                <p className="text-sm text-gray-400 mb-6">
                    Configura las horas de apertura y cierre de tus pistas.
                </p>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Hora de Apertura
                        </label>
                        <div className="flex items-center gap-2">
                            <Sun size={16} className="text-yellow-500" />
                            <select
                                value={openingHour}
                                onChange={(e) => setOpeningHour(parseInt(e.target.value))}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                            >
                                {hours.map((h) => (
                                    <option key={h} value={h}>
                                        {h.toString().padStart(2, '0')}:00
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Hora de Cierre
                        </label>
                        <div className="flex items-center gap-2">
                            <Moon size={16} className="text-blue-400" />
                            <select
                                value={closingHour}
                                onChange={(e) => setClosingHour(parseInt(e.target.value))}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                            >
                                {hours.map((h) => (
                                    <option key={h} value={h}>
                                        {h.toString().padStart(2, '0')}:00
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                    Los jugadores solo podrán reservar dentro de este horario.
                </p>
            </div>

            {/* Botón Guardar */}
            <div className="flex items-center justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition shadow-lg shadow-green-900/30"
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                        <Save size={18} />
                    )}
                    Guardar Cambios
                </button>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
                    }`}>
                    {msg.text}
                </div>
            )}
        </div>
    );
}
