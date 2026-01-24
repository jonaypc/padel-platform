"use client";

interface MonitorCardProps {
  title: string;
  status: string;
  value?: string;
  subtitle?: string;
  icon?: string;
  color?: "green" | "blue" | "orange";
  onClick?: () => void;
}

export default function MonitorCard({
  title,
  status,
  value,
  subtitle,
  icon,
  color = "green",
  onClick,
}: MonitorCardProps) {
  const colorClasses = {
    green: "text-green-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
  };

  const colorClass = colorClasses[color];

  return (
    <div
      className={`bg-gray-800 rounded-xl p-4 border border-gray-700 ${
        onClick ? "cursor-pointer hover:bg-gray-750 transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-lg">{icon}</span>}
            {value && (
              <span className={`text-lg font-bold ${colorClass}`}>{value}</span>
            )}
            <span className={`font-semibold ${colorClass}`}>{status}</span>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {onClick && (
          <span className={`text-lg ${colorClass}`}>→</span>
        )}
      </div>
    </div>
  );
}
