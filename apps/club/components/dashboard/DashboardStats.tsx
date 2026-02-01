"use client";

import { Trophy, TrendingUp, Users, Calendar, Activity, Euro } from "lucide-react";

interface StatsProps {
    stats: {
        courtsCount: number;
        reservationsCount: number;
        income: number;
        occupancy: number;
    };
    loading: boolean;
}

export function DashboardStats({ stats, loading }: StatsProps) {
    const items = [
        {
            label: "Pistas Activas",
            value: stats.courtsCount,
            unit: "Courts",
            icon: Activity,
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/20",
            glow: "shadow-green-500/10"
        },
        {
            label: "Reservas Hoy",
            value: stats.reservationsCount,
            unit: "Citas",
            icon: Calendar,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            glow: "shadow-blue-500/10"
        },
        {
            label: "Ingresos Hoy",
            value: stats.income,
            unit: "€",
            icon: Euro,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20",
            glow: "shadow-yellow-500/10"
        },
        {
            label: "Ocupación",
            value: stats.occupancy,
            unit: "%",
            icon: TrendingUp,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
            glow: "shadow-purple-500/10"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item, idx) => (
                <div
                    key={idx}
                    className={`relative group bg-gray-900/40 backdrop-blur-xl border ${item.border} rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${item.glow}`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${item.bg} ${item.color} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                            <item.icon size={24} />
                        </div>
                        {loading && (
                            <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin"></div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 italic">
                            {item.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white italic tracking-tighter">
                                {loading ? "---" : item.value}
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-widest ${item.color}`}>
                                {item.unit}
                            </span>
                        </div>
                    </div>

                    {/* Decorative bottom line */}
                    <div className={`absolute bottom-0 left-6 right-6 h-[2px] bg-linear-to-r from-transparent ${item.bg.replace('/10', '/30')} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                </div>
            ))}
        </div>
    );
}
