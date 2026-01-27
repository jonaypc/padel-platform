"use client";

import { useState } from "react";
import { X, Shield, User, Save } from "lucide-react";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl border border-gray-700 overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white mb-4">
                            {member.profiles?.full_name?.charAt(0)}
                        </div>
                        <h3 className="text-lg font-bold text-white">{member.profiles?.full_name}</h3>
                        <p className="text-sm text-gray-400">{member.profiles?.email}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                            Seleccionar Nuevo Rol
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("admin")}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition ${role === 'admin'
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 ring-2 ring-blue-500/20'
                                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <Shield size={24} />
                                <span className="text-sm font-bold">Admin</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("staff")}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition ${role === 'staff'
                                    ? 'bg-purple-600/20 border-purple-500 text-purple-400 ring-2 ring-purple-500/20'
                                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <User size={24} />
                                <span className="text-sm font-bold">Staff</span>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={role === member.role || processing}
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
