"use client";

import { Plus } from "lucide-react";
import type { ClubReservation } from "../../hooks/userReservations";

interface ReservationSlotProps {
    reservation?: ClubReservation;
    isOccupied?: boolean;
    now: Date;
    acknowledgedWarnings: Set<string>;
    onClickEmpty: () => void;
    onClickReservation: (reservation: ClubReservation) => void;
}

export function ReservationSlot({
    reservation,
    isOccupied,
    now,
    acknowledgedWarnings,
    onClickEmpty,
    onClickReservation,
}: ReservationSlotProps) {

    const getReservationLabel = (res: ClubReservation) => {
        if (res.type === 'maintenance') return res.notes || 'BLOQUEADO';
        if (res.profiles?.display_name) return res.profiles.display_name;
        if (res.notes?.startsWith('Cliente: ')) return res.notes.replace('Cliente: ', '');
        return 'RESERVADO';
    };

    const getWarningClass = (res: ClubReservation) => {
        const endTime = new Date(res.end_time).getTime();
        const isOverdue = now.getTime() > endTime + (5 * 60 * 1000);
        const isPending = res.payment_status !== 'completed';
        const showWarning = isOverdue && isPending && !acknowledgedWarnings.has(res.id);

        return showWarning
            ? 'animate-pulse border-2 border-red-500 !bg-red-600/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)] z-20'
            : '';
    };

    // Reserva que empieza aquí
    if (reservation) {
        const isMaintenance = reservation.type === 'maintenance';

        return (
            <button
                onClick={() => onClickReservation(reservation)}
                className={`w-full h-full rounded-lg flex flex-col items-center justify-center text-[10px] leading-tight font-bold cursor-pointer transition p-1.5 text-center z-10 relative group ring-1 ring-white/5
                    ${isMaintenance
                        ? 'bg-gradient-to-br from-red-900/90 to-red-950 text-red-400 border border-red-700/50 hover:border-red-500/50 hover:from-red-800'
                        : 'bg-gradient-to-br from-green-900/90 to-green-950 text-green-400 border border-green-700/50 hover:border-green-500/50 hover:from-green-800'
                    }
                    ${getWarningClass(reservation)}
                `}
                style={{ height: 'calc(100% + 2px)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.6)' }}
            >
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${isMaintenance ? 'bg-red-500' : 'bg-green-500'} opacity-50`} />

                <span className="uppercase tracking-widest opacity-50 block text-[7px] mb-1 font-black">
                    {isMaintenance ? 'Bloqueo' : 'Reserva'}
                </span>
                <span className="truncate w-full inline-block px-1 text-[11px] font-black uppercase tracking-tight">
                    {getReservationLabel(reservation)}
                </span>

                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-lg" />
            </button>
        );
    }

    // Slot ocupado por reserva que empezó antes
    if (isOccupied) {
        return (
            <div className="w-full h-full rounded bg-gray-800/80 border border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-[10px] text-gray-600">Ocupado</span>
            </div>
        );
    }

    // Slot vacío
    return (
        <button
            onClick={onClickEmpty}
            className="w-full h-full rounded hover:bg-gray-800/50 text-transparent hover:text-gray-500 text-xs flex items-center justify-center transition"
        >
            <Plus size={16} />
        </button>
    );
}