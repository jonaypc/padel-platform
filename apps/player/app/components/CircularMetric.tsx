"use client";

interface CircularMetricProps {
  value: string | number;
  label: string;
  percentage?: number;
  color?: "green" | "blue" | "orange";
  onClick?: () => void;
}

export default function CircularMetric({
  value,
  label,
  percentage,
  color = "green",
  onClick,
}: CircularMetricProps) {
  const colorClasses = {
    green: "text-green-500 stroke-green-500",
    blue: "text-blue-500 stroke-blue-500",
    orange: "text-orange-500 stroke-orange-500",
  };

  const colorClass = colorClasses[color];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = percentage
    ? circumference - (percentage / 100) * circumference
    : 0;

  return (
    <div
      className={`flex flex-col items-center ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="relative w-24 h-24 mb-2">
        <svg className="transform -rotate-90 w-24 h-24">
          {/* Círculo de fondo */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-gray-700"
          />
          {/* Círculo de progreso */}
          {percentage !== undefined && (
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={colorClass}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold text-white`}>{value}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 font-medium text-center uppercase tracking-wide">{label}</p>
      {onClick && (
        <span className="text-green-500 text-xs mt-1">→</span>
      )}
    </div>
  );
}
