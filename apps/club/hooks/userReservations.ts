"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import type { Court, Reservation, ReservationStatus, ReservationType } from "@padel/core";

export interface ReservationPlayer {
    name: string;
    paid: boolean;
    amount: number;
    courtPrice?: number;
    id?: string;
    email?: string;
}

export interface ReservationItem {
    id?: string;
    name: string;
    quantity: number;
    price: number;
    assignedTo?: string[];
}

export interface CreateReservationData {
    courtId: string;
    startTime: Date;
    userId?: string | null;
    type: ReservationType;
    price: number;
    notes?: string;
    players?: ReservationPlayer[];
    items?: ReservationItem[];
}

export interface UpdateReservationData {
    courtId?: string;
    startTime?: Date;
    price?: number;
    notes?: string;
    players?: ReservationPlayer[];
    items?: ReservationItem[];
}

export interface ClubReservation extends Omit<Reservation, 'court' | 'user'> {
    players?: ReservationPlayer[];
    items?: ReservationItem[];
    payment_status?: 'pending' | 'partial' | 'completed';
    profiles?: { display_name: string | null } | null;
}

export interface ClubConfig {
    id: string;
    duration: number;
    defaultPrice: number;
    openingHour: number;
    closingHour: number;
    shifts: WeekSchedule | null;
    extras: { name: string; price: number }[];
    priceTemplates: { label: string; price: number }[];
}

type Shift = { start: string; end: string };
type WeekSchedule = Record<string, Shift[]>;

export function useReservations() {
    const [date, setDate] = useState(new Date());
    const [courts, setCourts] = useState<Court[]>([]);
    const [reservations, setReservations] = useState<ClubReservation[]>([]);
    const [clubConfig, setClubConfig] = useState<ClubConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const supabase = createBrowserClient();

    // Cargar datos iniciales del club
    useEffect(() => {
        async function loadClubData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data: members, error } = await supabase
                    .from('club_members')
                    .select(`
                        club_id, 
                        clubs(
                            id, name, booking_duration, default_price, 
                            opening_hour, closing_hour, extras, 
                            price_templates, shifts
                        )
                    `)
                    .eq('user_id', user.id)
                    .limit(1);

                if (error || !members?.length) {
                    console.error('Error loading club:', error);
                    return;
                }

                const member = members[0] as any;
                const club = Array.isArray(member.clubs) ? member.clubs[0] : member.clubs;

                if (!club) return;

                // Cargar pistas
                const { data: courtsData } = await supabase
                    .from('courts')
                    .select('id, name, price, type, surface, is_active')
                    .eq('club_id', member.club_id)
                    .eq('is_active', true)
                    .order('name');

                setCourts((courtsData as Court[]) || []);
                setClubConfig({
                    id: member.club_id,
                    duration: club.booking_duration || 90,
                    defaultPrice: club.default_price || 0,
                    openingHour: club.opening_hour ?? 8,
                    closingHour: club.closing_hour ?? 23,
                    shifts: club.shifts || null,
                    extras: club.extras || [],
                    priceTemplates: club.price_templates || [],
                });
            } catch (error) {
                console.error("Error loading club data:", error);
            } finally {
                setLoading(false);
            }
        }

        loadClubData();
    }, [supabase]);

    // Cargar reservas del día
    const loadReservations = useCallback(async () => {
        if (!clubConfig?.id) return;

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('reservations')
            .select('*, profiles(display_name)')
            .eq('club_id', clubConfig.id)
            .lt('start_time', endOfDay.toISOString())
            .gt('end_time', startOfDay.toISOString())
            .neq('status', 'cancelled');

        if (error) {
            console.error('Error fetching reservations:', error);
        }

        setReservations((data as ClubReservation[]) || []);
    }, [clubConfig?.id, date, supabase]);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    // Crear reserva
    const createReservation = async (data: {
        courtId: string;
        startTime: Date;
        userId?: string | null;
        type: ReservationType;
        price: number;
        notes?: string;
        players?: ReservationPlayer[];
        items?: ReservationItem[];
    }) => {
        if (!clubConfig) return { error: 'No club config' };

        setProcessing(true);

        try {
            const endTime = new Date(data.startTime);
            endTime.setMinutes(data.startTime.getMinutes() + clubConfig.duration);

            const playersPaid = data.players?.filter(p => p.paid).length || 0;
            const totalPlayers = data.players?.length || 0;
            let paymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
            if (playersPaid === totalPlayers && totalPlayers > 0) paymentStatus = 'completed';
            else if (playersPaid > 0) paymentStatus = 'partial';

            const { error } = await supabase.from('reservations').insert({
                club_id: clubConfig.id,
                court_id: data.courtId,
                user_id: data.userId || null,
                start_time: data.startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                type: data.type,
                price: data.price,
                notes: data.notes,
                players: data.players?.filter(p => p.name.trim() !== ''),
                items: data.items,
                payment_status: paymentStatus,
            });

            if (error) {
                console.error("Error creating reservation (DB):", error);
                return { error: error.message };
            }

            await loadReservations();
            return { error: null };
        } catch (err: any) {
            console.error("Unexpected error creating reservation:", err);
            return { error: err.message || "Error desconocido" };
        } finally {
            setProcessing(false);
        }
    };

    // Actualizar reserva
    const updateReservation = async (
        id: string,
        data: {
            courtId?: string;
            startTime?: Date;
            price?: number;
            notes?: string;
            players?: ReservationPlayer[];
            items?: ReservationItem[];
        }
    ) => {
        if (!clubConfig) return { error: 'No club config' };

        setProcessing(true);

        try {
            const updateData: any = {};

            if (data.courtId) updateData.court_id = data.courtId;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.players) updateData.players = data.players.filter(p => p.name.trim() !== '');
            if (data.items) updateData.items = data.items;

            if (data.startTime) {
                const endTime = new Date(data.startTime);
                endTime.setMinutes(data.startTime.getMinutes() + clubConfig.duration);
                updateData.start_time = data.startTime.toISOString();
                updateData.end_time = endTime.toISOString();
            }

            if (data.players) {
                const playersPaid = data.players.filter(p => p.paid).length;
                const totalPlayers = data.players.length;
                if (playersPaid === totalPlayers && totalPlayers > 0) {
                    updateData.payment_status = 'completed';
                } else if (playersPaid > 0) {
                    updateData.payment_status = 'partial';
                } else {
                    updateData.payment_status = 'pending';
                }
            }

            const { error } = await supabase
                .from('reservations')
                .update(updateData)
                .eq('id', id);

            if (error) return { error: error.message };

            await loadReservations();
            return { error: null };
        } catch (err: any) {
            console.error("Unexpected error updating reservation:", err);
            return { error: err.message };
        } finally {
            setProcessing(false);
        }
    };

    // Cancelar reserva
    const cancelReservation = async (id: string) => {
        setProcessing(true);

        try {
            const { error } = await supabase
                .from('reservations')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) return { error: error.message };

            await loadReservations();
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        } finally {
            setProcessing(false);
        }
    };

    // Buscar usuario
    const searchUser = async (query: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .ilike('display_name', `%${query}%`)
            .limit(5);

        if (error) return { data: null, error: error.message };
        return { data, error: null };
    };

    // Cambiar fecha
    const changeDate = (days: number) => {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + days);
        setDate(newDate);
    };

    // Generar time slots
    const generateTimeSlots = useCallback(() => {
        if (!clubConfig) return [];

        const dayIndex = date.getDay();
        const dayKey = dayIndex === 0 ? "7" : dayIndex.toString();

        let dayShifts: Shift[] = [];

        if (clubConfig.shifts && Array.isArray(clubConfig.shifts[dayKey])) {
            dayShifts = clubConfig.shifts[dayKey];
        } else {
            dayShifts = [{
                start: `${clubConfig.openingHour.toString().padStart(2, '0')}:00`,
                end: `${clubConfig.closingHour.toString().padStart(2, '0')}:00`
            }];
        }

        const baseSlots: Date[] = [];

        dayShifts.forEach(shift => {
            const [startHour = 0, startMin = 0] = shift.start.split(':').map(Number);
            const [endHour = 0, endMin = 0] = shift.end.split(':').map(Number);

            const shiftStart = new Date(date);
            shiftStart.setHours(startHour, startMin, 0, 0);

            const shiftEnd = new Date(date);
            shiftEnd.setHours(endHour, endMin, 0, 0);

            const ptr = new Date(shiftStart);
            while (ptr.getTime() < shiftEnd.getTime()) {
                const nextTime = new Date(ptr);
                nextTime.setMinutes(ptr.getMinutes() + clubConfig.duration);

                if (nextTime.getTime() <= shiftEnd.getTime()) {
                    baseSlots.push(new Date(ptr));
                }
                ptr.setMinutes(ptr.getMinutes() + clubConfig.duration);
            }
        });

        // Agregar slots de reservas existentes
        const reservationSlots = reservations.flatMap(r => {
            const start = new Date(r.start_time);
            start.setSeconds(0, 0);
            const end = new Date(r.end_time);
            end.setSeconds(0, 0);
            return [start, end];
        });

        const allTimestamps = new Set([
            ...baseSlots.map(d => { d.setSeconds(0, 0); return d.getTime(); }),
            ...reservationSlots.map(d => d.getTime())
        ]);

        return Array.from(allTimestamps)
            .sort((a, b) => a - b)
            .map(ts => new Date(ts));
    }, [clubConfig, date, reservations]);

    // Verificar conflictos
    const hasConflict = useCallback((
        courtId: string,
        startTime: Date,
        excludeId?: string
    ) => {
        if (!clubConfig) return false;

        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + clubConfig.duration);

        return reservations.some(r => {
            if (excludeId && r.id === excludeId) return false;
            if (r.court_id !== courtId) return false;

            const rStart = new Date(r.start_time).getTime();
            const rEnd = new Date(r.end_time).getTime();

            return startTime.getTime() < rEnd && endTime.getTime() > rStart;
        });
    }, [clubConfig, reservations]);

    return {
        // Estado
        date,
        courts,
        reservations,
        clubConfig,
        loading,
        processing,

        // Acciones
        changeDate,
        setDate,
        createReservation,
        updateReservation,
        cancelReservation,
        searchUser,
        loadReservations,

        // Utilidades
        generateTimeSlots,
        hasConflict,
    };
}