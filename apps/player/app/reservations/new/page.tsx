"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";

type CourtInfo = {
    id: string;
    name: string;
    is_indoor: boolean;
    clubs: {
        id: string;
        name: string;
        city: string | null;
    };
};

// Duración fija de reserva: 90 minutos
const RESERVATION_DURATION_MINUTES = 90;

// Calcular hora de fin sumando minutos a la hora de inicio
function calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + RESERVATION_DURATION_MINUTES;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

function NewReservationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const courtId = searchParams.get("court_id");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [court, setCourt] = useState<CourtInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [date, setDate] = useState("");
    const [hour, setHour] = useState("");
    const [minute, setMinute] = useState("");

    // Construir startTime a partir de hora y minuto
    const startTime = hour && minute ? `${hour}:${minute}` : "";

    useEffect(() => {
        async function load() {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                router.replace("/login");
                return;
            }

            if (!courtId) {
                setError("No se ha seleccionado ninguna pista.");
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from("courts")
                .select(`
          id,
          name,
          is_indoor,
          clubs (
            id,
            name,
            city
          )
        `)
                .eq("id", courtId)
                .maybeSingle();

            if (fetchError || !data) {
                setError("Pista no encontrada.");
                setLoading(false);
                return;
            }

            setCourt(data as unknown as CourtInfo);
            setLoading(false);
        }

        load();
    }, [courtId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!date || !hour || !minute) {
            setError("Todos los campos son obligatorios.");
            return;
        }

        const today = new Date().toISOString().split("T")[0];
        if (date < today) {
            setError("La fecha no puede ser anterior a hoy.");
            return;
        }

        // Calcular hora de fin automáticamente
        const endTime = calculateEndTime(startTime);

        setSubmitting(true);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
            router.replace("/login");
            return;
        }

        if (!court) return;

        // Construir objetos Date completos para PostgreSQL timestamptz
        const startDateTime = new Date(`${date}T${startTime}:00`);
        const endDateTime = new Date(`${date}T${endTime}:00`);

        const { error: insertError } = await supabase.from("reservations").insert({
            user_id: sessionData.session.user.id,
            club_id: court.clubs.id,
            court_id: courtId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            type: 'booking',
            status: 'confirmed',
            players: [{
                id: sessionData.session.user.id,
                name: sessionData.session.user.email?.split('@')[0] || 'Jugador',
                confirmed: true
            }]
        });

        if (insertError) {
            console.error("Error creating reservation:", insertError);
            setError("Error al crear la reserva. Inténtalo de nuevo.");
            setSubmitting(false);
            return;
        }

        router.push("/reservations");
    };

    // Calcular hora de fin para mostrar en la UI
    const endTimePreview = startTime ? calculateEndTime(startTime) : "";

    // Opciones de hora (8:00 a 22:00)
    const hourOptions = Array.from({ length: 15 }, (_, i) => {
        const h = i + 8;
        return h.toString().padStart(2, "0");
    });

    // Opciones de minutos (solo en punto y media)
    const minuteOptions = ["00", "30"];

    if (loading) return <div className="p-6 text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-gray-900 pb-20">
            <AppHeader />

            <div className="max-w-md mx-auto px-4 py-6">
                {/* Título principal */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">NUEVA RESERVA</h1>
                    <p className="text-sm text-gray-400">Reserva una pista para jugar (90 min).</p>
                </div>

                {/* Error sin pista */}
                {error && !court ? (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center mb-4">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                ) : null}

                {/* Court info */}
                {court && (
                    <div className="mb-6 bg-gray-800 rounded-2xl p-4 border border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🎾</span>
                            <div>
                                <p className="text-sm font-semibold text-white">{court.name}</p>
                                <p className="text-xs text-gray-400">
                                    {court.clubs?.name ?? "Club"} · {court.is_indoor ? "Indoor" : "Outdoor"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                {court && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Fecha
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-green-500"
                            />
                        </div>

                        {/* Start time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Hora de entrada
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={hour}
                                    onChange={(e) => setHour(e.target.value)}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-green-500 appearance-none"
                                >
                                    <option value="">Hora</option>
                                    {hourOptions.map((h) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-white self-center">:</span>
                                <select
                                    value={minute}
                                    onChange={(e) => setMinute(e.target.value)}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-green-500 appearance-none"
                                >
                                    <option value="">Min</option>
                                    {minuteOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* End time preview (read-only) */}
                        {startTime && (
                            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                <p className="text-xs text-gray-400 mb-1">Hora de salida (automático)</p>
                                <p className="text-sm font-semibold text-white">
                                    {endTimePreview} <span className="text-gray-500 font-normal">(+90 min)</span>
                                </p>
                            </div>
                        )}

                        {/* Error message */}
                        {error && court && (
                            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-4 rounded-xl transition"
                        >
                            {submitting ? "Reservando..." : "Confirmar reserva"}
                        </button>
                    </form>
                )}

                {/* Volver */}
                <div className="mt-6">
                    <Link
                        href={court ? `/clubs/${court.clubs?.id}` : "/clubs"}
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⬅️</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Volver</p>
                                    <p className="text-xs text-gray-400">Cancelar reserva</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </Link>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

export default function NewReservationPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white bg-gray-900 min-h-screen">Cargando...</div>}>
            <NewReservationContent />
        </Suspense>
    );
}
