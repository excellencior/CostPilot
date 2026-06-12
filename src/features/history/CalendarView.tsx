import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Transaction, Category } from '../../entities/types';
import { formatCompactNumber } from '../../entities/financial';


interface CalendarViewProps {
    transactions: Transaction[];
    currencySymbol: string;
    onTransactionClick: (t: Transaction) => void;
    initialDate?: Date;
    typeFilter?: 'all' | 'income' | 'expense';
}

const CalendarView: React.FC<CalendarViewProps> = ({
    transactions,
    currencySymbol,
    onTransactionClick,
    initialDate,
    typeFilter = 'all'
}) => {
    const [currentDate, setCurrentDate] = useState(initialDate || new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const numDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        const days = [];
        // padding for previous month
        for (let i = 0; i < startDay; i++) {
            days.push({ day: null, transactions: [] });
        }

        for (let d = 1; d <= numDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayTransactions = transactions.filter(t => {
                const matchesDate = t.date === dateStr;
                const matchesType = typeFilter === 'all' || t.type === typeFilter;
                return matchesDate && matchesType;
            });
            days.push({ day: d, date: dateStr, transactions: dayTransactions });
        }

        return days;
    }, [currentDate, transactions, typeFilter]);

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
    const [selectedDayData, setSelectedDayData] = useState<{ dateStr: string; transactions: Transaction[] } | null>(null);

    // Minimum distance for a swipe to be recognized
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            changeMonth(1);
        } else if (isRightSwipe) {
            changeMonth(-1);
        }
    };

    const changeMonth = (offset: number) => {
        setAnimationDirection(offset > 0 ? 'right' : 'left');
        const nextDate = new Date(currentDate);
        nextDate.setMonth(currentDate.getMonth() + offset);
        setCurrentDate(nextDate);
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    const getDayStats = (dayTransactions: Transaction[]) => {
        const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense };
    };
    return (
        <div
            className="space-y-4 animate-in fade-in duration-500 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="flex items-center justify-between bg-brand-surface-light dark:bg-brand-surface-dark p-1 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm relative z-10">
                <button
                    onClick={() => changeMonth(-1)}
                    className="size-9 flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <div className="text-center flex items-baseline justify-center gap-2">
                    <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest">{monthName}</h3>
                    <p className="text-[15px] font-bold text-stone-400">{year}</p>
                </div>
                <button
                    onClick={() => changeMonth(1)}
                    className="size-9 flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
            </div>

            <div
                key={`${year}-${monthName}`}
                className={`grid grid-cols-7 gap-0.5 md:gap-1.5 transition-all duration-300 ${animationDirection === 'right' ? 'animate-slide-in-right' :
                        animationDirection === 'left' ? 'animate-slide-in-left' : ''
                    }`}
            >

                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                    <div key={d} className="text-center py-2 text-[15px] font-black text-stone-400 tracking-widest">{d}</div>
                ))}
                {calendarData.map((data, idx) => {
                    const stats = data.day ? getDayStats(data.transactions) : null;
                    const isToday = data.day && new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), data.day).toDateString();

                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                if (data.day) {
                                    setSelectedDayData({ dateStr: data.date as string, transactions: data.transactions });
                                }
                            }}
                            className={`min-h-[56px] md:min-h-[85px] bg-brand-surface-light dark:bg-brand-surface-dark rounded-lg border border-stone-100 dark:border-stone-800 p-0.5 flex flex-col justify-between transition-all ${!data.day ? 'opacity-20 grayscale' : 'hover:border-primary-200 dark:hover:border-primary-900/50 cursor-pointer active:scale-95'} ${isToday ? 'ring-1 ring-primary-500/30 border-primary-500/40 bg-primary-50/5 dark:bg-primary-900/5' : ''}`}

                        >
                            {data.day && (
                                <>
                                    <div className="flex items-center justify-between px-0.5">
                                        <span className={`text-[15px] font-black ${isToday ? 'bg-primary-500 text-white size-5 rounded-full flex items-center justify-center' : 'text-stone-500'}`}>
                                            {data.day}
                                        </span>
                                        {data.transactions.length > 0 && (
                                            <div className="flex gap-0.5">
                                                {stats!.income > 0 && <div className="size-1 rounded-full bg-green-500"></div>}
                                                {stats!.expense > 0 && <div className="size-1 rounded-full bg-rose-500"></div>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-end gap-0.5 px-1 pb-1 overflow-hidden">
                                        {(typeFilter === 'all' || typeFilter === 'income') && stats!.income > 0 && (
                                            <p className="text-[9px] md:text-[11px] font-bold text-green-600 dark:text-green-400 leading-none truncate">
                                                +{formatCompactNumber(stats!.income)}
                                            </p>
                                        )}
                                        {(typeFilter === 'all' || typeFilter === 'expense') && stats!.expense > 0 && (
                                            <p className="text-[9px] md:text-[11px] font-bold text-rose-600 dark:text-rose-400 leading-none truncate">
                                                -{formatCompactNumber(stats!.expense)}
                                            </p>
                                        )}

                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedDayData && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity animate-backdrop"
                        onClick={() => setSelectedDayData(null)}
                    />

                    <div className="relative bg-brand-surface-light dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl shadow-2xl p-0 w-full max-w-[360px] animate-scale-in flex flex-col max-h-[80vh] overflow-hidden">
                        <div className="p-5 pb-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 border border-primary-200 dark:border-primary-800">
                                    <span className="material-symbols-outlined">calendar_month</span>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-stone-900 dark:text-white capitalize leading-tight truncate">
                                        {(() => {
                                            const [y, m, d] = selectedDayData.dateStr.split('-').map(Number);
                                            const dateObj = new Date(y, m - 1, d);
                                            return `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
                                        })()}
                                    </h3>
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{selectedDayData.transactions.length} Transactions</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {selectedDayData.transactions.length > 0 ? selectedDayData.transactions.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedDayData(null);
                                        onTransactionClick(t);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-white dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-700/50 hover:border-[#AF8F42]/30 dark:hover:border-[#AF8F42]/30 transition-all text-left shadow-sm active:scale-[0.98]"
                                >
                                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income'
                                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                        }`}>
                                        <span className="material-symbols-outlined text-xl">{t.type === 'income' ? 'trending_up' : 'payments'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-stone-900 dark:text-white truncate">{t.title}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[9px] font-extrabold uppercase tracking-widest leading-none ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>{t.type}</span>
                                        </div>
                                    </div>
                                    <div className={`font-bold text-base whitespace-nowrap ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
                                        {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toLocaleString()}
                                    </div>
                                </button>
                            )) : (
                                <div className="py-8 flex flex-col items-center justify-center text-stone-400 opacity-50">
                                    <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                                    <p className="text-xs font-bold uppercase tracking-widest">No Entries</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CalendarView;
