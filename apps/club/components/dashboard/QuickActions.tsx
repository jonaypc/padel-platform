"use client";

import Link from "next/link";
import { Calendar, Settings, Layout, Users, Trophy, ChevronRight } from "lucide-react";

export function QuickActions() {
    const actions = [
        {
            title: "Ver Agenda",
            desc: "Gestionar reservas hoy",
            href: "/dashboard/reservas",
            icon: Calendar,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            title: "Pistas",
            desc: "Estado del club",
            href: "/dashboard/pistas",
            icon: Layout,
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/20"
        },
        {
            title: "Competición",
            desc: "Partidos y Ranking",
            href: "/dashboard/partidos",
            icon: Trophy,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20"
        },
        {
            title: "Configuración",
            desc: "Ajustes de cuenta",
            href: "/dashboard/settings",
            icon: Settings,
            color: "text-gray-400",
            bg: "bg-gray-500/10",
            border: "border-gray-500/20"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {actions.map((action, idx) => (
                <Link
                    key={idx}
                    href={action.href}
                    className="group relative block bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:border-white/20 hover:bg-gray-800/80 shadow-xl overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className={`absolute -right-6 -bottom-6 opacity-[0.03] transition-transform duration-700 group-hover:scale-150 group-hover:rotate-12 ${action.color}`}>
                        <action.icon size={120} />
                    </div>

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${action.bg} ${action.color}`}>
                                <action.icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-white italic tracking-tight uppercase text-sm">
                                    {action.title}
                                </h4>
                                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">
                                    {action.desc}
                                </p>
                            </div>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl group-hover:bg-green-500 group-hover:text-black transition-all duration-300">
                            <ChevronRight size={16} strokeWidth={3} />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
