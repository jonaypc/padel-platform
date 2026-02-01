"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Info, Layout, MapPin, Activity, ChevronRight } from "lucide-react";
import { createBrowserClient, useAuth } from "@padel/supabase";
import { Court } from "@padel/core";
import { Modal } from "../../../components/modal";
import { CourtForm } from "../../../components/court-form";

export default function PistasPage() {
    const { user } = useAuth();
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [clubId, setClubId] = useState<string | null>(null);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);

    const supabase = createBrowserClient();

    const fetchClubAndCourts = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data: memberData, error: memberError } = await supabase
                .from("club_members")
                .select("club_id")
                .eq("user_id", user.id)
                .limit(1)
                .single();

            if (memberError || !memberData) {
                setLoading(false);
                return;
            }

            const currentClubId = memberData.club_id;
            setClubId(currentClubId);

            const { data, error } = await supabase
                .from("courts")
                .select("*")
                .eq("club_id", currentClubId)
                .order("created_at", { ascending: true });

            if (!error && data) {
                setCourts(data as Court[]);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchClubAndCourts();
    }, [fetchClubAndCourts]);

    const handleOpenCreate = () => {
        setEditingCourt(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (court: Court) => {
        setEditingCourt(court);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta pista?")) return;

        const { error } = await supabase
            .from("courts")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error al eliminar la pista: " + error.message);
        } else {
            fetchClubAndCourts();
        }
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchClubAndCourts();
    };

    if (loading && courts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                    <Layout size={20} className="absolute inset-0 m-auto text-green-500/40" />
                </div>
                <p className="text-gray-400 font-medium animate-pulse italic">Cargando instalaciones...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 text-white px-4 md:px-0">

            {/* Header Premium */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-green-500/20 to-blue-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-gray-900/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                                <Layout size={28} className="text-green-400" />
                            </div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-linear-to-r from-white via-white to-gray-500 tracking-tighter italic">
                                MIS PISTAS
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm md:text-base font-medium pl-1">
                            Configura y gestiona las canchas de tu club con control total
                        </p>
                    </div>

                    <button
                        onClick={handleOpenCreate}
                        disabled={!clubId}
                        className="group/btn relative overflow-hidden bg-white text-black px-8 py-4 rounded-2xl font-black italic tracking-widest uppercase text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Añadir Pista
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                    </button>
                </div>
            </div>

            {courts.length === 0 ? (
                <div className="text-center py-24 px-8 bg-gray-900/40 backdrop-blur-sm rounded-[3rem] border border-dashed border-white/10 space-y-6">
                    <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-2xl rotate-3">
                        <Info size={40} className="text-gray-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Sin Pistas Activas</h3>
                        <p className="text-gray-500 max-w-sm mx-auto font-medium">
                            Tu club aún no tiene canchas registradas. Añade tu primera pista para habilitar las reservas.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="text-green-400 hover:text-green-300 font-black italic uppercase tracking-widest text-sm flex items-center gap-2 mx-auto pt-4 group transition-all"
                    >
                        Comenzar Ahora
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courts.map((court) => (
                        <div key={court.id} className="group relative">
                            <div className="absolute -inset-0.5 bg-linear-to-br from-white/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex flex-col h-full shadow-lg group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-1">

                                {/* Info Principal */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{court.name}</h3>
                                            <div className={`w-2 h-2 rounded-full ${court.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 opacity-50'}`}></div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            <MapPin size={10} className="text-green-500" />
                                            {court.type === 'indoor' ? 'Indoor / Cubierta' : 'Outdoor / Exterior'}
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl border ${court.is_active ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-gray-800 border-white/5 text-gray-500'}`}>
                                        <Activity size={18} />
                                    </div>
                                </div>

                                {/* Estadísticas / Detalles Rápidos */}
                                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Precio:</span>
                                        <span className="text-sm font-bold text-white">
                                            {court.price ? `${court.price}€` : 'Defecto'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenEdit(court)}
                                            className="p-2.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                            title="Editar"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(court.id)}
                                            className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCourt ? "Editar Pista" : "Nueva Pista"}
            >
                {clubId && (
                    <CourtForm
                        clubId={clubId}
                        courtToEdit={editingCourt}
                        onSuccess={handleSuccess}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
            </Modal>
        </div>
    );
}
