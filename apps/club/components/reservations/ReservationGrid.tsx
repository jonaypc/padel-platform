"use client";

import { ReservationSlot } from "./ReservationSlot";
import type { Court } from "@padel/core";
import type { ClubReservation } from "../../hooks/userReservations";

interface ReservationGridProps {
    courts: Court[];
    timeSlots: Date[];
    reservations: ClubReservation[];
    now: Date;
    acknowledgedWarnings: Set<string>;
    onSlotClick: (court: Court, time: Date) => void;
    onReservationClick: (reservation: ClubReservation) => void;
}

export function ReservationGrid({
    courts,
    timeSlots,
    reservations,
    now,
    acknowledgedWarnings,
    onSlotClick,
    onReservationClick,
}: ReservationGridProps) {

    const findStartingReservation = (courtId: string, slotTime: number) => {
        return reservations.find(r =>
            r.court_id === courtId &&
            new Date(r.start_time).getTime() === slotTime
        );
    };

    const findOverlappingReservation = (courtId: string, slotTime: number) => {
        return reservations.find(r => {
            if (r.court_id !== courtId) return false;
            const start = new Date(r.start_time).getTime();
            const end = new Date(r.end_time).getTime();
            return slotTime > start && slotTime < end;
        });
    };

    return (
        <div className="h-full overflow-y-auto overflow-x-auto rounded-xl border border-gray-700 bg-gray-900/50 custom-scrollbar pb-2">
            <div className="min-w-[800px] lg:min-w-0">
                {/* Cabecera de pistas */}
                <div className="flex border-b border-gray-700 sticky top-0 z-20 bg-gray-900 shadow-sm">
                    <div className="w-16 shrink-0 bg-gray-800 sticky left-0 z-30 border-r border-gray-700 shadow-md" />
                    {courts.map(court => (
                        <div
                            key={court.id}
                            className="flex-1 p-3 text-center border-r border-gray-700 bg-gray-800 last:border-r-0"
                        >
                            <span className="font-semibold text-white text-sm">{court.name}</span>
                        </div>
                    ))}
                </div>

                {/* Filas de horarios */}
                {timeSlots.map((slot) => {
                    const slotMs = slot.getTime();
                    const slotTime = slot.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return (
                        <div
                            key={slotMs}
                            className="flex border-b border-gray-800 last:border-b-0 h-20 hover:bg-white/5 transition-colors"
                        >
                            {/* Hora sticky */}
                            <div className="w-16 shrink-0 p-2 text-xs text-gray-400 border-r border-gray-700 bg-gray-900 sticky left-0 z-10 flex flex-col justify-between shadow-md">
                                <span>{slotTime}</span>
                            </div>

                            {/* Celdas por pista */}
                            {courts.map(court => {
                                const startingReservation = findStartingReservation(court.id, slotMs);
                                const overlappingReservation = !startingReservation
                                    ? findOverlappingReservation(court.id, slotMs)
                                    : undefined;

                                return (
                                    <div
                                        key={`${court.id}-${slotMs}`}
                                        className="flex-1 border-r border-gray-800 last:border-r-0 p-1 relative group"
                                    >
                                        <ReservationSlot
                                            reservation={startingReservation}
                                            isOccupied={!!overlappingReservation}
                                            now={now}
                                            acknowledgedWarnings={acknowledgedWarnings}
                                            onClickEmpty={() => onSlotClick(court, slot)}
                                            onClickReservation={onReservationClick}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}