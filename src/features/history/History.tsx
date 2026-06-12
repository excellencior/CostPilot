import React, { useMemo, useState, useCallback } from 'react';
import { Transaction, Category } from '../../entities/types';
import { formatDate } from '../../entities/financial';
import Dropdown from '../../shared/ui/Dropdown';
import CalendarView from './CalendarView';
import ConfirmModal from '../../shared/ui/ConfirmModal';


interface HistoryProps {
    transactions: Transaction[];
    onTransactionClick: (t: Transaction) => void;
    onDeleteTransactions: (ids: string[]) => void;
    currencySymbol: string;
    categories: Category[];
    viewMode: 'summary' | 'calendar';
    onViewModeChange: (mode: 'summary' | 'calendar') => void;
}

const History: React.FC<HistoryProps> = ({ transactions, onTransactionClick, onDeleteTransactions, currencySymbol, categories, viewMode, onViewModeChange }) => {
    const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title'>('date');
    const [calendarTypeFilter, setCalendarTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const toggleSelectMode = useCallback(() => {
        setIsSelectMode(prev => !prev);
        setSelectedIds(new Set());
    }, []);

    const toggleId = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleConfirmDelete = useCallback(() => {
        onDeleteTransactions(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsSelectMode(false);
    }, [selectedIds, onDeleteTransactions]);


    const isFiltering = searchQuery.length > 0 || selectedCategoryId !== 'all';

    const filteredResults = useMemo(() => {
        return transactions.filter(t => {
            const title = t.title || '';
            const categoryName = t.category?.name || '';
            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                categoryName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategoryId === 'all' || t.category?.id === selectedCategoryId;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => {
            if (sortBy === 'date') {
                const dateSort = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateSort !== 0) return dateSort;
                // Secondary sort: newest created first
                const aTime = (a as any).created_at || '';
                const bTime = (b as any).created_at || '';
                if (bTime && aTime) return bTime.localeCompare(aTime);
                return b.id.localeCompare(a.id);
            }
            if (sortBy === 'amount') return b.amount - a.amount;
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            return 0;
        });
    }, [transactions, searchQuery, selectedCategoryId, sortBy]);

    const monthlySummaries = useMemo(() => {
        const groups: {
            [key: string]: {
                transactions: Transaction[],
                income: number,
                expense: number,
                savings: number,
                monthName: string,
                year: number
            }
        } = {};

        // Sort transactions by date descending, then by creation time
        const sorted = [...transactions].sort((a, b) => {
            const dateSort = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateSort !== 0) return dateSort;
            const aTime = (a as any).created_at || '';
            const bTime = (b as any).created_at || '';
            if (bTime && aTime) return bTime.localeCompare(aTime);
            return b.id.localeCompare(a.id);
        });

        sorted.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();

            if (!groups[monthKey]) {
                groups[monthKey] = {
                    transactions: [],
                    income: 0,
                    expense: 0,
                    savings: 0,
                    monthName,
                    year
                };
            }

            groups[monthKey].transactions.push(t);
            if (t.type === 'income') groups[monthKey].income += t.amount;
            else groups[monthKey].expense += t.amount;
        });

        // Calculate savings
        Object.keys(groups).forEach(key => {
            groups[key].savings = groups[key].income - groups[key].expense;
        });

        return groups;
    }, [transactions]);

    const monthKeys = Object.keys(monthlySummaries).sort().reverse();

    // Specific Month Detail View
    if (selectedMonthKey && monthlySummaries[selectedMonthKey] && !isFiltering) {
        const data = monthlySummaries[selectedMonthKey];

        // Group by date
        const grouped: { [dateKey: string]: { label: string; transactions: Transaction[] } } = {};
        data.transactions.forEach(t => {
            const [year, month, day] = t.date.split('-').map(Number);
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (!grouped[dateKey]) {
                const d = new Date(year, month - 1, day);
                grouped[dateKey] = { label: `${day} ${d.toLocaleString('default', { month: 'long' })} - ${year}`, transactions: [] };
            }
            grouped[dateKey].transactions.push(t);
        });
        const sortedDateKeys = Object.keys(grouped).sort().reverse();

        // All transactions in this month for lookup
        const monthTransactionMap = new Map(data.transactions.map(t => [t.id, t]));
        const selectedTransactions = Array.from(selectedIds).map(id => monthTransactionMap.get(id)).filter(Boolean) as Transaction[];

        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Back + Select actions row */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => { setSelectedMonthKey(null); setIsSelectMode(false); setSelectedIds(new Set()); }}
                        className="flex items-center gap-2 text-stone-500 hover:text-primary-600 transition-colors group"
                    >
                        <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
                        <span className="font-bold text-sm uppercase tracking-wider">Back to Summary</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {isSelectMode ? (
                            <>
                                <button
                                    onClick={() => selectedIds.size > 0 && setIsConfirmOpen(true)}
                                    title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected` : 'Select items first'}
                                    className={`size-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${selectedIds.size > 0
                                        ? 'bg-rose-500 text-white hover:bg-rose-600'
                                        : 'bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                                <button
                                    onClick={toggleSelectMode}
                                    title="Cancel selection"
                                    className="size-8 rounded-lg flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={toggleSelectMode}
                                title="Select transactions"
                                className="size-8 rounded-lg flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">checklist</span>
                            </button>
                        )}
                    </div>
                </div>

                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                    <div>
                        <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white capitalize">
                            {data.monthName} <span className="text-stone-400 font-light">{data.year}</span>
                        </h2>
                        <p className="text-sm text-stone-500 dark:text-stone-400">Detailed transactions for this period</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Net Savings</p>
                            <p className={`text-xl font-bold ${data.savings >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                {data.savings >= 0 ? '+' : ''}{currencySymbol}{data.savings.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-5">
                    {sortedDateKeys.map(dateKey => {
                        const dayTransactions = grouped[dateKey].transactions;
                        const dailyExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                        const dailyIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                        const dailyNet = dailyExpense - dailyIncome;

                        return (
                            <div key={dateKey} className="space-y-2.5">
                                {/* Date header with daily total */}
                                <div className="flex items-center gap-3 px-1 pt-1">
                                    <span className="material-symbols-outlined text-base text-primary-500 dark:text-primary-400">calendar_today</span>
                                    <h3 className="text-xs font-extrabold text-stone-600 dark:text-stone-300 uppercase tracking-widest whitespace-nowrap">
                                        {grouped[dateKey].label}
                                    </h3>
                                    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                                    <span className={`text-xs font-black tabular-nums whitespace-nowrap ${dailyNet > 0 ? 'text-rose-500 dark:text-rose-400' : dailyNet < 0 ? 'text-green-600 dark:text-green-400' : 'text-stone-400'}`}>
                                        {dailyNet > 0 ? `-${currencySymbol}${dailyNet.toLocaleString()}` : dailyNet < 0 ? `+${currencySymbol}${Math.abs(dailyNet).toLocaleString()}` : `${currencySymbol}0`}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    {dayTransactions.map((t) => {
                                        const isSelected = selectedIds.has(t.id);
                                        return (
                                            /* Relative wrapper for overlay checkbox */
                                            <div key={t.id} className="relative">
                                                <button
                                                    onClick={() => isSelectMode ? toggleId(t.id) : onTransactionClick(t)}
                                                    className={`w-full flex items-center gap-4 p-3 bg-brand-surface-light dark:bg-brand-surface-dark rounded-xl border transition-all duration-200 ease-out text-left active:scale-[0.99]
                                                        ${isSelected
                                                            ? 'border-primary-500 dark:border-primary-500 shadow-md shadow-primary-500/10'
                                                            : 'border-[#AF8F42]/30 dark:border-[#AF8F42]/40 hover:border-[#AF8F42]/60 hover:shadow-xl hover:shadow-[#AF8F42]/10'
                                                        }`}
                                                >
                                                    <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                        <span className="material-symbols-outlined text-2xl">{t.category.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-stone-900 dark:text-white truncate">{t.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider font-brand-accent">{t.category.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
                                                        {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toLocaleString()}
                                                    </div>
                                                </button>

                                                {/* Absolute overlay checkbox — doesn't shift any layout */}
                                                {isSelectMode && (
                                                    <div className="absolute top-2 left-2 pointer-events-none">
                                                        <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 shadow-sm
                                                            ${isSelected
                                                                ? 'bg-primary-600 border-primary-600'
                                                                : 'bg-stone-900/40 dark:bg-stone-900/60 border-stone-400 dark:border-stone-500 backdrop-blur-sm'
                                                            }`}
                                                        >
                                                            {isSelected && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Confirmation modal */}
                <ConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete transactions?"
                    message={`You're about to permanently remove ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''}.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="danger"
                    extraContent={
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {selectedTransactions.map(t => (
                                <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-left">
                                    <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${t.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                        <span className="material-symbols-outlined text-[16px]">{t.category.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-stone-900 dark:text-white truncate">{t.title}</p>
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t.category.name}</p>
                                    </div>
                                    <span className={`text-xs font-bold tabular-nums ${t.type === 'expense' ? 'text-stone-700 dark:text-stone-300' : 'text-green-600 dark:text-green-400'}`}>
                                        {t.type === 'expense' ? '-' : '+'}{currencySymbol}{t.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    }
                />
            </div>
        );
    }





    return (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 px-1">
                <div>
                    <h2 className="text-2xl font-bold leading-tight font-brand-title brand-gradient">History</h2>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Transaction Ledger</p>
                </div>
                <div className="flex-1"></div>
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                    <button
                        onClick={() => onViewModeChange('summary')}
                        className={`size-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'summary' ? 'bg-white dark:bg-stone-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                        title="List View"
                    >
                        <span className="material-symbols-outlined">list</span>
                    </button>
                    <button
                        onClick={() => onViewModeChange('calendar')}
                        className={`size-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-stone-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                        title="Calendar View"
                    >
                        <span className="material-symbols-outlined">calendar_month</span>
                    </button>
                </div>
            </div>

            {/* Search and Filters Header - Only shown in summary view */}
            {viewMode === 'summary' && (
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-1">
                        <label className="text-[0.75rem] font-bold text-stone-400 uppercase tracking-wider block px-1">Search</label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary-600 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Find transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-950 dark:border-stone-300 rounded-xl py-2 pl-10 pr-4 text-sm font-bold placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all text-stone-900 dark:text-white shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="md:w-64">
                        <Dropdown
                            label="Category"
                            options={[
                                { id: 'all', name: 'All Categories' },
                                ...categories.map(c => ({ id: c.id, name: c.name.toUpperCase(), icon: c.icon }))
                            ]}
                            value={selectedCategoryId}
                            onChange={setSelectedCategoryId}
                        />
                    </div>
                    {isFiltering && (
                        <div className="md:w-48 animate-in slide-in-from-right-2 duration-300">
                            <Dropdown
                                label="Sort By"
                                options={[
                                    { id: 'date', name: 'Newest First' },
                                    { id: 'amount', name: 'Highest Amount' },
                                    { id: 'title', name: 'Alphabetical' }
                                ]}
                                value={sortBy}
                                onChange={(val) => setSortBy(val as any)}
                            />
                        </div>
                    )}
                </div>
            )}

            {
                viewMode === 'calendar' ? (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-end px-1">
                            <Dropdown
                                options={[
                                    { id: 'all', name: 'Income & Expense' },
                                    { id: 'income', name: 'Incomes Only' },
                                    { id: 'expense', name: 'Expenses Only' }
                                ]}
                                value={calendarTypeFilter}
                                onChange={(val) => setCalendarTypeFilter(val as any)}
                                className="w-48"
                            />
                        </div>
                        <CalendarView
                            transactions={transactions}
                            categories={categories}
                            currencySymbol={currencySymbol}
                            onTransactionClick={onTransactionClick}
                            typeFilter={calendarTypeFilter}
                        />
                    </div>
                ) : isFiltering ? (
                    /* Search Results View */
                    <div className="space-y-4 animate-scale-in" >
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                Found {filteredResults.length} matches
                            </p>
                            {(searchQuery || selectedCategoryId !== 'all') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSelectedCategoryId('all'); }}
                                    className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            {filteredResults.length > 0 ? (
                                filteredResults.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => onTransactionClick(t)}
                                        className="flex items-center gap-4 p-3 md:p-3.5 bg-brand-surface-light dark:bg-brand-surface-dark rounded-xl border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 hover:border-[#AF8F42]/60 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-[#AF8F42]/10 group text-left shadow-sm active:scale-[0.99]"
                                    >
                                        <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income'
                                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                            }`}>
                                            <span className="material-symbols-outlined text-2xl">{t.category.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-stone-900 dark:text-white truncate">{t.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider font-brand-accent">{t.category.name}</span>
                                                <span className="text-[8px] text-stone-300 dark:text-stone-700 font-black">•</span>
                                                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium uppercase tracking-wider">{formatDate(t.date)}</span>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
                                            {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toLocaleString()}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-stone-400 opacity-30">
                                    <span className="material-symbols-outlined text-6xl">search_off</span>
                                    <p className="font-bold uppercase mt-2">No matches found</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Monthly Summary View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                        {monthKeys.length > 0 ? (
                            monthKeys.map(key => {
                                const data = monthlySummaries[key];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedMonthKey(key)}
                                        className="card-section p-0 overflow-hidden group hover:border-primary-300 dark:hover:border-primary-800 transition-all hover:shadow-xl hover:shadow-primary-500/5 text-left"
                                    >
                                        <div className="p-4 md:p-5 border-b border-stone-50 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
                                            <div>
                                                <h3 className="text-xl font-bold text-stone-900 dark:text-white">{data.monthName}</h3>
                                                <p className="text-xs text-stone-500 font-medium tracking-wide uppercase">{data.year}</p>
                                            </div>
                                            <div className="size-10 rounded-full bg-brand-base-light dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all">
                                                <span className="material-symbols-outlined">chevron_right</span>
                                            </div>
                                        </div>

                                        <div className="p-4 md:p-5 grid grid-cols-2 gap-4 md:gap-5 font-bold">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Inflow</p>
                                                <p className="text-lg text-green-600">+{currencySymbol}{data.income.toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Outflow</p>
                                                <p className="text-lg text-rose-600">-{currencySymbol}{data.expense.toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Savings</p>
                                                <p className={`text-lg ${data.savings >= 0 ? 'text-primary-600' : 'text-amber-600'}`}>
                                                    {currencySymbol}{data.savings.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Entries</p>
                                                <p className="text-lg text-stone-700 dark:text-stone-300">{data.transactions.length}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="col-span-full card p-20 flex flex-col items-center justify-center text-stone-400 border-dashed border-2 opacity-50">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">history_edu</span>
                                <p className="text-lg font-black uppercase tracking-widest">Zero Operations</p>
                                <p className="text-sm font-medium">Add records to start tracking history</p>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default History;
