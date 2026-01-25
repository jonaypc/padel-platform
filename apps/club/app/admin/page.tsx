"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Plus, Building2, Trash2 } from "lucide-react";

interface Club {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

export default function AdminClubsPage() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [clubName, setClubName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createBrowserClient();

    const loadClubs = useCallback(async () => {
        const { data } = await supabase
            .from('clubs')
            .select('*')
            .order('created_at', { ascending: false });

        setClubs(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadClubs();
    }, [loadClubs]);

    async function createClub(e: React.FormEvent) {
        e.preventDefault();
        if (!clubName.trim()) return;

        setCreating(true);
        setError(null);

        const slug = clubName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const { error: insertError } = await supabase
            .from('clubs')
            .insert({ name: clubName.trim(), slug });

        if (insertError) {
            setError(insertError.message);
            setCreating(false);
            return;
        }

        setClubName("");
        setShowForm(false);
        setCreating(false);
        loadClubs();
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Gestión de Clubs</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                >
                    <Plus size={18} />
                    Nuevo Club
                </button>
            </div>

            {/* Formulario crear club */}
            {showForm && (
                <form onSubmit={createClub} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <label className="block text-sm text-gray-300 mb-2">Nombre del Club</label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={clubName}
                            onChange={(e) => setClubName(e.target.value)}
                            placeholder="Ej: Padel Indoor Center"
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
                        />
                        <button
                            type="submit"
                            disabled={creating || !clubName.trim()}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-semibold transition"
                        >
                            {creating ? "Creando..." : "Crear"}
                        </button>
                    </div>
                    {error && (
                        <p className="text-red-400 text-sm mt-2">{error}</p>
                    )}
                </form>
            )}

            {/* Lista de clubs */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            ) : clubs.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                    <Building2 className="mx-auto text-gray-500 mb-3" size={48} />
                    <p className="text-gray-400">No hay clubs registrados</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {clubs.map((club) => (
                        <div key={club.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">{club.name}</h3>
                                <p className="text-sm text-gray-400">/{club.slug}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">
                                    {new Date(club.created_at).toLocaleDateString()}
                                </span>
                                <button
                                    onClick={async () => {
                                        // Verificar si el usuario ya es miembro
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!user) return;

                                        const { data: existingMember } = await supabase
                                            .from('club_members')
                                            .select('id')
                                            .eq('club_id', club.id)
                                            .eq('user_id', user.id)
                                            .single();

                                        if (!existingMember) {
                                            // Añadir como admin del club
                                            await supabase
                                                .from('club_members')
                                                .insert({
                                                    club_id: club.id,
                                                    user_id: user.id,
                                                    role: 'admin'
                                                });
                                        }

                                        // Ir al dashboard
                                        window.location.href = '/dashboard';
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                >
                                    Gestionar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!confirm(`¿Eliminar el club "${club.name}"? Esta acción no se puede deshacer.`)) return;

                                        const { data: { user } } = await supabase.auth.getUser();
                                        const res = await fetch('/api/admin/delete-club', {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                clubId: club.id,
                                                userEmail: user?.email
                                            })
                                        });

                                        const data = await res.json();
                                        if (!res.ok) {
                                            alert('Error al eliminar: ' + data.error);
                                        } else {
                                            loadClubs();
                                        }
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500 transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
