import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDate, getMonthName } from '../../entities/financial';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
    className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    label,
    className = ''
}) => {
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
    const containerRef = useRef<HTMLDivElement>(null);

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
    const minSwipeDistance = 50;

    // Parse initial date with safety
    const parseDate = (val: string) => {
        if (!val) return new Date();
        const [y, m, d] = val.split('-').map(Number);
        const date = new Date(y, m - 1, d || 1);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    const [viewDate, setViewDate] = useState(parseDate(value));

    useEffect(() => {
        if (isOpen) {
            setViewDate(parseDate(value));
            setViewMode('days');
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node) && !isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const handlePrevMonth = () => {
        if (viewMode === 'days') {
            setAnimationDirection('left');
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        }
    };

    const handleNextMonth = () => {
        if (viewMode === 'days') {
            setAnimationDirection('right');
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        }
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (viewMode !== 'days') return;
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (viewMode !== 'days') return;
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (viewMode !== 'days' || !touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNextMonth();
        } else if (isRightSwipe) {
            handlePrevMonth();
        }
    };

    const handleDateSelect = (d: number) => {
        const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleMonthSelect = (m: number) => {
        setViewDate(new Date(viewDate.getFullYear(), m, 1));
        setViewMode('days');
    };

    const handleYearSelect = (y: number) => {
        setViewDate(new Date(y, viewDate.getMonth(), 1));
        setViewMode('days');
    };

    const handleToday = () => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    const renderDays = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-2" />);
        }

        for (let i = 1; i <= totalDays; i++) {
            const isSelected = value === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            days.push(
                <button
                    key={i}
                    type="button"
                    onClick={() => handleDateSelect(i)}
                    className={`size-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all relative ${isSelected
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-stone-900'
                        : isToday
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                >
                    {i}
                </button>
            );
        }
        return (
            <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-[10px] font-bold text-stone-400 text-center">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">{days}</div>
            </>
        );
    };

    const activeRef = (el: HTMLButtonElement | null) => {
        if (el && el.parentElement) {
            const container = el.parentElement;
            container.scrollTop = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
        }
    };

    const renderMonths = () => {
        const monthIndices = Array.from({ length: 12 }, (_, i) => i);
        return (
            <div className="max-h-[220px] overflow-y-auto px-1 space-y-1 custom-scrollbar">
                {monthIndices.map((i) => {
                    const mName = getMonthName(i, language === 'bn');
                    return (
                        <button
                            key={i}
                            type="button"
                            ref={viewDate.getMonth() === i ? activeRef : null}
                            onClick={() => handleMonthSelect(i)}
                            className={`w-full py-3 text-sm font-bold rounded-xl transition-all ${viewDate.getMonth() === i
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                                }`}
                        >
                            {mName}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        // Show a generous range of years
        for (let i = currentYear - 50; i <= currentYear + 10; i++) {
            years.push(i);
        }

        return (
            <div className="max-h-[220px] overflow-y-auto px-1 space-y-1 custom-scrollbar">
                {years.map((y) => (
                    <button
                        key={y}
                        type="button"
                        ref={viewDate.getFullYear() === y ? activeRef : null}
                        onClick={() => handleYearSelect(y)}
                        className={`w-full py-3 text-sm font-bold rounded-xl transition-all ${viewDate.getFullYear() === y
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                            : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                            }`}
                    >
                        {y}
                    </button>
                ))}
            </div>
        );
    };

    const modalContent = isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with full-screen blur */}
            <div
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity animate-backdrop"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal - truly screen centered */}
            <div className="relative bg-brand-surface-light dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl shadow-2xl p-6 w-full max-w-[320px] animate-scale-in">
                <div className="flex items-center justify-between mb-6 h-10">
                    {viewMode === 'days' ? (
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors text-stone-400">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${viewMode === 'months'
                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-600'
                                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-800 text-stone-900 dark:text-white hover:border-primary-500'
                                }`}
                        >
                            {(language === 'bn'
                                ? ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"]
                                : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])[viewDate.getMonth()]}
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${viewMode === 'years'
                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-600'
                                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:border-primary-500'
                                }`}
                        >
                            {viewDate.getFullYear()}
                        </button>
                    </div>

                    {viewMode === 'days' ? (
                        <button onClick={handleNextMonth} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors text-stone-400">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}
                </div>

                <div
                    className={`min-h-[220px] flex flex-col justify-center transition-all duration-300 ${animationDirection === 'right' ? 'animate-slide-in-right' :
                        animationDirection === 'left' ? 'animate-slide-in-left' : ''
                        }`}
                    key={`${viewDate.getFullYear()}-${viewDate.getMonth()}-${viewMode}`}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {viewMode === 'days' && renderDays()}
                    {viewMode === 'months' && renderMonths()}
                    {viewMode === 'years' && renderYears()}
                </div>

                {viewMode === 'days' && (
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex gap-3">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex-1 py-2 rounded-xl text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/20 shadow-sm active:shadow-inner transition-all"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleToday}
                            className="flex-1 py-2 rounded-xl text-[10px] font-bold text-primary-600 uppercase tracking-widest bg-primary-50/50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/20 shadow-md active:shadow-inner transition-all"
                        >
                            Today
                        </button>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="label-text">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="input-field flex items-center justify-between text-sm cursor-pointer hover:border-primary-500 dark:hover:border-primary-500"
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`truncate whitespace-nowrap ${value ? 'text-stone-900 dark:text-white' : 'text-stone-400 font-normal'}`}>
                        {value ? formatDate(value, language) : label}
                    </span>
                </div>
            </button>

            {isOpen && createPortal(modalContent, document.body)}
        </div>
    );
};

export default DatePicker;
