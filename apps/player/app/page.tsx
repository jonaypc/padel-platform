"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }

    checkSession();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-soft p-6 text-center">
        <p className="mb-2 text-sm font-medium text-zinc-900">
          Cargando aplicación
        </p>
        <p className="text-sm text-zinc-500">
          Verificando sesión…
        </p>
      </div>
    </div>
  );
}
