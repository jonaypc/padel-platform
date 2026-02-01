"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function AppHeader() {
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
  }, []);

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image
              src="/logo-mi-padel.png"
              alt="mi PADEL"
              width={140} // Added width
              height={28} // Added height
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Acciones derecha (Perfil + Notificaciones) */}
          <div className="flex items-center gap-3">
            {/* Notificaciones */}
            <Link href="/notifications" className="relative p-2 text-gray-400 hover:text-white transition">
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-gray-900 animate-pulse"></div>
              )}
            </Link>

            {/* Perfil */}
            <Link href="/profile">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-black text-xs cursor-pointer shadow-lg shadow-green-900/20 ring-2 ring-white/10 hover:ring-green-500/50 transition-all">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors ml-1"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
