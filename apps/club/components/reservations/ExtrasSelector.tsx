"use client";

import { X } from "lucide-react";
import type { ReservationItem, ReservationPlayer } from "../../hooks/userReservations";

interface ExtrasSelectorProps {
    availableExtras: { name: string; price: number }[];
    items: ReservationItem[];
    players: ReservationPlayer[];
    onItemsChange: (items: ReservationItem[]) => void;
    onPriceAdd?: (amount: number) => void;
    showAssignment?: boolean;
}

export function ExtrasSelector({
    availableExtras,
    items,
    players,
    onItemsChange,
    onPriceAdd,
    showAssignment = true,
}: ExtrasSelectorProps) {

    const addExtra = (extra: { name: string; price: number }) => {
        const existing = items.find(i => i.name === extra.name);
        if (existing) {
            onItemsChange(items.map(i =>
                i.name === extra.name
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            onItemsChange([...items, { ...extra, quantity: 1 }]);
        }
        onPriceAdd?.(extra.price);
    };

    const removeOne = (index: number) => {
        const item = items[index];
        if (!item) return;

        if (item.quantity > 1) {
            const newItems = [...items];
            newItems[index] = { ...item, quantity: item.quantity - 1 };
            onItemsChange(newItems);
        } else {
            onItemsChange(items.filter((_, i) => i !== index));
        }
        onPriceAdd?.(-item.price);
    };

    const toggleAssignment = (itemIndex: number, playerIndex: number) => {
        const newItems = [...items];
        const item = newItems[itemIndex];
        if (!item) return;

        const currentAssignees = item.assignedTo || [];
        const playerKey = playerIndex.toString();

        if (currentAssignees.includes(playerKey)) {
            item.assignedTo = currentAssignees.filter(id => id !== playerKey);
        } else {
            item.assignedTo = [...currentAssignees, playerKey];
        }

        onItemsChange(newItems);
    };

    const totalExtras = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    return (
        <div className="space-y-2">
            {/* Botones de extras disponibles */}
            <div className="flex flex-wrap gap-2">
                {availableExtras.map(extra => (
                    <button
                        key={extra.name}
                        onClick={() => addExtra(extra)}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded-md text-[10px] flex items-center gap-1 border border-gray-600 transition"
                    >
                        <span>{extra.name}</span>
                        <span className="text-green-400 font-bold">+{extra.price}€</span>
                    </button>
                ))}
            </div>

            {/* Items seleccionados */}
            {items.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-2 space-y-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 text-[10px] border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300 font-bold">
                                    {item.name} (x{item.quantity})
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">
                                        {(item.price * item.quantity).toFixed(2)}€
                                    </span>
                                    <button
                                        onClick={() => removeOne(idx)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Asignación a jugadores */}
                            {showAssignment && (
                                <div className="flex gap-1">
                                    {players.map((p, pIdx) => {
                                        const isAssigned = (item.assignedTo || []).includes(pIdx.toString());
                                        return (
                                            <button
                                                key={pIdx}
                                                onClick={() => toggleAssignment(idx, pIdx)}
                                                className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold border transition
                                                    ${isAssigned
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                                                        : 'bg-gray-800 border-gray-600 text-gray-500 hover:border-gray-400'
                                                    }`}
                                                title={`Asignar a ${p.name || 'Jugador ' + (pIdx + 1)}`}
                                            >
                                                {pIdx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="pt-2 border-t border-gray-700 flex justify-between font-bold text-green-400">
                        <span>TOTAL EXTRAS</span>
                        <span>{totalExtras.toFixed(2)}€</span>
                    </div>
                </div>
            )}
        </div>
    );
}