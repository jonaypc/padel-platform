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

        // Safety timeout for login button - 30 seconds
        const loginTimeout = setTimeout(() => {
            setLoading(false);
            setMsg("El login tardó demasiado. Por favor intenta de nuevo.");
        }, 30000);

        try {
            const supabase = createBrowserClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                clearTimeout(loginTimeout);
                setLoading(false);
                setMsg(error.message);
                return;
            }

            // Superadmin tiene acceso directo
            const SUPERADMIN_EMAIL = "jonaypc@gmail.com";
            if (data.user.email === SUPERADMIN_EMAIL) {
                clearTimeout(loginTimeout);
                setMsg("Login correcto ✅ Redirigiendo...");
                // Small delay to show message then redirect
                setTimeout(() => {
                    window.location.href = "/admin";
                }, 500);
                return;
            }

            // Verificar que el usuario tiene acceso a algún club
            const { data: membership, error: membershipError } = await supabase
                .from('club_members')
                .select('club_id')
                .eq('user_id', data.user.id)
                .limit(1);

            if (membershipError) {
                console.error('Membership check error:', membershipError);
                clearTimeout(loginTimeout);
                setMsg("Login correcto ✅ Redirigiendo...");
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 500);
                return;
            }

            if (!membership || membership.length === 0) {
                clearTimeout(loginTimeout);
                await supabase.auth.signOut();
                setLoading(false);
                setMsg("No tienes acceso a ningún club. Contacta con el administrador.");
                return;
            }

            clearTimeout(loginTimeout);
            setMsg("Login correcto ✅ Redirigiendo...");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 500);
        } catch (err) {
            console.error('SignIn error:', err);
            setLoading(false);
            setMsg("Error al iniciar sesión. Inténtalo de nuevo.");
        }
    }

    async function signInWithGoogle() {
        setLoading(true);
        setMsg(null);
        try {
            const supabase = createBrowserClient();
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                },
            });

            if (error) {
                setMsg(error.message);
                setLoading(false);
            }
        } catch (err) {
            console.error('SignInWithGoogle error:', err);
            setLoading(false);
            setMsg("Error al iniciar sesión con Google.");
        }
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

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-gray-800 px-2 text-gray-500">O continúa con</span>
                            </div>
                        </div>

                        <button
                            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-xl py-3 text-white font-semibold transition disabled:opacity-50"
                            onClick={signInWithGoogle}
                            disabled={loading}
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
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
