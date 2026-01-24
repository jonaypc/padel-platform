"use client";

export default function StatCard({
  value,
  label,
  valueColor,
}: {
  value: string | number;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-gray-700 border border-gray-600 rounded-xl p-3 sm:p-4 text-center flex flex-col justify-center items-center min-h-[80px]">
      <p className={`text-xl font-semibold ${valueColor || "text-white"} break-words`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-gray-400 mt-1 break-words leading-tight px-1">{label}</p>
    </div>
  );
}
