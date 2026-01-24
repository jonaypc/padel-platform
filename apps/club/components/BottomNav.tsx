"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "Resumen", icon: "🏠" },
        { href: "/dashboard/pistas", label: "Pistas", icon: "🎾" },
        { href: "/dashboard/reservas", label: "Reservas", icon: "📅" },
        { href: "/dashboard/settings", label: "Ajustes", icon: "⚙️" },
    ];

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname?.startsWith(href);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
            <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${active
                                    ? "text-green-500 bg-gray-800"
                                    : "text-gray-400 hover:text-green-500"
                                }`}
                        >
                            <span className="text-2xl mb-1">{item.icon}</span>
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
