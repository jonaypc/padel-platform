"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Save, Clock, Sun, Copy, X } from "lucide-react";

type Shift = { start: string; end: string };
type WeekSchedule = Record<string, Shift[]>; // Keys: "1" (Mon) -> "7" (Sun)

const DAYS = [
    { key: "1", label: "L", name: "Lunes" },
    { key: "2", label: "M", name: "Martes" },
    { key: "3", label: "X", name: "Miércoles" },
    { key: "4", label: "J", name: "Jueves" },
    { key: "5", label: "V", name: "Viernes" },
    { key: "6", label: "S", name: "Sábado" },
    { key: "7", label: "D", name: "Domingo" },
];

export default function SettingsPage() {
    const [duration, setDuration] = useState<number>(90);
    const [defaultPrice, setDefaultPrice] = useState<number>(0);
    const [schedule, setSchedule] = useState<WeekSchedule>({});
    const [selectedDay, setSelectedDay] = useState<string>("1");
    const [useShifts, setUseShifts] = useState(false);
    const [extras, setExtras] = useState<{ name: string; price: number }[]>([]);

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

            let { data: members, error } = await supabase
                .from('club_members')
                .select('club_id, clubs(*)')
                .eq('user_id', user.id)
                .limit(1);

            if (error) {
                const { data: retryData, error: retryError } = await supabase
                    .from('club_members')
                    .select('club_id, clubs(id, name, booking_duration, default_price, opening_hour, closing_hour, shifts, extras)')
                    .eq('user_id', user.id)
                    .limit(1);

                if (!retryError && retryData) {
                    members = retryData as any;
                    error = null;
                }
            }

            if (!error && members && members.length > 0 && members[0]) {
                const firstMember = members[0];
                const clubData = (firstMember as any).clubs;
                const club = Array.isArray(clubData) ? clubData[0] : clubData;

                if (club) {
                    setClubId(firstMember.club_id);
                    setDuration(club.booking_duration || 90);
                    setDefaultPrice(club.default_price || 0);
                    setOpeningHour(club.opening_hour ?? 8);
                    setClosingHour(club.closing_hour ?? 23);
                    setExtras(club.extras || []);

                    if (club.shifts) {
                        setSchedule(club.shifts as WeekSchedule);
                        setUseShifts(true);
                    } else {
                        setUseShifts(false);
                        const defaultShifts = [{
                            start: `${(club.opening_hour ?? 8).toString().padStart(2, '0')}:00`,
                            end: `${(club.closing_hour ?? 23).toString().padStart(2, '0')}:00`
                        }];
                        const newSchedule: WeekSchedule = {};
                        DAYS.forEach(d => newSchedule[d.key] = [...defaultShifts]);
                        setSchedule(newSchedule);
                    }
                }
            }
            setLoading(false);
        }
        loadSettings();
    }, [supabase]);

    const handleSave = async () => {
        if (!clubId) {
            setMsg({ type: 'error', text: 'No se encontró ID del club.' });
            return;
        }

        setSaving(true);
        setMsg(null);

        try {
            // Preparar payload con extras limpios (filtrar vacíos)
            const cleanExtras = extras.filter(e => e.name.trim() !== '');
            
            const updatePayload = {
                booking_duration: duration,
                default_price: defaultPrice,
                opening_hour: openingHour,
                closing_hour: closingHour,
                shifts: useShifts ? schedule : null,
                extras: cleanExtras
            };

            console.log('Guardando configuración:', updatePayload);

            const { data, error } = await supabase
                .from('clubs')
                .update(updatePayload)
                .eq('id', clubId)
                .select();

            console.log('Respuesta de Supabase:', { data, error });

            if (error) throw error;

            // Actualizar estado local con los extras limpios
            setExtras(cleanExtras);

            setMsg({ type: 'success', text: 'Configuración guardada correctamente' });
        } catch (err: any) {
            console.error('Error al guardar:', err);
            setMsg({ type: 'error', text: 'Error al guardar: ' + (err.message || err.code || 'Error desconocido') });
        } finally {
            setSaving(false);
        }
    };

    const currentShifts = Array.isArray(schedule[selectedDay]) ? schedule[selectedDay] : [];

    const addShift = () => {
        const newShifts = [...currentShifts, { start: "09:00", end: "14:00" }];
        setSchedule({ ...schedule, [selectedDay]: newShifts });
    };

    const removeShift = (index: number) => {
        const newShifts = [...currentShifts];
        newShifts.splice(index, 1);
        setSchedule({ ...schedule, [selectedDay]: newShifts });
    };

    const updateShift = (index: number, field: 'start' | 'end', value: string) => {
        const newShifts = [...currentShifts];
        const currentShift = newShifts[index];
        if (currentShift) {
            newShifts[index] = { ...currentShift, [field]: value };
        }
        setSchedule({ ...schedule, [selectedDay]: newShifts });
    };

    const copyToAll = () => {
        if (!confirm("¿Copiar el horario de " + DAYS.find(d => d.key === selectedDay)?.name + " a TODOS los días de la semana?")) return;
        const newSchedule: WeekSchedule = {};
        DAYS.forEach(d => newSchedule[d.key] = [...currentShifts]);
        setSchedule(newSchedule);
    };

    const addExtra = () => {
        setExtras([...extras, { name: '', price: 0 }]);
    };

    const updateExtra = (index: number, field: "name" | "price", value: string | number) => {
        const newExtras = [...extras];
        const currentExtra = newExtras[index];
        if (currentExtra) {
            newExtras[index] = { ...currentExtra, [field]: value };
        }
        setExtras(newExtras);
    };

    const removeExtra = (index: number) => {
        setExtras(extras.filter((_, i) => i !== index));
    };

    const timeOptions: string[] = [];
    for (let h = 0; h < 24; h++) {
        timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
        timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div></div>;
    if (!clubId) return <div className="p-4 text-center text-gray-400">No tienes acceso a ningún club.</div>;

    return (
        <div className="space-y-6 pb-24 text-white">
            <h1 className="text-2xl font-bold mb-6">Ajustes del Club</h1>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-900/30 rounded-lg text-green-400"><Clock size={20} /></div>
                    <h2 className="text-lg font-semibold">Duración de Reservas</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[60, 90, 120].map((min) => (
                        <button
                            key={min}
                            onClick={() => setDuration(min)}
                            className={`py-3 px-4 rounded-xl border font-medium transition-all ${duration === min ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20" : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"}`}
                        >
                            {min} min
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-900/30 rounded-lg text-yellow-400">💰</div>
                    <div>
                        <h2 className="text-lg font-semibold">Precio por Defecto</h2>
                        <p className="text-xs text-gray-400">Por sesión ({duration} min)</p>
                    </div>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-bold text-xl pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400">🎒</div>
                        <div>
                            <h2 className="text-lg font-semibold">Complementos / Tienda</h2>
                            <p className="text-xs text-gray-400">Define los precios de productos adicionales</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    {extras.map((extra, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                            <input
                                type="text"
                                placeholder="Ej: Tubo de bolas"
                                value={extra.name}
                                onChange={(e) => updateExtra(idx, 'name', e.target.value)}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500 text-sm"
                            />
                            <div className="relative w-32">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={extra.price}
                                    onChange={(e) => updateExtra(idx, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500 text-sm pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">€</span>
                            </div>
                            <button onClick={() => removeExtra(idx)} className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addExtra}
                        className="w-full py-2.5 border border-dashed border-gray-600 text-gray-400 rounded-xl hover:border-gray-500 transition text-sm font-medium"
                    >
                        + Añadir Complemento
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400"><Sun size={20} /></div>
                        <h2 className="text-lg font-semibold">Horario Semanal</h2>
                    </div>
                    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                        <button onClick={() => setUseShifts(false)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${!useShifts ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}>Simple</button>
                        <button onClick={() => setUseShifts(true)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${useShifts ? 'bg-blue-600 text-white shadow' : 'text-gray-400'}`}>Por Días</button>
                    </div>
                </div>

                {!useShifts ? (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Apertura</label>
                            <select value={openingHour} onChange={(e) => setOpeningHour(parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white">
                                {hours.map((h) => <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cierre</label>
                            <select value={closingHour} onChange={(e) => setClosingHour(parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white">
                                {hours.map((h) => <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>)}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between bg-gray-900 p-1 rounded-xl">
                            {DAYS.map(day => (
                                <button key={day.key} onClick={() => setSelectedDay(day.key)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${selectedDay === day.key ? "bg-gray-700 text-white shadow" : "text-gray-500"}`}>{day.label}</button>
                            ))}
                        </div>
                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-medium">{DAYS.find(d => d.key === selectedDay)?.name}</h3>
                                <button onClick={copyToAll} className="flex items-center gap-1 text-xs text-blue-400"><Copy size={12} /> Copiar a todos</button>
                            </div>
                            <div className="space-y-3">
                                {currentShifts.map((shift, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <select value={shift.start} onChange={(e) => updateShift(i, 'start', e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm">
                                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <span className="text-gray-500 text-sm">a</span>
                                        <select value={shift.end} onChange={(e) => updateShift(i, 'end', e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm">
                                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <button onClick={() => removeShift(i)} className="p-2 text-red-500 ml-auto">✕</button>
                                    </div>
                                ))}
                                <button onClick={addShift} className="w-full py-2 border border-dashed border-gray-600 text-gray-400 rounded-xl text-sm font-medium hover:text-gray-200">+ Añadir Franja</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end pt-4">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition shadow-lg">
                    {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
                    Guardar Cambios
                </button>
            </div>

            {msg && <div className={`p-4 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>{msg.text}</div>}
        </div>
    );
}
