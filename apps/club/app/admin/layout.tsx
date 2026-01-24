"use client";

import Link from "next/link";
import { Building2, Users, Link2, ArrowLeft, LogOut } from "lucide-react";
import { createBrowserClient } from "@padel/supabase";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = createBrowserClient();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-white">🔐 Panel Superadmin</h1>
                            <p className="text-xs text-gray-400">jonaypc@gmail.com</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-400 transition"
                        title="Cerrar sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Nav */}
            <nav className="bg-gray-800/50 border-b border-gray-700">
                <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2">
                    <Link
                        href="/admin"
                        className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
                    >
                        <Building2 size={16} className="inline mr-2" />
                        Clubs
                    </Link>
                    <Link
                        href="/admin/users"
                        className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
                    >
                        <Users size={16} className="inline mr-2" />
                        Usuarios
                    </Link>
                    <Link
                        href="/admin/assign"
                        className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
                    >
                        <Link2 size={16} className="inline mr-2" />
                        Asignar
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
}
