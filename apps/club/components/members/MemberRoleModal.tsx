"use client";

import { useState } from "react";
import { X, Shield, User, Save, Loader2, AlertCircle } from "lucide-react";
import type { ClubMember } from "../../hooks/useMembers";

interface MemberRoleModalProps {
    member: ClubMember;
    onClose: () => void;
    onUpdate: (userId: string, newRole: "admin" | "staff") => Promise<{ error: any }>;
}

export function MemberRoleModal({ member, onClose, onUpdate }: MemberRoleModalProps) {
    const [role, setRole] = useState<"admin" | "staff">(member.role);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setProcessing(true);
        const { error } = await onUpdate(member.user_id, role);
        if (error) {
            setError(error.message || "Error al actualizar rol");
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
            <div className="relative bg-gray-900/90 border border-white/10 w-full max-w-md shadow-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">

                {/* Decorative glow */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role === 'admin' ? 'from-blue-600 via-blue-400 to-blue-600' : 'from-purple-600 via-purple-400 to-purple-600'
                    } transition-all duration-500`}></div>

                <div className="p-8 space-y-8">
                    {/* User Profile Info */}
                    <div className="flex flex-col items-center gap-4">
                        <div className={`relative group w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black border-2 transition-all duration-500 shadow-2xl ${member.role === 'admin' ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                            }`}>
                            {(member.profiles?.display_name || member.profiles?.full_name || '?').charAt(0)}
                            <div className="absolute -bottom-2 -right-2 p-2 bg-gray-900 border border-white/10 rounded-xl shadow-lg">
                                {member.role === 'admin' ? <Shield size={20} className="text-blue-500" /> : <User size={20} className="text-purple-500" />}
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-white italic tracking-tight">{member.profiles?.display_name || member.profiles?.full_name}</h3>
                            <p className="text-gray-500 font-medium text-sm mt-1">{member.profiles?.email}</p>
                        </div>
                    </div>

                    {/* Role Selection Grid */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center block">
                            SELECCIONAR NUEVO ROL
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("admin")}
                                className={`relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${role === 'admin'
                                    ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] ring-2 ring-blue-500/40'
                                    : 'bg-black/40 border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className={`p-3 rounded-xl transition-all ${role === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                    <Shield size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className={`font-black text-lg uppercase italic tracking-wider ${role === 'admin' ? 'text-white' : 'text-gray-500'}`}>ADMINISTRADOR</p>
                                    <p className="text-xs text-gray-600 font-medium">Control total sobre pistas, staff y reservas</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole("staff")}
                                className={`relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${role === 'staff'
                                    ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)] ring-2 ring-purple-500/40'
                                    : 'bg-black/40 border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className={`p-3 rounded-xl transition-all ${role === 'staff' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                    <User size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className={`font-black text-lg uppercase italic tracking-wider ${role === 'staff' ? 'text-white' : 'text-gray-500'}`}>STAFF EQUIPO</p>
                                    <p className="text-xs text-gray-600 font-medium">Gestión operativa de reservas y pistas</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Warning if role is the same */}
                    {role === member.role && !error && (
                        <div className="flex items-center gap-2 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-yellow-500/70 text-xs font-bold leading-tight">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>El usuario ya tiene asignado este rango actualmente.</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-sm font-bold text-center italic">
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black italic tracking-widest transition-all uppercase text-sm"
                        >
                            SALIR
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={role === member.role || processing}
                            className={`flex-[1.5] relative overflow-hidden px-8 py-5 rounded-[1.5rem] text-white font-black italic tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-sm group shadow-2xl ${role === 'admin' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
                                } disabled:opacity-30 disabled:grayscale`}
                        >
                            {processing ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>ACTUALIZAR</span>
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
