
export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Título principal */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">PÁDEL</h1>
                <p className="text-sm text-gray-400">Panel de gestión Club Pro</p>
            </div>

            {/* Tarjetas de monitores */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">PISTAS</p>
                    <p className="text-lg font-bold text-green-500">--</p>
                    <p className="text-xs text-gray-400 mt-1">Activas</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">RESERVAS HOY</p>
                    <p className="text-lg font-bold text-blue-500">0</p>
                    <p className="text-xs text-gray-400 mt-1">Programadas</p>
                </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
                        Accesos Rápidos
                    </h2>
                </div>

                <div className="space-y-2">
                    <a
                        href="/dashboard/pistas"
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎾</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Gestionar Pistas</p>
                                    <p className="text-xs text-gray-400">Añadir, editar o eliminar</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </a>

                    <a
                        href="/dashboard/reservas"
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📅</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Ver Reservas</p>
                                    <p className="text-xs text-gray-400">Agenda del día</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </a>

                    <a
                        href="/dashboard/settings"
                        className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition no-underline"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚙️</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">Configuración</p>
                                    <p className="text-xs text-gray-400">Ajustes del club</p>
                                </div>
                            </div>
                            <span className="text-green-500">→</span>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
