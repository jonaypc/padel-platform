"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@padel/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [msg, setMsg] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Only run on client side
    useEffect(() => {
        setMounted(true);
        
        // Safety timeout - never show spinner for more than 3 seconds
        const timeout = setTimeout(() => {
            setCheckingSession(false);
        }, 3000);
        
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        try {
            const supabase = createBrowserClient();
            
            // Check session once on mount
            supabase.auth.getSession()
                .then(({ data: { session } }) => {
                    if (session) {
                        if (session.user.email === "jonaypc@gmail.com") {
                            router.replace("/admin");
                        } else {
                            router.replace("/dashboard");
                        }
                    } else {
                        setCheckingSession(false);
                    }
                })
                .catch((error) => {
                    console.error('Session check error:', error);
                    setCheckingSession(false);
                });
        } catch (error) {
            console.error('Error creating supabase client:', error);
            setCheckingSession(false);
        }
    }, [mounted, router]);

    async function signIn() {
        setLoading(true);
        setMsg(null);
        
        const supabase = createBrowserClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setLoading(false);
            setMsg(error.message);
            return;
        }

        // Superadmin tiene acceso directo
        const SUPERADMIN_EMAIL = "jonaypc@gmail.com";
        if (data.user.email === SUPERADMIN_EMAIL) {
            setMsg("Login correcto ✅");
            window.location.href = "/admin";
            return;
        }

        // Verificar que el usuario tiene acceso a algún club
        const { data: membership } = await supabase
            .from('club_members')
            .select('club_id')
            .eq('user_id', data.user.id)
            .limit(1);

        if (!membership || membership.length === 0) {
            await supabase.auth.signOut();
            setLoading(false);
            setMsg("No tienes acceso a ningún club. Contacta con el administrador.");
            return;
        }

        setMsg("Login correcto ✅");
        window.location.href = "/dashboard";
    }

    // Show loading while checking initial state
    if (!mounted || checkingSession) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">🎾 PÁDEL</h1>
                    <p className="text-gray-400 mt-2">Panel de Club</p>
                </div>

                {/* Card */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-2">Acceso Club</h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Introduce tus credenciales de administrador
                    </p>

                    <div className="space-y-4">
                        <input
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && signIn()}
                        />

                        <button
                            className="w-full bg-green-600 hover:bg-green-700 rounded-xl py-3 text-white font-semibold transition disabled:opacity-50"
                            onClick={signIn}
                            disabled={loading || !email || !password}
                        >
                            {loading ? "Verificando..." : "Entrar"}
                        </button>

                        {msg && (
                            <div className={`rounded-xl p-3 text-sm ${msg.includes("✅") ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                                {msg}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info de acceso restringido */}
                <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm text-center">
                        <span className="text-yellow-500">⚠️</span> Acceso solo por invitación
                    </p>
                    <p className="text-gray-500 text-xs text-center mt-2">
                        ¿Quieres registrar tu club? Contacta con soporte.
                    </p>
                </div>
            </div>
        </div>
    );
}
