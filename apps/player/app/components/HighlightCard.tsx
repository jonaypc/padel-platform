"use client";

export default function HighlightCard({
  value,
  label,
  valueColor = "text-green-600",
}: {
  value: string | number;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-center mb-6">
      <p className={`text-5xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-2">{label}</p>
    </div>
  );
}
