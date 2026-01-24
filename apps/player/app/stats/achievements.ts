import { MatchRow } from "./types";

export type AchievementStatus = 'locked' | 'progress' | 'unlocked';

export type AchievementResult = {
  id: string;
  title: string;
  description: string;
  status: AchievementStatus;
  progress?: {
    current: number;
    target: number;
  };
};

// Copia exacta de isIncompleteMatch desde page.tsx
function isIncompleteMatch(m: MatchRow): boolean {
  // Verificar si el partido está marcado como inacabado en las notas
  if (m.notes && m.notes.includes("[PARTIDO INACABADO")) {
    return true;
  }
  
  // Verificar si hay sets completados pero no hay un ganador claro
  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];

  let us = 0;
  let them = 0;
  let setsCompletados = 0;

  for (const [a, b] of sets) {
    if (a == null || b == null) continue;
    setsCompletados++;
    if (a > b) us++;
    else if (b > a) them++;
  }

  if (setsCompletados === 0) return false; // No hay sets, no está inacabado (simplemente sin resultado)
  
  // Un partido está completo si:
  // - Se han jugado al menos 2 sets y un equipo ha ganado 2 sets
  // - O se han jugado 3 sets y hay un ganador claro
  const partidoCompleto = (setsCompletados >= 2 && (us >= 2 || them >= 2)) || 
                          (setsCompletados === 3 && us !== them);
  
  return !partidoCompleto; // Si no está completo y hay sets, está inacabado
}

// Copia exacta de isWin desde page.tsx
function isWin(m: MatchRow): boolean | null {
  // Si está inacabado, no cuenta como victoria ni derrota
  if (isIncompleteMatch(m)) return null;
  
  const sets: Array<[number | null, number | null]> = [
    [m.set1_us, m.set1_them],
    [m.set2_us, m.set2_them],
    [m.set3_us, m.set3_them],
  ];

  let us = 0;
  let them = 0;

  for (const [a, b] of sets) {
    if (a == null || b == null) continue;
    if (a > b) us++;
    else if (b > a) them++;
  }

  if (us === 0 && them === 0) return null;
  if (us === them) return null;
  return us > them;
}

// Función helper para calcular semana ISO (sin librerías)
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  // Encontrar el jueves de la semana (ISO week starts on Monday)
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a lunes
  const thursday = new Date(d.setDate(diff + 3));
  
  const year = thursday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((thursday.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNo = Math.ceil((days + jan1.getDay() + 1) / 7);
  
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

// Función helper para calcular semanas consecutivas usando índices numéricos
function calculateMaxConsecutiveWeeks(weekKeys: string[]): number {
  if (weekKeys.length === 0) return 0;
  
  // Convertir "YYYY-Wxx" a índice numérico: year*53 + week
  const indices = [...new Set(weekKeys)].map(key => {
    const [year, week] = key.split('-W').map(Number);
    return year * 53 + week;
  });
  
  // Ordenar índices
  indices.sort((a, b) => a - b);
  
  if (indices.length === 0) return 0;
  if (indices.length === 1) return 1;
  
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === indices[i - 1] + 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }
  
  return maxConsecutive;
}

// Normalizar string: trim, lowercase, filtrar vacíos
function normalizeString(s: string | null): string | null {
  if (!s) return null;
  const normalized = s.trim().toLowerCase();
  return normalized === '' ? null : normalized;
}

export function computeAchievements(matches: MatchRow[]): AchievementResult[] {
  const totalMatches = matches.length;
  
  // Ordenar matches por played_at DESC (null al final) antes de calcular racha
  const sortedMatches = [...matches].sort((a, b) => {
    if (!a.played_at && !b.played_at) return 0;
    if (!a.played_at) return 1;
    if (!b.played_at) return -1;
    return new Date(b.played_at).getTime() - new Date(a.played_at).getTime();
  });
  
  // Calcular resultados usando isWin copiada
  const results = sortedMatches.map(isWin);
  const validResults = results.filter((r): r is boolean => r !== null);
  const wins = validResults.filter(r => r === true).length;
  const matchesWithResult = validResults.length;
  const winRate = matchesWithResult > 0 ? wins / matchesWithResult : 0;
  
  // Calcular racha actual: ignorar null (no suma y no corta), solo false corta
  let currentWinStreak = 0;
  for (const result of results) {
    if (result === true) {
      currentWinStreak++;
    } else if (result === false) {
      break; // Solo una derrota corta la racha
    }
    // null se ignora (no suma ni corta)
  }
  
  // Calcular semanas ISO
  const weekKeys: string[] = [];
  matches.forEach(m => {
    if (!m.played_at) return;
    const date = new Date(m.played_at);
    if (Number.isNaN(date.getTime())) return;
    weekKeys.push(getISOWeek(date));
  });
  const distinctWeeksCount = new Set(weekKeys).size;
  const maxConsecutiveWeeks = calculateMaxConsecutiveWeeks(weekKeys);
  
  // Calcular variedad con normalización
  const validMatchTypes = new Set(["pachanga", "entrenamiento", "liga", "torneo"]);
  const matchTypes = new Set<string>();
  matches.forEach(m => {
    const normalized = normalizeString(m.match_type);
    if (normalized && validMatchTypes.has(normalized)) {
      matchTypes.add(normalized);
    }
  });
  const matchTypesUsed = matchTypes.size;
  
  const locations = new Set<string>();
  matches.forEach(m => {
    const normalized = normalizeString(m.location);
    if (normalized) locations.add(normalized);
  });
  const distinctLocations = locations.size;
  
  const partners = new Set<string>();
  matches.forEach(m => {
    const normalized = normalizeString(m.partner_name);
    if (normalized) partners.add(normalized);
  });
  const distinctPartners = partners.size;
  
  // Opponents: combinar opponent1_name y opponent2_name normalizados
  const opponents = new Set<string>();
  matches.forEach(m => {
    const opp1 = normalizeString(m.opponent1_name);
    const opp2 = normalizeString(m.opponent2_name);
    if (opp1) opponents.add(opp1);
    if (opp2) opponents.add(opp2);
  });
  const distinctOpponents = opponents.size;
  
  // Definir logros
  const achievements: AchievementResult[] = [];
  
  // A. Progreso
  achievements.push({
    id: 'first-step',
    title: 'Primer paso',
    description: 'Juega tu primer partido',
    status: totalMatches >= 1 ? 'unlocked' : 'locked',
    progress: totalMatches < 1 ? { current: 0, target: 1 } : undefined,
  });
  
  achievements.push({
    id: 'regular-player',
    title: 'Jugador habitual',
    description: 'Juega 10 partidos',
    status: totalMatches >= 10 ? 'unlocked' : totalMatches >= 1 ? 'progress' : 'locked',
    progress: totalMatches < 10 ? { current: totalMatches, target: 10 } : undefined,
  });
  
  achievements.push({
    id: 'in-shape',
    title: 'En forma',
    description: 'Juega 25 partidos',
    status: totalMatches >= 25 ? 'unlocked' : totalMatches >= 1 ? 'progress' : 'locked',
    progress: totalMatches < 25 ? { current: totalMatches, target: 25 } : undefined,
  });
  
  achievements.push({
    id: 'court-veteran',
    title: 'Veterano de pista',
    description: 'Juega 50 partidos',
    status: totalMatches >= 50 ? 'unlocked' : totalMatches >= 1 ? 'progress' : 'locked',
    progress: totalMatches < 50 ? { current: totalMatches, target: 50 } : undefined,
  });
  
  // B. Rendimiento
  achievements.push({
    id: 'first-victory',
    title: 'Primera victoria',
    description: 'Gana tu primer partido',
    status: wins >= 1 ? 'unlocked' : 'locked',
    progress: wins < 1 ? { current: 0, target: 1 } : undefined,
  });
  
  achievements.push({
    id: 'on-streak',
    title: 'En racha',
    description: 'Racha de 3 victorias consecutivas',
    status: currentWinStreak >= 3 ? 'unlocked' : currentWinStreak >= 1 ? 'progress' : 'locked',
    progress: currentWinStreak < 3 ? { current: currentWinStreak, target: 3 } : undefined,
  });
  
  achievements.push({
    id: 'unstoppable',
    title: 'Imparable',
    description: 'Racha de 5 victorias consecutivas',
    status: currentWinStreak >= 5 ? 'unlocked' : currentWinStreak >= 1 ? 'progress' : 'locked',
    progress: currentWinStreak < 5 ? { current: currentWinStreak, target: 5 } : undefined,
  });
  
  achievements.push({
    id: 'dominator',
    title: 'Dominador',
    description: '70% de victorias con 20+ partidos',
    status: winRate >= 0.70 && totalMatches >= 20 ? 'unlocked' : totalMatches >= 1 ? 'progress' : 'locked',
    progress: totalMatches < 20 
      ? { current: totalMatches, target: 20 }
      : winRate < 0.70
      ? { current: Math.round(winRate * 100), target: 70 }
      : undefined,
  });
  
  // C. Constancia
  achievements.push({
    id: 'consistent',
    title: 'Constante',
    description: 'Juega en 3 semanas distintas',
    status: distinctWeeksCount >= 3 ? 'unlocked' : distinctWeeksCount >= 1 ? 'progress' : 'locked',
    progress: distinctWeeksCount < 3 ? { current: distinctWeeksCount, target: 3 } : undefined,
  });
  
  achievements.push({
    id: 'no-excuses',
    title: 'Sin excusas',
    description: '4 semanas consecutivas jugando',
    status: maxConsecutiveWeeks >= 4 ? 'unlocked' : maxConsecutiveWeeks >= 1 ? 'progress' : 'locked',
    progress: maxConsecutiveWeeks < 4 ? { current: maxConsecutiveWeeks, target: 4 } : undefined,
  });
  
  achievements.push({
    id: 'winning-routine',
    title: 'Rutina ganadora',
    description: '8 semanas consecutivas jugando',
    status: maxConsecutiveWeeks >= 8 ? 'unlocked' : maxConsecutiveWeeks >= 1 ? 'progress' : 'locked',
    progress: maxConsecutiveWeeks < 8 ? { current: maxConsecutiveWeeks, target: 8 } : undefined,
  });
  
  // D. Variedad / exploración
  achievements.push({
    id: 'all-match-types',
    title: 'Todo tipo de partidos',
    description: 'Juega los 4 tipos de partido',
    status: matchTypesUsed >= 4 ? 'unlocked' : matchTypesUsed >= 1 ? 'progress' : 'locked',
    progress: matchTypesUsed < 4 ? { current: matchTypesUsed, target: 4 } : undefined,
  });
  
  achievements.push({
    id: 'versatile-player',
    title: 'Jugador versátil',
    description: 'Juega en 3 ubicaciones distintas',
    status: distinctLocations >= 3 ? 'unlocked' : distinctLocations >= 1 ? 'progress' : 'locked',
    progress: distinctLocations < 3 ? { current: distinctLocations, target: 3 } : undefined,
  });
  
  achievements.push({
    id: 'different-partners',
    title: 'Con diferentes parejas',
    description: 'Juega con 3 parejas distintas',
    status: distinctPartners >= 3 ? 'unlocked' : distinctPartners >= 1 ? 'progress' : 'locked',
    progress: distinctPartners < 3 ? { current: distinctPartners, target: 3 } : undefined,
  });
  
  achievements.push({
    id: 'never-same',
    title: 'Nunca igual',
    description: 'Juega contra 5 rivales distintos',
    status: distinctOpponents >= 5 ? 'unlocked' : distinctOpponents >= 1 ? 'progress' : 'locked',
    progress: distinctOpponents < 5 ? { current: distinctOpponents, target: 5 } : undefined,
  });
  
  // Meta logro
  const unlockedCount = achievements.filter(a => a.status === 'unlocked').length;
  achievements.push({
    id: 'complete-player',
    title: 'Jugador completo',
    description: 'Desbloquea 10 logros',
    status: unlockedCount >= 10 ? 'unlocked' : unlockedCount >= 1 ? 'progress' : 'locked',
    progress: unlockedCount < 10 ? { current: unlockedCount, target: 10 } : undefined,
  });
  
  return achievements;
}
