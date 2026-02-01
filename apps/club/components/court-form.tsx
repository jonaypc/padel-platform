"use client";

import { useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import type { Court, CourtType } from "@padel/core";
import { Save, X, Layout, MapPin, Euro, Info, Loader2 } from "lucide-react";

interface CourtFormProps {
    clubId: string;
    courtToEdit?: Court | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export function CourtForm({ clubId, courtToEdit, onSuccess, onCancel }: CourtFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(courtToEdit?.name || "");
    const [type, setType] = useState<CourtType>(courtToEdit?.type || "indoor");
    const [price, setPrice] = useState<string>(courtToEdit?.price?.toString() || "");

    const supabase = createBrowserClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (courtToEdit) {
                const { error: updateError } = await supabase
                    .from("courts")
                    .update({
                        name,
                        type,
                        price: price ? parseFloat(price) : null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", courtToEdit.id);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("courts")
                    .insert({
                        club_id: clubId,
                        name,
                        type,
                        price: price ? parseFloat(price) : null,
                        is_active: true,
                    });

                if (insertError) throw insertError;
            }

            onSuccess();
        } catch (err: any) {
            console.error("Error saving court:", err);
            setError(err.message || "Error al guardar la pista");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-300">

            {/* Info Section */}
            <div className="space-y-6">
                <div className="relative group">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 italic ml-1 flex items-center gap-2">
                        <Layout size={12} className="text-green-500" />
                        Identificación de Pista
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Pista Central / Cristal"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all outline-none font-bold shadow-inner"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative group">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 italic ml-1 flex items-center gap-2">
                            <MapPin size={12} className="text-blue-500" />
                            Tipo de Instalación
                        </label>
                        <div className="relative">
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as CourtType)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none font-bold cursor-pointer shadow-inner"
                            >
                                <option value="indoor">Indoor (Cubierta)</option>
                                <option value="outdoor">Outdoor (Exterior)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                                <Info size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 italic ml-1 flex items-center gap-2">
                            <Euro size={12} className="text-yellow-500" />
                            Precio Especial (Pista)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Precio del club"
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 transition-all outline-none font-bold pr-12 shadow-inner"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 font-black italic">€</span>
                        </div>
                    </div>
                </div>

                {/* Nota Informativa */}
                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <Info size={16} className="text-gray-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed uppercase tracking-tighter">
                        Si dejas el campo de precio vacío, se aplicará automáticamente la tarifa configurada en los <span className="text-white font-black italic">Ajustes Generales del Club</span>.
                    </p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold italic animate-bounce">
                    <X size={18} />
                    {error}
                </div>
            )}

            {/* Footer Premium */}
            <div className="flex justify-end items-center gap-4 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-6 py-4 text-[10px] font-black italic tracking-[0.2em] text-gray-500 hover:text-white transition-all uppercase"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="relative overflow-hidden group/save px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black italic tracking-widest uppercase text-xs transition-all active:scale-95 shadow-[0_0_40px_rgba(34,197,94,0.2)] flex items-center gap-3 disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            <Save size={18} className="transition-transform group-hover/save:rotate-12" />
                            <span>{courtToEdit ? "Actualizar Pista" : "Registrar Pista"}</span>
                        </>
                    )}
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/save:animate-shimmer" />
                </button>
            </div>
        </form>
    );
}
