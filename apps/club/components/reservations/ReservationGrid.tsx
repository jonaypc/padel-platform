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
        <div className="h-full overflow-y-auto overflow-x-auto rounded-xl border border-gray-600 bg-gray-900 shadow-2xl custom-scrollbar pb-2">
            <div className="min-w-[800px] lg:min-w-0">
                {/* Cabecera de pistas */}
                <div className="flex border-b border-gray-600 sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm shadow-md">
                    <div className="w-16 shrink-0 bg-gray-800/50 sticky left-0 z-30 border-r border-gray-600 shadow-xl" />
                    {courts.map(court => (
                        <div
                            key={court.id}
                            className="flex-1 p-4 text-center border-r border-gray-600 last:border-r-0"
                        >
                            <span className="font-black text-white text-xs uppercase tracking-widest leading-none drop-shadow-sm">
                                {court.name}
                            </span>
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
                            className="flex border-b border-gray-800/80 last:border-b-0 h-24 hover:bg-white/2 transition-colors"
                        >
                            {/* Hora sticky */}
                            <div className="w-16 shrink-0 p-3 text-[10px] font-black text-gray-500 border-r border-gray-700 bg-gray-950 sticky left-0 z-10 flex flex-col justify-start shadow-2xl">
                                <span className="text-gray-300 bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-center">
                                    {slotTime}
                                </span>
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
                                        className="flex-1 border-r border-gray-800/50 last:border-r-0 p-1.5 relative group bg-grid-white/[0.02]"
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