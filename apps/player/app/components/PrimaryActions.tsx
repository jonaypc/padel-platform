"use client";

export default function PrimaryActions() {
  return (
    <div className="flex gap-3">
      <a
        href="/new-match"
        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium text-center no-underline hover:bg-green-700 transition"
      >
        + Nuevo partido
      </a>

      <a
        href="/stats"
        className="flex-1 border border-gray-300 py-3 rounded-lg text-gray-700 text-center no-underline hover:bg-gray-50 transition"
      >
        Ver estadísticas
      </a>
    </div>
  );
}
