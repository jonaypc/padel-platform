"use client";

import { useEffect, useState } from "react";
import { Plus, Shield, User, MoreVertical, Trash2, Edit, Users, Mail, Clock } from "lucide-react";
import { useMembers, ClubMember } from "../../../hooks/useMembers";
import { AddMemberModal } from "../../../components/members/AddMemberModal";
import { MemberRoleModal } from "../../../components/members/MemberRoleModal";

export default function MiembrosPage() {
    const {
        loading,
        members,
        currentUserRole,
        fetchMembers,
        addMember,
        updateMemberRole,
        removeMember,
        searchUser
    } = useMembers();

    const [showAddModal, setShowAddModal] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<ClubMember | null>(null);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRemove = async (userId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar a este miembro del equipo?")) return;
        await removeMember(userId);
    };

    if (loading && members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Users size={20} className="text-green-500/50" />
                    </div>
                </div>
                <p className="text-gray-400 font-medium animate-pulse">Cargando equipo...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 text-white px-4 md:px-0">
            {/* Header con estilo premium */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-gray-900/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <Users size={24} className="text-green-400" />
                            </div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
                                Equipo & Staff
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm md:text-base font-medium pl-1">
                            Control de acceso y roles para la administración del club
                        </p>
                    </div>

                    {currentUserRole === 'admin' && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-4 rounded-xl font-bold shadow-xl shadow-green-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Añadir Miembro</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Lista de Miembros */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                    <div
                        key={member.user_id}
                        className="group relative"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col h-full shadow-lg group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-1">

                            {/* Avatar & Role Badge */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner rotate-3 group-hover:rotate-0 transition-transform duration-500 border-2 ${member.role === 'admin'
                                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                                        : 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                                    }`}>
                                    {member.profiles?.display_name?.charAt(0) || member.profiles?.full_name?.charAt(0) || '?'}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${member.role === 'admin'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                        : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                    }`}>
                                    {member.role}
                                </span>
                            </div>

                            {/* User Info */}
                            <div className="space-y-1 flex-1">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 group-hover:text-green-400 transition-colors">
                                    {member.profiles?.display_name || member.profiles?.full_name || "Sin nombre"}
                                    {member.role === 'admin' && <Shield size={16} className="text-blue-500" />}
                                </h3>
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <Mail size={14} />
                                    <span className="truncate">{member.profiles?.email}</span>
                                </div>
                                {member.joined_at && (
                                    <div className="flex items-center gap-2 text-gray-500 text-xs mt-2">
                                        <Clock size={12} />
                                        <span>Desta el {new Date(member.joined_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions Overlay for Desktop / Simple for Mobile */}
                            {currentUserRole === 'admin' && (
                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setMemberToEdit(member)}
                                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-90"
                                        title="Editar Rol"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleRemove(member.user_id)}
                                        className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 active:scale-90"
                                        title="Eliminar Miembro"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {members.length === 0 && !loading && (
                <div className="text-center py-20 px-6 bg-gray-900/40 backdrop-blur-sm rounded-3xl border border-dashed border-white/10 space-y-4">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <Users size={32} className="text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No hay miembros registrados</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">
                        Inicia la formación de tu equipo añadiendo administradores o staff para gestionar el club.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 text-green-400 font-bold hover:text-green-300 transition-colors"
                    >
                        Añadir primer miembro →
                    </button>
                </div>
            )}

            {/* Modals con animación premium */}
            {showAddModal && (
                <AddMemberModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={addMember}
                    onSearch={searchUser}
                />
            )}

            {memberToEdit && (
                <MemberRoleModal
                    member={memberToEdit}
                    onClose={() => setMemberToEdit(null)}
                    onUpdate={updateMemberRole}
                />
            )}
        </div>
    );
}
