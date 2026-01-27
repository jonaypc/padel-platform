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
                className={`w-full h-full rounded flex flex-col items-center justify-center text-[10px] leading-tight font-bold cursor-pointer transition p-1 text-center z-10 relative
                    ${isMaintenance
                        ? 'bg-red-900/90 text-red-400 border border-red-800 hover:bg-red-900'
                        : 'bg-green-900/90 text-green-400 border border-green-800 hover:bg-green-900'
                    }
                    ${getWarningClass(reservation)}
                `}
                style={{ height: 'calc(100% + 2px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
            >
                <span className="uppercase tracking-tighter opacity-70 block text-[8px] mb-0.5">
                    {isMaintenance ? 'Mantenimiento' : 'Pista'}
                </span>
                <span className="truncate w-full inline-block">
                    {getReservationLabel(reservation)}
                </span>
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