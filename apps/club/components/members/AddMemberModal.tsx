"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, Shield, User, SearchIcon, Loader2 } from "lucide-react";
import type { Profile } from "@padel/core";

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

    // Debounce search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim().length >= 3 && !selectedUser) {
                setSearching(true);
                setError(null);
                const { data, error } = await onSearch(query);
                if (error) {
                    setError("Error al buscar usuario");
                    setResults([]);
                } else {
                    setResults(data || []);
                }
                setSearching(false);
            } else if (query.trim().length < 1) {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query, onSearch, selectedUser]);

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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            {/* Backdrop con desenfoque profundo */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-gray-900/90 border border-white/10 w-full max-w-xl shadow-2xl rounded-t-[2.5rem] md:rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">

                {/* Decorative border light */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>

                {/* Header */}
                <div className="flex justify-between items-center p-6 md:p-8 border-b border-white/5 bg-white/5">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white flex items-center gap-3 italic">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <UserPlus size={20} className="text-green-400" />
                            </div>
                            AÑADIR MIEMBRO
                        </h3>
                        <p className="text-xs font-medium text-gray-500 tracking-wider">
                            BUSCA POR NOMBRE O EMAIL PARA DAR ACCESO
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    {/* Search Section */}
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Escribe el nombre o email..."
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    if (selectedUser) setSelectedUser(null);
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
                            />
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors" size={22} />

                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Results Dropdown style */}
                        {results.length > 0 && !selectedUser && (
                            <div className="bg-black/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-y-auto max-h-[200px] custom-scrollbar">
                                {results.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setQuery(user.display_name || user.full_name || user.email || '');
                                        }}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-left"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-gray-400 shrink-0 border border-white/5">
                                            {(user.display_name || user.full_name || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white truncate">{user.display_name || user.full_name || "Usuario"}</p>
                                            <p className="text-xs text-gray-500 truncate font-medium">{user.email}</p>
                                        </div>
                                        <div className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-md uppercase">Elegir</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {query.length >= 3 && results.length === 0 && !searching && !selectedUser && (
                            <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-gray-500 font-medium italic">No se encontraron usuarios con ese nombre</p>
                            </div>
                        )}
                    </div>

                    {/* Selection & Role Config */}
                    <div className={`space-y-6 transition-all duration-500 ${selectedUser ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-4'}`}>
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">
                                CONFIGURACIÓN DEL MIEMBRO
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole("admin")}
                                    className={`relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${role === 'admin'
                                        ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-2 ring-blue-500/20'
                                        : 'bg-black/40 border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${role === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                        <Shield size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-black text-sm uppercase italic tracking-wider ${role === 'admin' ? 'text-white' : 'text-gray-500'}`}>ADMIN</p>
                                        <p className="text-[10px] text-gray-600 font-medium">Acceso total</p>
                                    </div>
                                    {role === 'admin' && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]"></div>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole("staff")}
                                    className={`relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${role === 'staff'
                                        ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-2 ring-purple-500/20'
                                        : 'bg-black/40 border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${role === 'staff' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                        <User size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-black text-sm uppercase italic tracking-wider ${role === 'staff' ? 'text-white' : 'text-gray-500'}`}>STAFF</p>
                                        <p className="text-[10px] text-gray-600 font-medium">Gestión básica</p>
                                    </div>
                                    {role === 'staff' && <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,1)]"></div>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-sm font-bold text-center italic animate-bounce">
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black italic tracking-widest transition-all uppercase text-sm"
                        >
                            CANCELAR
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedUser || processing}
                            className="flex-[2] relative overflow-hidden px-8 py-5 bg-green-600 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-black italic tracking-widest transition-all hover:bg-green-500 active:scale-95 shadow-[0_0_40px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3 uppercase text-sm group"
                        >
                            {processing ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span>DAR DE ALTA</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
