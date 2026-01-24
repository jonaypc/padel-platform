"use client";

export default function LastMatchCard({
  result,
  score,
  timeAgo,
  matchId,
}: {
  result: "Victoria" | "Derrota" | "Empate" | "Inacabado" | null;
  score: string;
  timeAgo: string;
  matchId: string;
}) {
  const resultColor = 
    result === "Victoria" ? "text-green-500" :
    result === "Derrota" ? "text-red-500" :
    result === "Inacabado" ? "text-yellow-500" :
    "text-gray-400";

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          result === "Victoria" ? "bg-green-900/30" :
          result === "Derrota" ? "bg-red-900/30" :
          result === "Inacabado" ? "bg-yellow-900/30" :
          "bg-gray-700"
        }`}>
          <span className="text-xl">🎾</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${resultColor}`}>
              {result || "Partido"}
            </span>
            <span className="text-sm text-gray-300">{score}</span>
          </div>
          <p className="text-xs text-gray-400">{timeAgo}</p>
        </div>
        <a 
          href={`/matches/${matchId}`}
          className="text-green-500 font-medium text-sm hover:underline"
        >
          Ver →
        </a>
      </div>
    </div>
  );
}
