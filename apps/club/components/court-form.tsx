"use client";

import { useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import type { Court, CourtType, CourtSurface } from "@padel/core";

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
    const [surface, setSurface] = useState<CourtSurface>(courtToEdit?.surface || "crystal");

    const supabase = createBrowserClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (courtToEdit) {
                // Update
                const { error: updateError } = await supabase
                    .from("courts")
                    .update({
                        name,
                        type,
                        surface,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", courtToEdit.id);

                if (updateError) throw updateError;
            } else {
                // Create
                console.log("Creando pista...", { clubId, name, type, surface });
                const { error: insertError } = await supabase
                    .from("courts")
                    .insert({
                        club_id: clubId,
                        name,
                        type,
                        surface,
                        is_active: true,
                    });

                if (insertError) {
                    console.error("Error Supabase INSERT FULL:", insertError);
                    console.error("Error Details:", {
                        msg: insertError.message,
                        code: insertError.code,
                        details: insertError.details,
                        hint: insertError.hint
                    });
                    throw insertError;
                }
            }

            onSuccess();
        } catch (err: unknown) {
            console.error("Error saving court (catch block):", err);
            const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : "Error desconocido");
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre de la Pista</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Pista Central"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Ubicación</label>
                    <div className="relative">
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as CourtType)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all appearance-none"
                        >
                            <option value="indoor">Indoor (Cubierta)</option>
                            <option value="outdoor">Outdoor (Exterior)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Superficie</label>
                    <div className="relative">
                        <select
                            value={surface}
                            onChange={(e) => setSurface(e.target.value as CourtSurface)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all appearance-none"
                        >
                            <option value="crystal">Cristal</option>
                            <option value="synthetic">Sintética</option>
                            <option value="wall">Muro</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-900/20 border border-red-900/30 rounded-xl text-red-400 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-6 py-3 text-gray-400 hover:text-white font-bold text-sm transition-all"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                >
                    {isLoading ? "GUARDANDO..." : courtToEdit ? "ACTUALIZAR PISTA" : "CREAR PISTA"}
                </button>
            </div>
        </form>
    );
}
