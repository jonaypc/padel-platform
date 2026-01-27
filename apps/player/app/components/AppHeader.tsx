"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AppHeader() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user?.id) {
        // Cargar nombre
        const email = sessionData.session.user.email || "";
        const nameParts = email.split("@")[0];
        setUserName(nameParts.charAt(0).toUpperCase() + nameParts.slice(1));

        // Cargar notificaciones no leídas
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sessionData.session.user.id)
          .eq("is_read", false);

        setUnreadCount(count || 0);
      }
    }
    loadData();
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          {/* Perfil y nombre */}
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold cursor-pointer">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
            </Link>
            <div>
              <p className="text-sm font-semibold text-white">{userName || "Usuario"}</p>
              <p className="text-xs text-gray-400">Activo</p>
            </div>
          </div>

          {/* Acciones derecha */}
          <div className="flex items-center gap-4">
            {/* Notificaciones */}
            <Link href="/notifications" className="relative p-2 text-gray-400 hover:text-white transition">
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-gray-900"></div>
              )}
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
