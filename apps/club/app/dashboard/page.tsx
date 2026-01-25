"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";

export default function DashboardPage() {
    const [stats, setStats] = useState({
        courtsCount: 0,
        reservationsCount: 0,
        income: 0,
        occupancy: 0
    });
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Mount detection with safety timeout
    useEffect(() => {
        setMounted(true);
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 5000);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        async function loadStats() {
            const supabase = createBrowserClient();
            
            // Verificar sesión
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }
            
            const user = session.user;
            setLoading(true);

            try {
                // 1. Obtener club y configuración básica
                const { data: memberData } = await supabase
                    .from('club_members')
                    .select('club_id, clubs(booking_duration, opening_hour, closing_hour, shifts)')
                    .eq('user_id', user.id)
                    .single();

                if (!memberData) {
                    setLoading(false);
                    return;
                }

                const clubId = memberData.club_id;
                const club = memberData.clubs as any;
                const duration = club?.booking_duration || 90;
                const opening = club?.opening_hour || 8;
                const closing = club?.closing_hour || 23;
                // Shifts for today
                const todayIndex = new Date().getDay();
                const todayKey = todayIndex === 0 ? "7" : todayIndex.toString();
                const todayShifts = club?.shifts?.[todayKey] || [{ start: `${opening}:00`, end: `${closing}:00` }];

                // 2. Contar pistas
                const { count: courtsCount } = await supabase
                    .from('courts')
                    .select('*', { count: 'exact', head: true })
                    .eq('club_id', clubId)
                    .eq('is_active', true);

                // 3. Obtener reservas de HOY
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                const { data: reservations, error: resError } = await supabase
                    .from('reservations')
                    .select('price, status')
                    .eq('club_id', clubId)
                    .eq('status', 'confirmed')
                    .gte('start_time', today.toISOString())
                    .lt('start_time', tomorrow.toISOString());

                let finalReservations = reservations;
                if (resError) {
                    console.warn('Fallo consulta reservas con precio, intentando fallback:', resError);
                    const fallback = await supabase
                        .from('reservations')
                        .select('status')
                        .eq('club_id', clubId)
                        .eq('status', 'confirmed')
                        .gte('start_time', today.toISOString())
                        .lt('start_time', tomorrow.toISOString());

                    if (!fallback.error) {
                        finalReservations = fallback.data as any;
                    }
                }

                const resCount = finalReservations?.length || 0;
                const totalIncome = finalReservations?.reduce((sum, res: any) => sum + (Number(res.price) || 0), 0) || 0;

                // 4. Calcular ocupación real basada en shifts
                let totalMinutesOpen = 0;
                if (Array.isArray(todayShifts)) {
                    todayShifts.forEach((s: any) => {
                        const [StartH, StartM] = s.start.split(':').map(Number);
                        const [EndH, EndM] = s.end.split(':').map(Number);
                        const startMin = StartH * 60 + StartM;
                        const endMin = EndH * 60 + EndM;
                        totalMinutesOpen += (endMin - startMin);
                    });
                } else {
                    // Fallback simple
                    totalMinutesOpen = (closing - opening) * 60;
                }

                const slotsPerCourt = Math.floor(totalMinutesOpen / duration);
                const totalPossibleSlots = (courtsCount || 0) * slotsPerCourt;
                const occupancy = totalPossibleSlots > 0 ? Math.round((resCount / totalPossibleSlots) * 100) : 0;

                setStats({
                    courtsCount: courtsCount || 0,
                    reservationsCount: resCount,
                    income: totalIncome,
                    occupancy: occupancy
                });
            } catch (err) {
                console.error('Error loading stats:', err);
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, [mounted]);

    if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div></div>;

    return (
        <div className="space-y-6">
            {/* Título principal */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">PÁDEL</h1>
                <p className="text-sm text-gray-400">Panel de gestión Club Pro</p>
            </div>

            {/* Tarjetas de monitores */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
                <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">PISTAS</p>
                    <p className="text-lg lg:text-2xl font-bold text-green-500">{stats.courtsCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Activas</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">RESERVAS HOY</p>
                    <p className="text-lg lg:text-2xl font-bold text-blue-500">{stats.reservationsCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Programadas</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">INGRESOS</p>
                    <p className="text-lg lg:text-2xl font-bold text-yellow-500">{stats.income} €</p>
                    <p className="text-xs text-gray-400 mt-1">Estimados hoy</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">OCUPACIÓN</p>
                    <p className="text-lg lg:text-2xl font-bold text-purple-500">{stats.occupancy}%</p>
                    <p className="text-xs text-gray-400 mt-1">Media diaria</p>
                </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
                        Accesos Rápidos
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href="/dashboard/pistas"
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎾</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Gestionar Pistas</p>
                                    <p className="text-xs text-gray-400">Añadir, editar o eliminar</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </a>

                    <a
                        href="/dashboard/reservas"
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📅</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Ver Reservas</p>
                                    <p className="text-xs text-gray-400">Agenda del día</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </a>

                    <a
                        href="/dashboard/settings"
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚙️</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Configuración</p>
                                    <p className="text-xs text-gray-400">Ajustes del club</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
