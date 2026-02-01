"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@padel/supabase";
import { DashboardStats } from "../../components/dashboard/DashboardStats";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { LayoutGrid, TrendingUp, Info, ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
    const [stats, setStats] = useState({
        courtsCount: 0,
        reservationsCount: 0,
        income: 0,
        occupancy: 0
    });
    const [clubName, setClubName] = useState("PANEL DE CONTROL");
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timeout = setTimeout(() => {
            if (loading) setLoading(false);
        }, 5000);
        return () => clearTimeout(timeout);
    }, [loading]);

    useEffect(() => {
        if (!mounted) return;

        async function loadStats() {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const user = session.user;
            setLoading(true);

            try {
                const { data: memberData } = await supabase
                    .from('club_members')
                    .select('club_id, clubs(name, booking_duration, opening_hour, closing_hour, shifts)')
                    .eq('user_id', user.id)
                    .single();

                if (!memberData) {
                    setLoading(false);
                    return;
                }

                const clubId = memberData.club_id;
                const club = memberData.clubs as any;
                setClubName(club?.name || "PANEL DE CONTROL");
                const duration = club?.booking_duration || 90;
                const opening = club?.opening_hour || 8;
                const closing = club?.closing_hour || 23;
                const todayIndex = new Date().getDay();
                const todayKey = todayIndex === 0 ? "7" : todayIndex.toString();
                const todayShifts = club?.shifts?.[todayKey] || [{ start: `${opening}:00`, end: `${closing}:00` }];

                const { count: courtsCount } = await supabase
                    .from('courts')
                    .select('*', { count: 'exact', head: true })
                    .eq('club_id', clubId)
                    .eq('is_active', true);

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                const { data: reservations } = await supabase
                    .from('reservations')
                    .select('price, status')
                    .eq('club_id', clubId)
                    .eq('status', 'confirmed')
                    .gte('start_time', today.toISOString())
                    .lt('start_time', tomorrow.toISOString());

                const resCount = reservations?.length || 0;
                const totalIncome = reservations?.reduce((sum, res: any) => sum + (Number(res.price) || 0), 0) || 0;

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

    if (loading && stats.courtsCount === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp size={24} className="text-green-500/40" />
                    </div>
                </div>
                <div className="text-center animate-pulse">
                    <p className="text-white font-black italic tracking-widest uppercase">CARGANDO MÉTRICAS</p>
                    <p className="text-gray-500 text-xs mt-1 uppercase tracking-[0.2em]">Sincronizando con el club...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-32 text-white px-4 md:px-0">

            {/* Header Área: Saludo y Resumen */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-green-500/20 to-blue-500/10 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative bg-gray-900/40 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden">

                    {/* Background light effect */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px] -mr-48 -mt-48 animate-pulse"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-green-500/30">
                                    ESTADO: ONLINE
                                </span>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-linear-to-r from-white via-white to-gray-500 tracking-tighter italic leading-tight uppercase">
                                {clubName}
                            </h1>
                            <p className="text-gray-400 font-medium text-sm md:text-base max-w-md leading-relaxed">
                                Bienvenido a la central de inteligencia de tu club. Aquí tienes un resumen del rendimiento operativo de hoy.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <div className="bg-black/60 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-inner group/card hover:border-white/20 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] font-black text-gray-500 tracking-widest uppercase italic">Rendimiento</h3>
                                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                        <TrendingUp size={16} />
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white italic tracking-tighter">+{stats.occupancy}%</span>
                                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Ocupación</span>
                                </div>
                                <div className="mt-4 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-linear-to-r from-green-600 to-green-400 transition-all duration-1000"
                                        style={{ width: `${stats.occupancy}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de Métricas */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic flex items-center gap-3">
                        <LayoutGrid size={14} className="text-green-500" />
                        Métricas Principales
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <Info size={12} />
                        Actualizado hace un momento
                    </div>
                </div>
                <DashboardStats stats={stats} loading={loading} />
            </div>

            {/* Accesos Rápidos Premium */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic flex items-center gap-3">
                        <ArrowUpRight size={14} className="text-blue-500" />
                        Accesos Directos
                    </h2>
                </div>
                <QuickActions />
            </div>

            {/* Footer / Nota informativa */}
            <div className="text-center pt-8 border-t border-white/5">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] italic">
                    Sistema de Gestión mi PADEL - v4.0 Platinum
                </p>
            </div>
        </div>
    );
}
