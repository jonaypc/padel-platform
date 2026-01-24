"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient, useAuth } from "@padel/supabase";

export default function AppHeader() {
    const router = useRouter();
    const { user } = useAuth();
    const [userName, setUserName] = useState<string>("");
    const [clubName, setClubName] = useState<string>("");
    const supabase = createBrowserClient();

    useEffect(() => {
        async function loadData() {
            if (user) {
                // Obtener nombre del email
                const email = user.email || "";
                const nameParts = email.split("@")[0] || "Usuario";
                setUserName(nameParts.charAt(0).toUpperCase() + nameParts.slice(1));

                // Obtener nombre del club
                const { data: memberData } = await supabase
                    .from("club_members")
                    .select("club_id, clubs(name)")
                    .eq("user_id", user.id)
                    .limit(1)
                    .single();

                if (memberData?.clubs) {
                    const clubData = memberData.clubs as unknown as { name: string };
                    setClubName(clubData.name);
                }
            }
        }
        loadData();
    }, [user, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    return (
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
            <div className="max-w-md mx-auto px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    {/* Perfil y nombre */}
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard">
                            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold cursor-pointer">
                                {userName ? userName.charAt(0).toUpperCase() : "C"}
                            </div>
                        </Link>
                        <div>
                            <p className="text-sm font-semibold text-white">{clubName || "Mi Club"}</p>
                            <p className="text-xs text-gray-400">Panel de gestión</p>
                        </div>
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-4">
                        {/* Configuración */}
                        <Link href="/dashboard/settings" className="relative p-2 text-gray-400 hover:text-white transition">
                            <span className="text-xl">⚙️</span>
                        </Link>

                        {/* Botón de cerrar sesión */}
                        <button
                            onClick={handleLogout}
                            className="text-xs text-gray-400 hover:text-gray-300"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
