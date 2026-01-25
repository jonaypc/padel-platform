"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import { UserPlus, Users, Check, X, Eye, EyeOff } from "lucide-react";

interface Club {
    id: string;
    name: string;
}

interface ClubMember {
    id: string;
    club_id: string;
    user_id: string;
    role: string;
    clubs: { name: string };
    profiles: { email: string; display_name: string };
}

export default function AdminUsersPage() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulario
    const [selectedClub, setSelectedClub] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const supabase = createBrowserClient();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Cargar clubs
        const { data: clubsData, error: clubsError } = await supabase
            .from('clubs')
            .select('id, name')
            .order('name');

        if (clubsError) {
            console.error('Error cargando clubs:', clubsError);
            setError(`Error cargando clubs: ${clubsError.message}`);
        }

        // Cargar miembros de clubs
        const { data: membersData, error: membersError } = await supabase
            .from('club_members')
            .select('id, club_id, user_id, role, clubs(name)')
            .order('created_at', { ascending: false });

        if (membersError) {
            console.error('Error cargando miembros:', membersError);
            setError(prev => prev ? `${prev} | Error miembros: ${membersError.message}` : `Error cargando miembros: ${membersError.message}`);
        }

        // Cargar emails de profiles por separado
        if (membersData && membersData.length > 0) {
            const userIds = membersData.map((m: any) => m.user_id);
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, email, display_name')
                .in('id', userIds);

            // Combinar datos
            const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
            membersData.forEach((m: any) => {
                m.profiles = profilesMap.get(m.user_id) || { email: m.user_id, display_name: null };
            });
        }

        setClubs(clubsData || []);
        setMembers((membersData as unknown as ClubMember[]) || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function createUser(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedClub || !newEmail || !newPassword) return;

        setCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    clubId: selectedClub,
                    userEmail: user?.email
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al crear usuario');
                setCreating(false);
                return;
            }

            setSuccess(`✅ Usuario ${newEmail} creado y asignado al club correctamente`);
            setNewEmail("");
            setNewPassword("");
            setSelectedClub("");
            loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            setError(message);
        } finally {
            setCreating(false);
        }
    }

    // Generar contraseña aleatoria
    function generatePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(password);
        setShowPassword(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Crear Usuario de Club</h2>
            </div>

            {/* Mensajes */}
            {success && (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex items-center gap-2 text-green-400">
                    <Check size={18} />
                    <span>{success}</span>
                </div>
            )}

            {/* Formulario crear usuario */}
            <form onSubmit={createUser} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="text-green-500" size={24} />
                    <h3 className="text-lg font-semibold text-white">Nuevo Usuario para Club</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Club *</label>
                        <select
                            value={selectedClub}
                            onChange={(e) => setSelectedClub(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                            required
                        >
                            <option value="">Seleccionar club...</option>
                            {clubs.map((club) => (
                                <option key={club.id} value={club.id}>{club.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Email del usuario *</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="usuario@ejemplo.com"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-300 mb-2">Contraseña *</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 pr-12"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={generatePassword}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                        >
                            Generar
                        </button>
                    </div>
                    {newPassword && showPassword && (
                        <p className="text-xs text-yellow-500 mt-2">
                            ⚠️ Guarda esta contraseña: <span className="font-mono bg-gray-900 px-2 py-1 rounded">{newPassword}</span>
                        </p>
                    )}
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-center gap-2 text-red-400">
                        <X size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={creating || !selectedClub || !newEmail || !newPassword}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition text-lg"
                >
                    {creating ? "Creando usuario..." : "Crear Usuario y Asignar a Club"}
                </button>
            </form>

            {/* Lista de usuarios de clubs */}
            <div className="flex items-center gap-2 mt-8 mb-4">
                <Users className="text-gray-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Usuarios Actuales de Clubs</h3>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            ) : members.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                    <Users className="mx-auto text-gray-500 mb-3" size={48} />
                    <p className="text-gray-400">No hay usuarios asignados a clubs</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {members.map((m) => (
                        <div key={m.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">{m.profiles?.email || 'Email no disponible'}</h3>
                                <p className="text-sm text-gray-400">
                                    {m.clubs?.name || 'Club desconocido'} •
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-700 text-green-400">{m.role}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
