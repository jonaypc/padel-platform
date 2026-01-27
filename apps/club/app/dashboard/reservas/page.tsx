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

    const handleUpdateConfirm = async (id: string, data: UpdateReservationData) => {
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
            setSelectedReservation(null);
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
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">

            {/* Header / Navegación */}
            <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded-xl border border-gray-700">
                <h1 className="text-xl font-bold text-white px-2">Reservas</h1>
                <DateNavigator
                    currentDate={date}
                    onDateChange={setDate}
                    onPrev={() => changeDate(-1)}
                    onNext={() => changeDate(1)}
                    onToday={() => setDate(new Date())}
                />

                {/* Leyenda simple */}
                <div className="hidden md:flex gap-3 text-xs text-gray-400 px-2">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-900/50 border border-green-800 rounded"></div>
                        <span>Reserva</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-900/50 border border-red-800 rounded"></div>
                        <span>Bloqueo</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-600 rounded animate-pulse"></div>
                        <span>Pago Pendiente (Expirando)</span>
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
                    processing={processing}
                />
            )}
        </div>
    );
}
