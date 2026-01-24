export type Badge = {
    id: string;
    label: string;
    icon: string;
    description: string;
    color: string; // clase base para el borde/texto, el fondo será esa con opacidad
};

export const BADGES_DEFINITIONS: Badge[] = [
    { id: "debutante", label: "Debutante", icon: "🐣", description: "Juega tu primer partido", color: "blue" },
    { id: "entusiasta", label: "Entusiasta", icon: "🎾", description: "Juega 10 partidos", color: "green" },
    { id: "veterano", label: "Veterano", icon: "🏅", description: "Juega 50 partidos", color: "purple" },
    { id: "dominante", label: "Dominante", icon: "🦁", description: "Gana 10 victorias", color: "yellow" },
    { id: "invencible", label: "Invencible", icon: "🔥", description: "70% victorias (+10 partidos)", color: "red" },
    { id: "social", label: "Famoso", icon: "🌟", description: "Consigue 3 seguidores", color: "pink" },
];

export function calculateBadges(
    stats: { matches: number; wins: number; win_rate: number },
    followers: number
): Badge[] {
    const earned: Badge[] = [];

    const getBadge = (id: string) => BADGES_DEFINITIONS.find((b) => b.id === id)!;

    if (stats.matches >= 1) earned.push(getBadge("debutante"));
    if (stats.matches >= 10) earned.push(getBadge("entusiasta"));
    if (stats.matches >= 50) earned.push(getBadge("veterano"));

    if (stats.wins >= 10) earned.push(getBadge("dominante"));

    if (stats.matches >= 10 && stats.win_rate >= 70) earned.push(getBadge("invencible"));

    if (followers >= 3) earned.push(getBadge("social"));

    return earned;
}

export function getBadgeColorClass(colorName: string): string {
    const map: Record<string, string> = {
        blue: "bg-blue-900/40 text-blue-300 border-blue-700",
        green: "bg-green-900/40 text-green-300 border-green-700",
        purple: "bg-purple-900/40 text-purple-300 border-purple-700",
        yellow: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
        red: "bg-red-900/40 text-red-300 border-red-700",
        pink: "bg-pink-900/40 text-pink-300 border-pink-700",
    };
    return map[colorName] || "bg-gray-800 text-gray-300 border-gray-600";
}
