"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient, useAuth } from "@padel/supabase";
import { Plus, User, Check, X } from "lucide-react";

interface ClubUser {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function AdminUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<ClubUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const supabase = createBrowserClient();

    const loadUsers = useCallback(async () => {
        // Cargar usuarios que son club_admin o club_staff
        const { data } = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .in('role', ['club_admin', 'club_staff'])
            .order('created_at', { ascending: false });

        setUsers(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    async function createUser(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;

        setCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    userEmail: user?.email
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al crear usuario');
                setCreating(false);
                return;
            }

            setSuccess(`Usuario ${email} creado correctamente`);
            setEmail("");
            setPassword("");
            setShowForm(false);
            setCreating(false);
            loadUsers();
        } catch {
            setError('Error de conexión');
            setCreating(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Usuarios de Club</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                >
                    <Plus size={18} />
                    Nuevo Usuario
                </button>
            </div>

            {/* Mensajes */}
            {success && (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 flex items-center gap-2 text-green-400">
                    <Check size={18} />
                    {success}
                </div>
            )}

            {/* Formulario crear usuario */}
            {showForm && (
                <form onSubmit={createUser} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@club.com"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
                        />
                    </div>
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-center gap-2 text-red-400">
                            <X size={18} />
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={creating || !email.trim() || !password.trim()}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-semibold transition"
                        >
                            {creating ? "Creando..." : "Crear Usuario"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="border border-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-xl transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {/* Lista de usuarios */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                    <User className="mx-auto text-gray-500 mb-3" size={48} />
                    <p className="text-gray-400">No hay usuarios de club registrados</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((u) => (
                        <div key={u.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">{u.email}</h3>
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                    {u.role}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500">
                                {new Date(u.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
