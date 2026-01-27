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
        <div className="flex items-center gap-1 md:gap-2 bg-gray-800/80 backdrop-blur-sm p-1 rounded-xl border border-gray-700 shadow-lg">
            <button
                onClick={onPrev}
                disabled={disablePrev}
                className={`p-2 rounded-lg transition ${disablePrev ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
            >
                <ChevronLeft size={18} />
            </button>

            <div className="flex-1 flex items-center justify-center px-1 relative">
                <button
                    onClick={() => dateInputRef.current?.showPicker()}
                    className="flex items-center gap-2 hover:bg-gray-700/50 px-2 py-1.5 rounded-lg transition border border-transparent hover:border-gray-600"
                >
                    <CalendarIcon size={14} className="text-green-500 shrink-0" />
                    <span className="text-xs md:text-sm font-black text-white capitalize whitespace-nowrap">
                        <span className="md:hidden">
                            {currentDate.toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                            })}
                        </span>
                        <span className="hidden md:inline">
                            {currentDate.toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            })}
                        </span>
                    </span>
                </button>

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
                className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
            >
                <ChevronRight size={18} />
            </button>

            <div className="h-4 w-px bg-gray-700 mx-1 hidden sm:block"></div>

            <button
                onClick={onToday}
                className="hidden sm:block px-3 py-1.5 text-[10px] font-black text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition uppercase tracking-tighter"
            >
                Hoy
            </button>
        </div>
    );
}