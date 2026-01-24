"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Info } from "lucide-react";
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
        if (!user) return;

        setLoading(true);
        try {
            // 1. Obtener el primer club donde el usuario es miembro
            const { data: memberData, error: memberError } = await supabase
                .from("club_members")
                .select("club_id")
                .eq("user_id", user.id)
                .limit(1)
                .single();

            if (memberError || !memberData) {
                console.error("No se encontró club para el usuario");
                setLoading(false);
                return;
            }

            const currentClubId = memberData.club_id;
            setClubId(currentClubId);

            // 2. Obtener pistas de ese club
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-white mb-1">Mis Pistas</h1>
                <p className="text-sm text-gray-400">Gestiona tus canchas</p>
            </div>

            {/* Botón añadir */}
            <button
                onClick={handleOpenCreate}
                disabled={!clubId}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-750 transition disabled:opacity-50"
            >
                <Plus size={20} className="text-green-500" />
                <span className="text-sm font-medium text-white">Añadir nueva pista</span>
            </button>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            ) : !clubId ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-white">
                    <p>No tienes acceso a ningún club. Contacta con el administrador.</p>
                </div>
            ) : courts.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No tienes pistas creadas</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                        Empieza por añadir tu primera pista para que los jugadores puedan empezar a reservar.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        className="text-green-500 hover:text-green-400 font-bold transition"
                    >
                        Crear mi primera pista
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {courts.map((court) => (
                        <div key={court.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-semibold">{court.name}</h3>
                                        <span className={`w-2 h-2 rounded-full ${court.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {court.type === 'indoor' ? 'Cubierta' : 'Exterior'} • {court.surface === 'crystal' ? 'Cristal' : court.surface === 'wall' ? 'Muro' : 'Sintético'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(court)}
                                        className="p-2 text-gray-400 hover:text-green-500 transition"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(court.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
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
