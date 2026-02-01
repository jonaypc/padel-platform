"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import {
    Save, Clock, Sun, Copy, X, Euro,
    Settings, Calendar, Layout,
    Zap, Tag, ShoppingBag, Loader2,
    CheckCircle2, AlertCircle
} from "lucide-react";

type Shift = { start: string; end: string };
type WeekSchedule = Record<string, Shift[]>;

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
    const [priceTemplates, setPriceTemplates] = useState<{ label: string; price: number }[]>([]);

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
            if (!user) {
                setLoading(false);
                return;
            }

            const { data: members, error } = await supabase
                .from('club_members')
                .select('club_id, clubs(id, name, booking_duration, default_price, opening_hour, closing_hour, shifts, extras, price_templates)')
                .eq('user_id', user.id)
                .limit(1);

            if (!error && members && members.length > 0 && members[0]) {
                const club = (members[0] as any).clubs;

                if (club) {
                    setClubId(members[0].club_id);
                    setDuration(club.booking_duration || 90);
                    setDefaultPrice(club.default_price || 0);
                    setOpeningHour(club.opening_hour ?? 8);
                    setClosingHour(club.closing_hour ?? 23);
                    setExtras(club.extras || []);
                    setPriceTemplates(club.price_templates || []);

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
        if (!clubId) return;

        setSaving(true);
        setMsg(null);

        try {
            const cleanExtras = extras.filter(e => e.name.trim() !== '');
            const cleanTemplates = priceTemplates.filter(t => t.label.trim() !== '');

            const updatePayload = {
                booking_duration: duration,
                default_price: defaultPrice,
                opening_hour: openingHour,
                closing_hour: closingHour,
                shifts: useShifts ? schedule : null,
                extras: cleanExtras,
                price_templates: cleanTemplates
            };

            const { error } = await supabase
                .from('clubs')
                .update(updatePayload)
                .eq('id', clubId);

            if (error) throw error;

            setExtras(cleanExtras);
            setPriceTemplates(cleanTemplates);
            setMsg({ type: 'success', text: 'Configuración guardada correctamente' });

            setTimeout(() => setMsg(null), 3000);
        } catch (err: any) {
            setMsg({ type: 'error', text: 'Error al guardar cambios' });
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
        if (!confirm("¿Copiar el horario a todos los días?")) return;
        const newSchedule: WeekSchedule = {};
        DAYS.forEach(d => newSchedule[d.key] = [...currentShifts]);
        setSchedule(newSchedule);
    };

    const timeOptions: string[] = [];
    for (let h = 0; h < 24; h++) {
        timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
        timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-white/40 rounded-full animate-spin" />
                    <Settings size={20} className="absolute inset-0 m-auto text-white/40" />
                </div>
                <p className="text-gray-500 font-medium animate-pulse italic">Cargando configuración...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-40 text-white px-4 md:px-0">

            {/* Header Premium */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-gray-900/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                                <Settings size={28} className="text-purple-400" />
                            </div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-linear-to-r from-white via-white to-gray-500 tracking-tighter italic">
                                AJUSTES CLUB
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm md:text-base font-medium pl-1">
                            Define las reglas de negocio, horarios y tarifas de tu instalación
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="group/btn relative overflow-hidden bg-white text-black px-10 py-4 rounded-2xl font-black italic tracking-widest uppercase text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={20} strokeWidth={3} />}
                        Guardar Cambios
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Columna Izquierda: Configuración Principal */}
                <div className="lg:col-span-12 space-y-10">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Bloque 1: Duración */}
                        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20 text-green-400">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black italic text-white uppercase tracking-tight leading-none">DURACIÓN DE RESERVAS</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tiempo Standard por Sesión</p>
                                </div>
                            </div>

                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                {[60, 90, 120].map((min) => (
                                    <button
                                        key={min}
                                        onClick={() => setDuration(min)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${duration === min ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/20' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <span>{min} min</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bloque 2: Tarifas */}
                        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-400">
                                    <Euro size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black italic text-white uppercase tracking-tight leading-none">PRECIO POR DEFECTO</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tarifa base para jugadores</p>
                                </div>
                            </div>

                            <div className="relative group">
                                <input
                                    type="number"
                                    value={defaultPrice}
                                    onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-3xl font-black text-white outline-none focus:border-yellow-500/30 transition-all text-center italic tracking-tighter shadow-inner"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black italic text-xl">€</span>
                            </div>
                        </div>
                    </div>

                    {/* Bloque 3: Horarios (Full Width) */}
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-xl space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
                                    <Sun size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black italic text-white uppercase tracking-tight leading-none">PLANIFICACIÓN HORARIA</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Define cuándo abre el club</p>
                                </div>
                            </div>

                            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 self-start md:self-center shadow-inner">
                                <button
                                    onClick={() => setUseShifts(false)}
                                    className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${!useShifts ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Fijo
                                </button>
                                <button
                                    onClick={() => setUseShifts(true)}
                                    className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${useShifts ? 'bg-blue-600/50 text-white shadow-lg' : 'text-gray-500 hover:text-blue-400'}`}
                                >
                                    Dinámico
                                </button>
                            </div>
                        </div>

                        {!useShifts ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-2">Apertura Global</label>
                                    <select
                                        value={openingHour}
                                        onChange={(e) => setOpeningHour(parseInt(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer hover:border-white/20 transition-all shadow-inner"
                                    >
                                        {hours.map((h) => <option key={h} value={h} className="bg-gray-900">{h.toString().padStart(2, '0')}:00</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-2">Cierre Global</label>
                                    <select
                                        value={closingHour}
                                        onChange={(e) => setClosingHour(parseInt(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none cursor-pointer hover:border-white/20 transition-all shadow-inner"
                                    >
                                        {hours.map((h) => <option key={h} value={h} className="bg-gray-900">{h.toString().padStart(2, '0')}:00</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-7 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                    {DAYS.map(day => (
                                        <button
                                            key={day.key}
                                            onClick={() => setSelectedDay(day.key)}
                                            className={`py-3 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedDay === day.key ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white" : "text-gray-500 hover:text-white"}`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="bg-black/20 rounded-[2rem] p-8 border border-white/5 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black text-white italic tracking-tight italic uppercase">{DAYS.find(d => d.key === selectedDay)?.name}</h3>
                                        <button
                                            onClick={copyToAll}
                                            className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition group"
                                        >
                                            <Copy size={12} className="group-hover:rotate-12 transition-transform" />
                                            Copiar a todos
                                        </button>
                                    </div>
                                    <div className="grid gap-4">
                                        {currentShifts.map((shift, i) => (
                                            <div key={i} className="flex items-center gap-4 bg-gray-900/40 p-3 rounded-2xl border border-white/5 group-hover:border-white/10 transition-all">
                                                <div className="flex-1 flex items-center gap-3">
                                                    <select
                                                        value={shift.start}
                                                        onChange={(e) => updateShift(i, 'start', e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none cursor-pointer hover:border-blue-500/30 transition-all"
                                                    >
                                                        {timeOptions.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                                                    </select>
                                                    <span className="text-gray-700 italic font-black">al</span>
                                                    <select
                                                        value={shift.end}
                                                        onChange={(e) => updateShift(i, 'end', e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none cursor-pointer hover:border-blue-500/30 transition-all"
                                                    >
                                                        {timeOptions.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => removeShift(i)}
                                                    className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={addShift}
                                            className="w-full py-4 border border-dashed border-white/10 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:border-blue-500/30 hover:text-blue-400 transition-all duration-300"
                                        >
                                            + Añadir Nueva Franja
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bloque 4: Precios Rápidos y Complementos (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Precios Rápidos */}
                        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-pink-500/10 rounded-2xl border border-pink-500/20 text-pink-400">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black italic text-white uppercase tracking-tight leading-none">ACCESOS PRECIO</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Botones de tarifa instantánea</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {priceTemplates.map((template, idx) => (
                                    <div key={idx} className="flex gap-3 items-center group/item animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <input
                                            type="text"
                                            placeholder="Ej: Socio"
                                            value={template.label}
                                            onChange={(e) => updateTemplate(idx, 'label', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500/30 transition-all font-bold text-sm shadow-inner"
                                        />
                                        <div className="relative w-28">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={template.price}
                                                onChange={(e) => updateTemplate(idx, 'price', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500/30 transition-all font-black text-center text-sm shadow-inner"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 italic font-black text-[10px]">€</span>
                                        </div>
                                        <button
                                            onClick={() => removeTemplate(idx)}
                                            className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addTemplate}
                                    className="w-full py-3.5 border border-dashed border-white/10 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-pink-500/30 hover:text-pink-400 transition-all"
                                >
                                    + Añadir Botón de Tarifa
                                </button>
                            </div>
                        </div>

                        {/* Complementos */}
                        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-orange-400">
                                    <ShoppingBag size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black italic text-white uppercase tracking-tight leading-none">EXTRAS & TIENDA</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Alquiler de palas, bolas, etc.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {extras.map((extra, idx) => (
                                    <div key={idx} className="flex gap-3 items-center group/item animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <input
                                            type="text"
                                            placeholder="Ej: Alquiler Pala"
                                            value={extra.name}
                                            onChange={(e) => updateExtra(idx, 'name', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500/30 transition-all font-bold text-sm shadow-inner"
                                        />
                                        <div className="relative w-28">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={extra.price}
                                                onChange={(e) => updateExtra(idx, 'price', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500/30 transition-all font-black text-center text-sm shadow-inner"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 italic font-black text-[10px]">€</span>
                                        </div>
                                        <button
                                            onClick={() => removeExtra(idx)}
                                            className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addExtra}
                                    className="w-full py-3.5 border border-dashed border-white/10 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-orange-500/30 hover:text-orange-400 transition-all"
                                >
                                    + Añadir Complemento
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Toaster Feedback Premium */}
            {msg && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10 duration-500 backdrop-blur-3xl border ${msg.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-500'}`}>
                    {msg.type === 'success' ? <CheckCircle2 size={20} className="animate-pulse" /> : <AlertCircle size={20} />}
                    <span className="font-black italic uppercase tracking-widest text-xs">{msg.text}</span>
                </div>
            )}
        </div>
    );
}
