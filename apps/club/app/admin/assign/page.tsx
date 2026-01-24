"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import { Link2, Check, X, Trash2 } from "lucide-react";

interface Club {
    id: string;
    name: string;
}

interface ClubUser {
    id: string;
    email: string;
}

interface Assignment {
    id: string;
    club_id: string;
    user_id: string;
    role: string;
    clubs: { name: string };
    profiles: { email: string };
}

export default function AdminAssignPage() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [users, setUsers] = useState<ClubUser[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedClub, setSelectedClub] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedRole, setSelectedRole] = useState("admin");
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const supabase = createBrowserClient();

    const loadData = useCallback(async () => {
        // Cargar clubs
        const { data: clubsData } = await supabase
            .from('clubs')
            .select('id, name')
            .order('name');

        // Cargar usuarios de tipo club
        const { data: usersData } = await supabase
            .from('profiles')
            .select('id, email')
            .in('role', ['club_admin', 'club_staff'])
            .order('email');

        // Cargar asignaciones actuales
        const { data: assignmentsData } = await supabase
            .from('club_members')
            .select('id, club_id, user_id, role, clubs(name), profiles(email)')
            .order('created_at', { ascending: false });

        setClubs(clubsData || []);
        setUsers(usersData || []);
        setAssignments((assignmentsData as unknown as Assignment[]) || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function assignUser(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedClub || !selectedUser) return;

        setAssigning(true);
        setError(null);
        setSuccess(null);

        // Verificar si ya existe la asignación
        const existing = assignments.find(
            a => a.club_id === selectedClub && a.user_id === selectedUser
        );

        if (existing) {
            setError("Este usuario ya está asignado a este club");
            setAssigning(false);
            return;
        }

        const { error: insertError } = await supabase
            .from('club_members')
            .insert({
                club_id: selectedClub,
                user_id: selectedUser,
                role: selectedRole
            });

        if (insertError) {
            setError(insertError.message);
            setAssigning(false);
            return;
        }

        setSuccess("Usuario asignado correctamente");
        setSelectedClub("");
        setSelectedUser("");
        setAssigning(false);
        loadData();
    }

    async function removeAssignment(id: string) {
        if (!confirm("¿Eliminar esta asignación?")) return;

        const { error } = await supabase
            .from('club_members')
            .delete()
            .eq('id', id);

        if (error) {
            setError(error.message);
            return;
        }

        loadData();
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Asignar Usuarios a Clubs</h2>

            {/* Mensajes */}
            {success && (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 flex items-center gap-2 text-green-400">
                    <Check size={18} />
                    {success}
                </div>
            )}

            {/* Formulario asignar */}
            <form onSubmit={assignUser} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Club</label>
                        <select
                            value={selectedClub}
                            onChange={(e) => setSelectedClub(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                        >
                            <option value="">Seleccionar club...</option>
                            {clubs.map((club) => (
                                <option key={club.id} value={club.id}>{club.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Usuario</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                        >
                            <option value="">Seleccionar usuario...</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Rol</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                        >
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-center gap-2 text-red-400">
                        <X size={18} />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={assigning || !selectedClub || !selectedUser}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-semibold transition"
                >
                    {assigning ? "Asignando..." : "Asignar"}
                </button>
            </form>

            {/* Lista de asignaciones */}
            <h3 className="text-lg font-semibold text-white mt-8">Asignaciones Actuales</h3>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            ) : assignments.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                    <Link2 className="mx-auto text-gray-500 mb-3" size={48} />
                    <p className="text-gray-400">No hay asignaciones</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {assignments.map((a) => (
                        <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">{a.profiles?.email}</h3>
                                <p className="text-sm text-gray-400">
                                    {a.clubs?.name} • <span className="text-xs px-2 py-0.5 rounded bg-gray-700">{a.role}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => removeAssignment(a.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
