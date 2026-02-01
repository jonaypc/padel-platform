"use client";

import { useState } from "react";
import {
    useReservations,
    ClubReservation,
    CreateReservationData,
    UpdateReservationData
} from "../../../hooks/userReservations";
import {
    ReservationGrid,
    DateNavigator,
    CreateReservationModal,
    ReservationDetailModal
} from "../../../components/reservations";
import { Court } from "@padel/core";

export default function ReservasPage() {
    const {
        date,
        courts,
        reservations,
        clubConfig,
        loading,
        processing,
        changeDate,
        setDate,
        createReservation,
        updateReservation,
        cancelReservation,
        searchUser,
        generateTimeSlots,
        hasConflict
    } = useReservations();

    const [createSlot, setCreateSlot] = useState<{ court: Court, time: Date } | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<ClubReservation | null>(null);
    const [acknowledgedWarnings] = useState<Set<string>>(new Set());

    // --- HANDLERS ---

    const handleSlotClick = (court: Court, time: Date) => {
        setCreateSlot({ court, time });
    };

    const handleReservationClick = (reservation: ClubReservation) => {
        setSelectedReservation(reservation);
    };

    const handleCreateConfirm = async (data: CreateReservationData) => {
        // Validación extra de conflicto antes de enviar
        if (hasConflict(data.courtId, data.startTime)) {
            return { error: "Ya existe una reserva en ese horario (conflicto detectado al guardar)." };
        }

        const res = await createReservation(data);
        if (!res.error) {
            setCreateSlot(null);
        }
        return res;
    };

    const handleUpdateConfirm = async (id: string, data: UpdateReservationData, shouldClose = true) => {
        // Si cambia fecha/hora/pista, validar conflictos
        if (data.startTime || data.courtId) {
            const targetCourt = data.courtId || selectedReservation?.court_id;
            const targetTime = data.startTime || (selectedReservation ? new Date(selectedReservation.start_time) : null);

            if (targetCourt && targetTime) {
                if (hasConflict(targetCourt, targetTime, id)) {
                    return { error: "Conflicto de horario con otra reserva" };
                }
            }
        }

        const res = await updateReservation(id, data);
        if (!res.error) {
            if (shouldClose) {
                setSelectedReservation(null);
            } else if (res.data) {
                setSelectedReservation(res.data);
            }
        }
        return res;
    };

    const handleCancel = async (id: string) => {
        const res = await cancelReservation(id);
        if (!res.error) {
            setSelectedReservation(null);
        }
        return res;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mr-3" />
                Cargando calendario...
            </div>
        );
    }

    if (!clubConfig) {
        return (
            <div className="p-8 text-center text-gray-400">
                No se encontró configuración del club.
            </div>
        );
    }

    const timeSlots = generateTimeSlots();

    return (
        <div className="h-[calc(100dvh-100px)] flex flex-col gap-4">

            {/* Header / Navegación Premium */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-linear-to-r from-green-500/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-center bg-gray-900/60 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Reservas</h1>
                        </div>
                    </div>

                    <DateNavigator
                        currentDate={date}
                        onDateChange={setDate}
                        onPrev={() => changeDate(-1)}
                        onNext={() => changeDate(1)}
                        onToday={() => setDate(new Date())}
                    />

                    {/* Leyenda simple Premium */}
                    <div className="hidden lg:flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-green-900/50 border border-green-800 rounded-sm"></div>
                            <span>Reserva</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-red-900/50 border border-red-800 rounded-sm"></div>
                            <span>Bloqueo</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="relative w-2.5 h-2.5">
                                <div className="absolute inset-0 bg-red-600 rounded-sm animate-ping opacity-75"></div>
                                <div className="relative w-full h-full bg-red-600 rounded-sm"></div>
                            </div>
                            <span className="text-red-500">Pendiente</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="flex-1 overflow-hidden relative">
                <ReservationGrid
                    courts={courts}
                    timeSlots={timeSlots}
                    reservations={reservations}
                    now={new Date()}
                    acknowledgedWarnings={acknowledgedWarnings}
                    onSlotClick={handleSlotClick}
                    onReservationClick={handleReservationClick}
                />
            </div>

            {/* Modales */}
            {createSlot && (
                <CreateReservationModal
                    slot={createSlot}
                    clubConfig={clubConfig}
                    onClose={() => setCreateSlot(null)}
                    onConfirm={handleCreateConfirm}
                    onSearchUser={searchUser}
                    processing={processing}
                />
            )}

            {selectedReservation && (
                <ReservationDetailModal
                    reservation={selectedReservation}
                    courts={courts}
                    clubConfig={clubConfig}
                    onClose={() => setSelectedReservation(null)}
                    onUpdate={handleUpdateConfirm}
                    onCancel={handleCancel}
                    onSearchUser={searchUser}
                    processing={processing}
                />
            )}
        </div>
    );
}
