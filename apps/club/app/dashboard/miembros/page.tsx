"use client";

import { useEffect, useState } from "react";
import { Plus, Shield, User, MoreVertical, Trash2, Edit } from "lucide-react";
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

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Equipo & Staff</h1>
                    <p className="text-gray-400 text-sm">Gestiona los permisos y acceso a tu club</p>
                </div>
                {currentUserRole === 'admin' && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-green-900/20 transition self-start"
                    >
                        <Plus size={20} />
                        Añadir Miembro
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {members.map((member) => (
                    <div
                        key={member.user_id}
                        className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between group hover:border-gray-600 transition"
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${member.role === 'admin' ? 'bg-blue-900/30 border-blue-600 text-blue-400' : 'bg-purple-900/30 border-purple-600 text-purple-400'
                                }`}>
                                {member.profiles?.full_name?.charAt(0) || '?'}
                            </div>

                            {/* Info */}
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    {member.profiles?.full_name || "Usuario Desconocido"}
                                    {member.role === 'admin' && <Shield size={14} className="text-blue-500" />}
                                </h3>
                                <p className="text-sm text-gray-400">{member.profiles?.email}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${member.role === 'admin' ? 'bg-blue-900/20 text-blue-400' : 'bg-purple-900/20 text-purple-400'
                                }`}>
                                {member.role}
                            </span>

                            {currentUserRole === 'admin' && (
                                <div className="flex items-center gap-1 border-l border-gray-700 pl-3 ml-3">
                                    <button
                                        onClick={() => setMemberToEdit(member)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                                        title="Editar Rol"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleRemove(member.user_id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition"
                                        title="Eliminar Miembro"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {members.length === 0 && (
                    <div className="text-center p-12 text-gray-500 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
                        No hay miembros en el equipo.
                    </div>
                )}
            </div>

            {/* Modals */}
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
