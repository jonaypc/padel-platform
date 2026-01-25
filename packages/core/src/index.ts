export type UserRole = 'player' | 'club_admin' | 'club_staff';

export type MatchStatus = 'pending' | 'confirmed' | 'cancelled';

export interface BaseEntity {
    id: string;
    created_at: string;
}

export interface Profile extends BaseEntity {
    role: UserRole;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_public: boolean;
    updated_at: string;
}

export interface Club extends BaseEntity {
    name: string;
    slug: string;
    description: string | null;
    location: string | null;
    logo_url: string | null;
    booking_duration: number; // Minutos, default 90
    default_price: number;
    updated_at: string;
}

export interface ClubMember extends BaseEntity {
    club_id: string;
    user_id: string;
    role: 'admin' | 'staff';
}

export type CourtType = 'indoor' | 'outdoor';
export type CourtSurface = 'crystal' | 'wall' | 'synthetic';

export interface Court extends BaseEntity {
    club_id: string;
    name: string;
    type: CourtType;
    surface: CourtSurface;
    is_active: boolean;
    price?: number;
    updated_at: string;
}

export type ReservationStatus = 'confirmed' | 'cancelled';
export type ReservationType = 'booking' | 'maintenance' | 'class';

// ... (existing constants)

export interface Reservation extends BaseEntity {
    club_id: string;
    court_id: string;
    user_id: string | null;
    start_time: string;
    end_time: string;
    status: ReservationStatus;
    type: ReservationType;
    price?: number;
    notes?: string;
    updated_at: string;

    // Relaciones opcionales (joins)
    court?: Court;
    user?: Profile;
}

// Ranking System
export type RankingTier = 'beginner' | 'amateur' | 'intermediate' | 'pro' | 'elite';

export const RANKING_TIERS = {
    beginner: { label: 'Beginner', min: 0, max: 1099, color: 'text-stone-400', icon: '🍂' },
    amateur: { label: 'Amateur', min: 1100, max: 1199, color: 'text-amber-700', icon: '🥉' },
    intermediate: { label: 'Intermedio', min: 1200, max: 1399, color: 'text-white', icon: '🥈' },
    pro: { label: 'Pro', min: 1400, max: 1599, color: 'text-yellow-400', icon: '🥇' },
    elite: { label: 'Elite', min: 1600, max: 99999, color: 'text-cyan-400', icon: '💎' },
};

export function getRankingTier(points: number): { id: RankingTier; info: typeof RANKING_TIERS['beginner'] } {
    if (points >= 1600) return { id: 'elite', info: RANKING_TIERS.elite };
    if (points >= 1400) return { id: 'pro', info: RANKING_TIERS.pro };
    if (points >= 1200) return { id: 'intermediate', info: RANKING_TIERS.intermediate };
    if (points >= 1100) return { id: 'amateur', info: RANKING_TIERS.amateur };
    return { id: 'beginner', info: RANKING_TIERS.beginner };
}
