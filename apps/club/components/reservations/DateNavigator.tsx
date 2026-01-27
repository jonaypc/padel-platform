"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useRef } from "react";

interface DateNavigatorProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export function DateNavigator({ currentDate, onDateChange, onPrev, onNext, onToday }: DateNavigatorProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            onDateChange(new Date(e.target.value));
        }
    };

    const isToday = () => {
        const today = new Date();
        return currentDate.getDate() === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    const isPast = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return currentDate < today;
    }

    const disablePrev = isToday() || isPast();

    return (
        <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-xl border border-gray-700">
            <button
                onClick={onPrev}
                disabled={disablePrev}
                className={`p-1.5 rounded-lg transition ${disablePrev ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2 px-2 relative group">
                <button
                    onClick={() => dateInputRef.current?.showPicker()}
                    className="flex items-center gap-2 hover:bg-gray-700/50 px-2 py-1 rounded transition"
                >
                    <CalendarIcon size={16} className="text-green-500" />
                    <span className="text-sm font-bold text-white capitalize whitespace-nowrap">
                        {currentDate.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                        })}
                    </span>
                </button>

                {/* Hidden Date Input for Picker */}
                <input
                    type="date"
                    ref={dateInputRef}
                    min={new Date().toISOString().split('T')[0]}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    onChange={handleDateInput}
                />
            </div>

            <button
                onClick={onNext}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
            >
                <ChevronRight size={20} />
            </button>

            <div className="h-6 w-px bg-gray-700 mx-1"></div>

            <button
                onClick={onToday}
                className="px-3 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition uppercase"
            >
                Hoy
            </button>
        </div>
    );
}