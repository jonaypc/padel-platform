"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";
import PageWrapper from "../components/PageWrapper";
import { Search, X, User, MapPin, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface InvitedPlayer {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

interface Club {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  booking_duration: number;
  opening_hour: number;
  closing_hour: number;
}

interface Court {
  id: string;
  name: string;
  type: string;
}

interface Reservation {
  start_time: string;
  end_time: string;
  court_id: string;
}

export default function OrganizeMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Datos básicos, 2: Disponibilidad, 3: Jugadores

  // Datos básicos
  const [matchType, setMatchType] = useState("pachanga");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [customLocation, setCustomLocation] = useState("");

  // Disponibilidad (solo si hay club seleccionado)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ court: Court; time: Date } | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Jugadores
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InvitedPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedPlayers, setInvitedPlayers] = useState<InvitedPlayer[]>([]);

  const [shareCode, setShareCode] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Cargar clubs al inicio
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      }
    });

    async function loadClubs() {
      const { data } = await supabase
        .from('clubs')
        .select('id, name, slug, location, booking_duration, opening_hour, closing_hour')
        .order('name');
      setClubs(data || []);
    }
    loadClubs();
  }, [router]);

  // Cargar pistas cuando se selecciona club
  useEffect(() => {
    if (!selectedClub) {
      setCourts([]);
      return;
    }

    async function loadCourts() {
      if (!selectedClub) return;
      const { data } = await supabase
        .from('courts')
        .select('id, name, type')
        .eq('club_id', selectedClub.id)
        .eq('is_active', true)
        .order('name');
      setCourts(data || []);
    }
    loadCourts();
  }, [selectedClub]);

  // Cargar disponibilidad cuando cambia fecha o club
  const loadAvailability = useCallback(async () => {
    if (!selectedClub) return;
    setLoadingAvailability(true);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('reservations')
      .select('start_time, end_time, court_id')
      .eq('club_id', selectedClub.id)
      .gte('start_time', startOfDay.toISOString())
      .lte('end_time', endOfDay.toISOString())
      .neq('status', 'cancelled');

    setReservations(data || []);
    setLoadingAvailability(false);
  }, [selectedClub, selectedDate]);

  useEffect(() => {
    if (selectedClub && step === 2) {
      loadAvailability();
    }
  }, [selectedClub, selectedDate, step, loadAvailability]);

  // Generar slots horarios
  const timeSlots: Date[] = [];
  if (selectedClub) {
    const startHour = selectedClub.opening_hour ?? 9;
    const endHour = selectedClub.closing_hour ?? 22;
    const duration = selectedClub.booking_duration ?? 90;
    const current = new Date(selectedDate);
    current.setHours(startHour, 0, 0, 0);

    while (current.getHours() < endHour) {
      timeSlots.push(new Date(current));
      current.setMinutes(current.getMinutes() + duration);
    }
  }

  // Verificar disponibilidad de un slot
  const getAvailableCourts = (time: Date) => {
    return courts.filter(court => {
      const hasCollision = reservations.some(res => {
        if (res.court_id !== court.id) return false;
        const resStart = new Date(res.start_time).getTime();
        return Math.abs(resStart - time.getTime()) < 60000;
      });
      return !hasCollision;
    });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  // Buscar jugadores
  async function handleSearch() {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_players', {
        search_term: searchQuery,
        result_limit: 10
      });
      if (error) {
        setSearchResults([]);
      } else {
        const filtered = (data || []).filter(
          (p: InvitedPlayer) => !invitedPlayers.some(inv => inv.id === p.id)
        );
        setSearchResults(filtered);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addPlayer(player: InvitedPlayer) {
    if (invitedPlayers.length >= 3) {
      alert('Máximo 3 jugadores');
      return;
    }
    setInvitedPlayers([...invitedPlayers, player]);
    setSearchResults([]);
    setSearchQuery("");
  }

  function removePlayer(playerId: string) {
    setInvitedPlayers(invitedPlayers.filter(p => p.id !== playerId));
  }

  async function createMatch() {
    setLoading(true);
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMsg("No estás logueado.");
      setLoading(false);
      return;
    }

    const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Determinar fecha/hora del partido
    let playedAt: string;
    let reservationId: string | null = null;

    if (selectedSlot && selectedClub) {
      playedAt = selectedSlot.time.toISOString();

      // Crear reserva primero
      const endTime = new Date(selectedSlot.time);
      endTime.setMinutes(selectedSlot.time.getMinutes() + (selectedClub.booking_duration || 90));

      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .insert({
          club_id: selectedClub.id,
          court_id: selectedSlot.court.id,
          user_id: userData.user.id,
          start_time: selectedSlot.time.toISOString(),
          end_time: endTime.toISOString(),
          status: 'confirmed',
          type: 'booking',
          notes: `Partido compartido - Código: ${generatedCode}`
        })
        .select('id')
        .single();

      if (resError) {
        setMsg('Error creando reserva: ' + resError.message);
        setLoading(false);
        return;
      }
      reservationId = resData?.id || null;
    } else {
      // Sin club seleccionado, usar fecha/hora manual
      const today = new Date();
      playedAt = today.toISOString();
    }

    // Crear partido
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert({
        user_id: userData.user.id,
        match_type: matchType,
        location: selectedClub?.name || customLocation || null,
        club_id: selectedClub?.id || null,
        reservation_id: reservationId,
        played_at: playedAt,
        notes: `PARTIDO COMPARTIDO - Código: ${generatedCode}`,
      })
      .select('id')
      .single();

    if (matchError || !matchData) {
      setMsg(matchError?.message || 'Error creando partido');
      setLoading(false);
      return;
    }

    // Añadir participantes
    if (invitedPlayers.length > 0) {
      const participants = invitedPlayers.map((player, index) => ({
        match_id: matchData.id,
        user_id: player.id,
        role: index === 0 ? 'partner' : `opponent${index}`,
        confirmed: false
      }));
      await supabase.from('match_participants').insert(participants);
    }

    setShareCode(generatedCode);
    setMsg("¡Partido creado con éxito!");
    setLoading(false);
  }

  return (
    <PageWrapper>
      <div className="mb-4">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-500 transition"
        >
          <span>←</span>
          <span>{step > 1 ? 'Paso anterior' : 'Volver'}</span>
        </button>
      </div>

      <PageHeader
        title="Organizar Partido"
        subtitle={`Paso ${step} de 3`}
      />

      {/* Progress bar */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-green-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {/* PASO 1: Datos básicos */}
      {step === 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Tipo de partido</label>
            <select
              className="mt-1 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
            >
              <option value="pachanga">Pachanga</option>
              <option value="entrenamiento">Entrenamiento</option>
              <option value="liga">Liga</option>
              <option value="torneo">Torneo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">¿Dónde juegas?</label>
            {clubs.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {clubs.map(club => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => {
                      setSelectedClub(selectedClub?.id === club.id ? null : club);
                      if (selectedClub?.id !== club.id) setCustomLocation("");
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition ${selectedClub?.id === club.id
                      ? 'bg-green-900/30 border-green-600 text-green-400'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                      }`}
                  >
                    <MapPin size={14} />
                    <span className="truncate">{club.name}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              className="mt-2 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3 w-full"
              value={customLocation}
              onChange={(e) => {
                setCustomLocation(e.target.value);
                if (e.target.value) setSelectedClub(null);
              }}
              placeholder={selectedClub ? "O escribe otra ubicación..." : "Escribe la ubicación..."}
            />
          </div>

          <button
            onClick={() => setStep(selectedClub ? 2 : 3)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition"
          >
            {selectedClub ? 'Elegir horario →' : 'Invitar jugadores →'}
          </button>
        </div>
      )}

      {/* PASO 2: Disponibilidad (solo si hay club) */}
      {step === 2 && selectedClub && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="text-gray-400" />
            </button>
            <div className="text-center">
              <h2 className="text-white font-semibold capitalize">
                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                <Clock size={10} /> {selectedClub.booking_duration} min
              </p>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-700 rounded-lg">
              <ChevronRight className="text-gray-400" />
            </button>
          </div>

          {loadingAvailability ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timeSlots.map((slot, i) => {
                const freeCourts = getAvailableCourts(slot);
                const isFull = freeCourts.length === 0;
                const timeStr = slot.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const isSelected = selectedSlot?.time.getTime() === slot.getTime();

                const now = new Date();
                const isPast = selectedDate.toDateString() === now.toDateString() && slot.getTime() < now.getTime();
                if (isPast) return null;

                return (
                  <div
                    key={i}
                    className={`flex justify-between items-center p-3 rounded-lg border ${isSelected ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-900'
                      } ${isFull ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-white font-bold">{timeStr}</span>
                      <span className={`text-sm ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                        {isFull ? 'Completo' : `${freeCourts.length} pista${freeCourts.length > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    {!isFull && (
                      <select
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white"
                        value={isSelected ? selectedSlot?.court.id : ''}
                        onChange={(e) => {
                          const court = freeCourts.find(c => c.id === e.target.value);
                          if (court) setSelectedSlot({ court, time: slot });
                        }}
                      >
                        <option value="">Elegir pista</option>
                        {freeCourts.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            disabled={!selectedSlot}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition"
          >
            {selectedSlot ? `Confirmar ${selectedSlot.court.name} →` : 'Selecciona un horario'}
          </button>
        </div>
      )}

      {/* PASO 3: Jugadores y confirmación */}
      {step === 3 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          {/* Resumen */}
          {selectedSlot && selectedClub && (
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm">Reserva:</p>
              <p className="text-white font-semibold">{selectedClub.name} - {selectedSlot.court.name}</p>
              <p className="text-green-400 text-sm">
                {selectedSlot.time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedSlot.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300">Invitar Jugadores</label>

            {invitedPlayers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {invitedPlayers.map(player => (
                  <div key={player.id} className="flex items-center gap-2 bg-green-900/30 border border-green-800 rounded-full px-3 py-1.5">
                    <User size={12} className="text-green-300" />
                    <span className="text-sm text-green-300">{player.display_name}</span>
                    <button onClick={() => removePlayer(player.id)} className="text-green-400 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 py-3"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar jugador..."
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 rounded-lg"
              >
                {searching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                {searchResults.map(player => (
                  <button
                    key={player.id}
                    onClick={() => addPlayer(player)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 transition text-left border-b border-gray-800 last:border-b-0"
                  >
                    <User size={18} className="text-gray-400" />
                    <div>
                      <p className="text-white font-medium">{player.display_name}</p>
                      {player.username && <p className="text-xs text-gray-500">@{player.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón de crear o ver partidos si ya se creó */}
          {!shareCode ? (
            <button
              onClick={createMatch}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition"
            >
              {loading ? 'Creando...' : '✓ Crear Partido'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-700 bg-green-900/30 p-4 text-center">
                <p className="text-green-400 font-semibold text-lg">¡Partido creado con éxito!</p>
                <div className="mt-3 flex items-center justify-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                  <span className="text-xl font-mono text-green-400">{shareCode}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareCode); alert('Código copiado'); }}
                    className="text-sm text-green-400 hover:underline"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <button
                onClick={() => router.push('/matches')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
              >
                Ver mis partidos →
              </button>

              <button
                onClick={() => {
                  // Reset todo para nuevo partido
                  setStep(1);
                  setSelectedClub(null);
                  setCustomLocation('');
                  setSelectedSlot(null);
                  setInvitedPlayers([]);
                  setShareCode(null);
                  setMsg(null);
                }}
                className="w-full border border-gray-600 text-gray-400 py-2 rounded-lg text-sm hover:text-white transition"
              >
                Organizar otro partido
              </button>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
