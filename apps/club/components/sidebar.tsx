"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Grid3X3, Calendar, Settings, LogOut, Trophy, Users } from "lucide-react";
import { createBrowserClient } from "@padel/supabase";
import { useMemo, useCallback } from "react";

const NAV_ITEMS = [
    { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pistas", href: "/dashboard/pistas", icon: Grid3X3 },
    { name: "Reservas", href: "/dashboard/reservas", icon: Calendar },
    { name: "Partidos", href: "/dashboard/partidos", icon: Trophy },
    { name: "Equipo", href: "/dashboard/miembros", icon: Users },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    // Memoizar el cliente de Supabase para evitar recrearlo en cada render
    const supabase = useMemo(() => createBrowserClient(), []);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }, [supabase]);

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
            <div className="p-8">
                <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2 uppercase">
                    <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">P</span>
                    Club<span className="text-green-500">Pro</span>
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? "bg-gray-800 text-white font-semibold shadow-sm"
                                : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                                }`}
                        >
                            <Icon size={20} className={isActive ? "text-green-500" : "text-gray-500 group-hover:text-gray-300"} />
                            <span className="text-sm">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-red-400 w-full transition-all duration-200 hover:bg-red-500/5 rounded-xl group font-medium text-xs"
                >
                    <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}
