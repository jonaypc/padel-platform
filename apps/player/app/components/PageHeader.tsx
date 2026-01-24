"use client";

export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
