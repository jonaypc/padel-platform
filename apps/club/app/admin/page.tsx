"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Plus, Building2, Trash2, AlertCircle } from "lucide-react";

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
    const [debugInfo, setDebugInfo] = useState<string>("");
    const [authUser, setAuthUser] = useState<string | null>(null);

    // Create supabase client with useMemo to keep stable reference
    const supabase = useMemo(() => createBrowserClient(), []);

    const loadClubs = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Check auth status first
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError) {
                setDebugInfo(`Auth Error: ${authError.message}`);
                setAuthUser(null);
            } else if (!user) {
                setDebugInfo("No user session - not authenticated");
                setAuthUser(null);
            } else {
                setAuthUser(user.email || user.id);
                setDebugInfo(`Authenticated as: ${user.email}`);
            }

            // Try to load clubs
            const { data, error: clubsError } = await supabase
                .from('clubs')
                .select('*')
                .order('created_at', { ascending: false });

            if (clubsError) {
                setError(`Error cargando clubs: ${clubsError.message} (Code: ${clubsError.code})`);
                setDebugInfo(prev => `${prev} | Clubs Error: ${clubsError.message}`);
                console.error('Clubs fetch error:', clubsError);
            } else {
                setDebugInfo(prev => `${prev} | Clubs loaded: ${data?.length || 0}`);
            }

            setClubs(data || []);
        } catch (e) {
            console.error('Unexpected error:', e);
            setError(`Error inesperado: ${e}`);
        } finally {
            setLoading(false);
        }
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
            {/* Debug Panel */}
            <div className={`p-4 rounded-xl border-2 ${error ? 'bg-red-900/50 border-red-500' : authUser ? 'bg-green-900/50 border-green-500' : 'bg-yellow-900/50 border-yellow-500'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className={error ? 'text-red-400' : authUser ? 'text-green-400' : 'text-yellow-400'} />
                    <span className="font-bold text-white">Estado de Conexión</span>
                </div>
                <p className="text-sm text-gray-300">Usuario: {authUser || 'No autenticado'}</p>
                <p className="text-sm text-gray-300">Clubs encontrados: {clubs.length}</p>
                <p className="text-xs text-gray-400 mt-1">{debugInfo}</p>
                {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
                <button 
                    onClick={loadClubs}
                    className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                    Recargar
                </button>
            </div>

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
