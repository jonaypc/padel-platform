"use client";

import { useState } from "react";
import { X, Search, UserPlus, Shield, User } from "lucide-react";
import { Profile } from "@padel/core";

interface AddMemberModalProps {
    onClose: () => void;
    onAdd: (userId: string, role: "admin" | "staff") => Promise<{ error: any }>;
    onSearch: (query: string) => Promise<{ data: any[] | null; error: any }>;
}

export function AddMemberModal({ onClose, onAdd, onSearch }: AddMemberModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [role, setRole] = useState<"admin" | "staff">("staff");
    const [searching, setSearching] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setSearching(true);
        setResults([]);
        setSelectedUser(null);
        setError(null);

        const { data, error } = await onSearch(query);
        if (error) {
            setError("Error al buscar usuario");
        } else if (data) {
            setResults(data);
        }
        setSearching(false);
    };

    const handleConfirm = async () => {
        if (!selectedUser) return;

        setProcessing(true);
        const { error } = await onAdd(selectedUser.id, role);
        if (error) {
            setError(error.message || "Error al añadir miembro");
            setProcessing(false);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-xl border border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-green-500" />
                        Añadir Nuevo Miembro
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Search */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Buscar Usuario
                        </label>
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Email o nombre completo..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-green-500 transition"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <button
                                type="submit"
                                disabled={searching || !query.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded-lg border border-gray-600 transition disabled:opacity-50"
                            >
                                {searching ? "..." : "Buscar"}
                            </button>
                        </form>
                    </div>

                    {/* Results */}
                    {results.length > 0 && !selectedUser && (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            <p className="text-xs text-gray-500">Resultados encontrados:</p>
                            {results.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-900/50 hover:bg-gray-700 transition border border-gray-700/50 text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold shrink-0">
                                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-white truncate">{user.full_name || "Sin nombre"}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {results.length === 0 && query && !searching && !selectedUser && (
                        <div className="text-center py-4 text-gray-500 text-sm bg-gray-900/30 rounded-xl border border-dashed border-gray-700">
                            No se encontraron usuarios
                        </div>
                    )}

                    {/* Selected User & Role */}
                    {selectedUser && (
                        <div className="bg-green-900/20 border border-green-900/50 rounded-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 font-bold border border-green-800">
                                        {selectedUser.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white leading-none">{selectedUser.full_name}</p>
                                        <p className="text-xs text-green-400/80 mt-1">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="pt-2 border-t border-green-900/30">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Asignar Rol
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole("admin")}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition ${role === 'admin'
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                            }`}
                                    >
                                        <Shield size={20} />
                                        <span className="text-xs font-bold">Admin</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole("staff")}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition ${role === 'staff'
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                            }`}
                                    >
                                        <User size={20} />
                                        <span className="text-xs font-bold">Staff</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedUser || processing}
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Añadir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
