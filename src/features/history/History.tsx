import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Transaction, Category } from '../../entities/types';
import { formatDate } from '../../entities/financial';
import Dropdown from '../../shared/ui/Dropdown';
import CalendarView from './CalendarView';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import { useLanguage } from '../../application/contexts/LanguageContext';
import { LocalRepository } from '../../infrastructure/local/local-repository';
import { useLocalBackup } from '../../application/contexts/LocalBackupContext';
import { toast } from 'react-hot-toast';
const getMonthName = (monthIndex: number, isBengali: boolean): string => {
    const monthsEn = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const monthsBn = [
        "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
        "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
    ];
    return isBengali ? monthsBn[monthIndex] : monthsEn[monthIndex];
};

const formatAmount = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    try {
        return num.toLocaleString('en-US');
    } catch {
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
};

interface HistoryProps {
    onTransactionClick: (t: Transaction) => void;
    onDeleteTransactions: (ids: string[]) => void;
    currencySymbol: string;
    viewMode: 'summary' | 'calendar';
    onViewModeChange: (mode: 'summary' | 'calendar') => void;
}

const History: React.FC<HistoryProps> = ({ onTransactionClick, onDeleteTransactions, currencySymbol, viewMode, onViewModeChange }) => {
    const { t, language } = useLanguage();
    const { getBackupTransactionsForMonth, getAvailableBackupMonths, hasDirectoryAccess, requestPersistedPermission } = useLocalBackup();

    const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title'>('date');
    const [calendarTypeFilter, setCalendarTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [months, setMonths] = useState<{ monthKey: string; year: number; month: number }[]>([]);
    const [revision, setRevision] = useState(0);
    const [activeMonthTransactions, setActiveMonthTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [searchTransactions, setSearchTransactions] = useState<Transaction[]>([]);
    const [monthlySummaries, setMonthlySummaries] = useState<Record<string, {
        income: number;
        expense: number;
        savings: number;
        count: number;
        monthName: string;
        year: number;
        source: 'local' | 'backup';
    }>>({});

    const loadHistoryData = useCallback(async () => {
        try {
            const localMonths = LocalRepository.getAvailableMonths();
            let mergedMonths = [...localMonths];

            if (hasDirectoryAccess) {
                try {
                    const backupMonths = await getAvailableBackupMonths();
                    backupMonths.forEach(bm => {
                        if (!mergedMonths.some(lm => lm.monthKey === bm.monthKey)) {
                            mergedMonths.push(bm);
                        }
                    });
                } catch (err) {
                    console.error('Failed to query backup months:', err);
                }
            }

            mergedMonths.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
            setMonths(mergedMonths);

            const summaries: Record<string, any> = {};
            for (const m of mergedMonths) {
                const hasLocal = localMonths.some(lm => lm.monthKey === m.monthKey);
                if (hasLocal) {
                    const sum = LocalRepository.getMonthSummary(m.monthKey);
                    const monthName = getMonthName(m.month - 1, language === 'bn');
                    summaries[m.monthKey] = {
                        income: sum?.income || 0,
                        expense: sum?.expense || 0,
                        savings: sum?.savings || 0,
                        count: sum?.count || 0,
                        monthName: monthName || '',
                        year: m.year,
                        source: 'local'
                    };
                } else {
                    try {
                        const txs = await getBackupTransactionsForMonth(m.monthKey) || [];
                        let income = 0;
                        let expense = 0;
                        let validTxsCount = 0;
                        txs.forEach((item: any) => {
                            if (item && !item.deleted) {
                                validTxsCount++;
                                if (item.type === 'income') income += item.amount || 0;
                                else expense += item.amount || 0;
                            }
                        });
                        const monthName = getMonthName(m.month - 1, language === 'bn');
                        summaries[m.monthKey] = {
                            income,
                            expense,
                            savings: income - expense,
                            count: validTxsCount,
                            monthName: monthName || '',
                            year: m.year,
                            source: 'backup'
                        };
                    } catch (err) {
                        console.error(`Error loading backup transactions for ${m.monthKey}:`, err);
                        const monthName = getMonthName(m.month - 1, language === 'bn');
                        summaries[m.monthKey] = {
                            income: 0,
                            expense: 0,
                            savings: 0,
                            count: 0,
                            monthName: monthName || '',
                            year: m.year,
                            source: 'backup'
                        };
                    }
                }
            }
            setMonthlySummaries(summaries);
            setRevision(prev => prev + 1);
        } catch (e) {
            console.error('Error loading history data:', e);
        }
    }, [language, hasDirectoryAccess, getAvailableBackupMonths, getBackupTransactionsForMonth]);

    useEffect(() => {
        loadHistoryData();

        window.addEventListener('costpilot-settings-updated', loadHistoryData);
        window.addEventListener('storage', loadHistoryData);
        return () => {
            window.removeEventListener('costpilot-settings-updated', loadHistoryData);
            window.removeEventListener('storage', loadHistoryData);
        };
    }, [loadHistoryData]);

    useEffect(() => {
        if (!selectedMonthKey) {
            setActiveMonthTransactions([]);
            return;
        }

        let isMounted = true;
        const loadActiveTransactions = async () => {
            setIsLoadingTransactions(true);
            try {
                const localMonths = LocalRepository.getAvailableMonths();
                const hasLocal = localMonths.some(lm => lm.monthKey === selectedMonthKey);

                let txs: Transaction[] = [];
                if (hasLocal) {
                    txs = LocalRepository.getExpensesForMonth(selectedMonthKey) as Transaction[];
                } else {
                    const backupTxs = await getBackupTransactionsForMonth(selectedMonthKey);
                    txs = (backupTxs || []) as Transaction[];
                }

                if (isMounted) {
                    setActiveMonthTransactions(txs);
                }
            } catch (err) {
                console.error("Failed to load active transactions:", err);
                if (isMounted) {
                    setActiveMonthTransactions([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingTransactions(false);
                }
            }
        };

        loadActiveTransactions();
        return () => {
            isMounted = false;
        };
    }, [selectedMonthKey, revision, getBackupTransactionsForMonth]);

    const handlePurgeMonth = useCallback(async () => {
        if (!selectedMonthKey) return;

        // Verify backup exists
        const backupTxs = await getBackupTransactionsForMonth(selectedMonthKey);
        if (!backupTxs || backupTxs.length === 0) {
            toast.error(language === 'bn' 
                ? 'আর্কাইভ করার আগে ব্যাকআপ তৈরি করুন! আপনার সেটিংস পৃষ্ঠা থেকে এটি নিশ্চিত করুন।' 
                : 'Create a backup before archiving! Ensure backups are configured in settings.');
            return;
        }

        LocalRepository.purgeMonthPartition(selectedMonthKey);
        toast.success(language === 'bn' 
            ? 'সফলভাবে আর্কাইভ করা হয়েছে এবং ডিভাইস মেমরি খালি করা হয়েছে!' 
            : 'Archived successfully! Local storage space has been freed.');
        loadHistoryData();
    }, [selectedMonthKey, getBackupTransactionsForMonth, language, loadHistoryData]);

    // Load search transactions only when searching
    useEffect(() => {
        if (searchQuery.trim() !== '') {
            const allTxs = LocalRepository.getAllExpenses();
            setSearchTransactions(allTxs as Transaction[]);
        } else {
            setSearchTransactions([]);
        }
    }, [searchQuery]);

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

    const isFiltering = searchQuery.length > 0;

    const filteredResults = useMemo(() => {
        const validTxs = (searchTransactions || []).filter((t): t is Transaction =>
            t !== null &&
            t !== undefined &&
            typeof t === 'object' &&
            typeof t.id === 'string' &&
            typeof t.amount === 'number' &&
            (t.type === 'income' || t.type === 'expense')
        );
        return validTxs.filter(t => {
            const title = t.title || '';
            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        }).sort((a, b) => {
            if (sortBy === 'date') {
                const dateSort = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateSort !== 0) return dateSort;
                const aTime = (a as any).created_at || '';
                const bTime = (b as any).created_at || '';
                if (bTime && aTime) return bTime.localeCompare(aTime);
                return b.id.localeCompare(a.id);
            }
            if (sortBy === 'amount') return b.amount - a.amount;
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            return 0;
        });
    }, [searchTransactions, searchQuery, sortBy]);

    const monthKeys = useMemo(() => {
        return Object.keys(monthlySummaries).sort().reverse();
    }, [monthlySummaries]);

    // Specific Month Detail View
    if (selectedMonthKey && monthlySummaries[selectedMonthKey] && !isFiltering) {
        if (isLoadingTransactions) {
            return (
                <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center text-stone-400">
                    <span className="material-symbols-outlined text-4xl animate-spin text-[#AF8F42]">sync</span>
                    <p className="text-xs font-bold uppercase tracking-wider mt-2">{t('settings.backup.status_syncing')}</p>
                </div>
            );
        }

        const validTransactions = (activeMonthTransactions || []).filter((t): t is Transaction =>
            t !== null &&
            t !== undefined &&
            typeof t === 'object' &&
            typeof t.id === 'string' &&
            typeof t.amount === 'number' &&
            (t.type === 'income' || t.type === 'expense')
        );

        const summary = monthlySummaries[selectedMonthKey] || {};
        const data = {
            income: 0,
            expense: 0,
            savings: 0,
            count: 0,
            monthName: '',
            year: new Date().getFullYear(),
            source: 'local' as 'local' | 'backup',
            ...summary,
            transactions: validTransactions
        };

        // Group by date
        const grouped: { [dateKey: string]: { label: string; transactions: Transaction[] } } = {};
        data.transactions.forEach(t => {
            const dateStr = t.date || '';
            let d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                d = new Date();
            }
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const day = d.getDate();
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (!grouped[dateKey]) {
                const monthNameStr = getMonthName(d.getMonth(), language === 'bn');
                grouped[dateKey] = { label: `${day} ${monthNameStr} - ${year}`, transactions: [] };
            }
            grouped[dateKey].transactions.push(t);
        });
        const sortedDateKeys = Object.keys(grouped).sort().reverse();

        // All transactions in this month for lookup
        const monthTransactionMap = new Map(data.transactions.map(tx => [tx.id, tx]));
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
                        <span className="font-bold text-sm uppercase tracking-wider">{t('ledger.back_to_summary')}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {isSelectMode ? (
                            <>
                                <button
                                    onClick={() => selectedIds.size > 0 && setIsConfirmOpen(true)}
                                    title={selectedIds.size > 0 ? (language === 'bn' ? `${selectedIds.size}টি নির্বাচিত মুছুন` : `Delete ${selectedIds.size} selected`) : (language === 'bn' ? 'প্রথমে আইটেম নির্বাচন করুন' : 'Select items first')}
                                    className={`size-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${selectedIds.size > 0
                                        ? 'bg-rose-500 text-white hover:bg-rose-600'
                                        : 'bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                                <button
                                    onClick={toggleSelectMode}
                                    title={language === 'bn' ? 'নির্বাচন বাতিল করুন' : 'Cancel selection'}
                                    className="size-8 rounded-lg flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={toggleSelectMode}
                                title={language === 'bn' ? 'লেনদেন নির্বাচন করুন' : 'Select transactions'}
                                className="size-8 rounded-lg flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">checklist</span>
                            </button>
                        )}
                    </div>
                </div>

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                    <div>
                        <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white capitalize">
                            {data.monthName} <span className="text-stone-400 font-light">{data.year}</span>
                        </h2>
                        <p className="text-sm text-stone-500 dark:text-stone-400">{t('ledger.detailed_desc')}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                        <div>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('ledger.net_savings')}</p>
                            <p className={`text-xl font-bold ${data.savings >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                {data.savings >= 0 ? '+' : ''}{currencySymbol}{formatAmount(data.savings)}
                            </p>
                        </div>
                        {data.source === 'local' && selectedMonthKey !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` && (
                            <button
                                onClick={handlePurgeMonth}
                                className="px-3 py-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                                title="Free device storage space. This month's data will only be read from your local backup files on disk."
                            >
                                <span className="material-symbols-outlined text-sm">archive</span>
                                {language === 'bn' ? 'আর্কাইভ (মেমরি খালি করুন)' : 'Archive (Free Space)'}
                            </button>
                        )}
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
                                        {dailyNet > 0 ? `-${currencySymbol}${formatAmount(dailyNet)}` : dailyNet < 0 ? `+${currencySymbol}${formatAmount(Math.abs(dailyNet))}` : `${currencySymbol}0`}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    {dayTransactions.map((tx) => {
                                        const isSelected = selectedIds.has(tx.id);
                                        return (
                                            /* Relative wrapper for overlay checkbox */
                                            <div key={tx.id} className="relative">
                                                <button
                                                    onClick={() => isSelectMode ? toggleId(tx.id) : onTransactionClick(tx)}
                                                    className={`w-full flex items-center gap-4 p-3 bg-brand-surface-light dark:bg-brand-surface-dark rounded-xl border transition-all duration-200 ease-out text-left active:scale-[0.99]
                                                        ${isSelected
                                                            ? 'border-primary-500 dark:border-primary-500 shadow-md shadow-primary-500/10'
                                                            : 'border-[#AF8F42]/30 dark:border-[#AF8F42]/40 hover:border-[#AF8F42]/60 hover:shadow-xl hover:shadow-[#AF8F42]/10'
                                                        }`}
                                                >
                                                    <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                        <span className="material-symbols-outlined text-2xl">{tx.type === 'income' ? 'trending_up' : 'payments'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-stone-900 dark:text-white truncate">{tx.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>{tx.type === 'income' ? t('common.income') : t('common.expense')}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
                                                        {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(tx.amount)}
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
                    title={t('overview.delete_title')}
                    message={t('overview.delete_message', { count: selectedIds.size })}
                    confirmLabel={t('common.delete')}
                    cancelLabel={t('common.cancel')}
                    variant="danger"
                    extraContent={
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {selectedTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-left">
                                    <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${tx.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                        <span className="material-symbols-outlined text-[16px]">{tx.type === 'income' ? 'trending_up' : 'payments'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-stone-900 dark:text-white truncate">{tx.title}</p>
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wide">{tx.type === 'income' ? t('common.income') : t('common.expense')}</p>
                                    </div>
                                    <span className={`text-xs font-bold tabular-nums ${tx.type === 'expense' ? 'text-stone-700 dark:text-stone-300' : 'text-green-600 dark:text-green-400'}`}>
                                        {tx.type === 'expense' ? '-' : '+'}{currencySymbol}{formatAmount(tx.amount)}
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
                    <h2 className="text-2xl font-bold leading-tight font-brand-title brand-gradient">{t('common.history')}</h2>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">{t('ledger.title')}</p>
                </div>
                <div className="flex-1"></div>
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                    <button
                        onClick={() => onViewModeChange('summary')}
                        className={`size-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'summary' ? 'bg-white dark:bg-stone-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                        title={language === 'bn' ? 'তালিকা ভিউ' : 'List View'}
                    >
                        <span className="material-symbols-outlined">list</span>
                    </button>
                    <button
                        onClick={() => onViewModeChange('calendar')}
                        className={`size-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-stone-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                        title={language === 'bn' ? 'ক্যালেন্ডার ভিউ' : 'Calendar View'}
                    >
                        <span className="material-symbols-outlined">calendar_month</span>
                    </button>
                </div>
            </div>

            {/* Search and Filters Header - Only shown in summary view */}
            {viewMode === 'summary' && (
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-1">
                        <label className="text-[0.75rem] font-bold text-stone-400 uppercase tracking-wider block px-1">{language === 'bn' ? 'অনুসন্ধান করুন' : 'Search'}</label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary-600 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder={t('ledger.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-950 dark:border-stone-300 rounded-xl py-2 pl-10 pr-4 text-sm font-bold placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all text-stone-900 dark:text-white shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="md:w-48">
                        <Dropdown
                            label={t('ledger.sort_by')}
                            options={[
                                { id: 'date', name: t('ledger.sort_newest') },
                                { id: 'amount', name: t('ledger.sort_highest') },
                                { id: 'title', name: t('ledger.sort_alpha') }
                            ]}
                            value={sortBy}
                            onChange={(val) => setSortBy(val as any)}
                        />
                    </div>
                </div>
            )}

            {
                viewMode === 'calendar' ? (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-end px-1">
                            <Dropdown
                                options={[
                                    { id: 'all', name: t('ledger.filter_all') },
                                    { id: 'income', name: t('ledger.filter_income') },
                                    { id: 'expense', name: t('ledger.filter_expense') }
                                ]}
                                value={calendarTypeFilter}
                                onChange={(val) => setCalendarTypeFilter(val as any)}
                                className="w-48"
                            />
                        </div>
                        <CalendarView
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
                                {t('ledger.search_results')} ({filteredResults.length})
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredResults.length > 0 ? (
                                filteredResults.map((tx) => (
                                    <button
                                        key={tx.id}
                                        onClick={() => onTransactionClick(tx)}
                                        className="flex items-center gap-4 p-3 md:p-3.5 bg-brand-surface-light dark:bg-brand-surface-dark rounded-xl border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 hover:border-[#AF8F42]/60 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-[#AF8F42]/10 group text-left shadow-sm active:scale-[0.99]"
                                    >
                                        <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'income'
                                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                            }`}>
                                            <span className="material-symbols-outlined text-2xl">{tx.type === 'income' ? 'trending_up' : 'payments'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-stone-900 dark:text-white truncate">{tx.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>{tx.type === 'income' ? t('common.income') : t('common.expense')}</span>
                                                <span className="text-[8px] text-stone-300 dark:text-stone-700 font-black leading-none">•</span>
                                                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium uppercase tracking-wider leading-none">{formatDate(tx.date, language === 'bn' ? 'bn' : 'en')}</span>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
                                            {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(tx.amount)}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-stone-400 opacity-30">
                                    <span className="material-symbols-outlined text-6xl">search_off</span>
                                    <p className="font-bold uppercase mt-2">{t('ledger.no_entries')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Monthly Summary View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                        {monthKeys.length > 0 ? (
                            monthKeys.map(key => {
                                const summary = monthlySummaries[key];
                                const data = summary || {
                                    income: 0,
                                    expense: 0,
                                    savings: 0,
                                    count: 0,
                                    monthName: '',
                                    year: new Date().getFullYear(),
                                    source: 'local'
                                };
                                return (
                                    <button
                                        key={key}
                                        onClick={async () => {
                                            if (data.source !== 'local') {
                                                const hasAccess = await requestPersistedPermission();
                                                if (!hasAccess) {
                                                    toast.error(language === 'bn'
                                                        ? 'আর্কাইভ করা তথ্য অ্যাক্সেস করতে ফাইল পারমিশন প্রয়োজন।'
                                                        : 'File permission is required to access archived data.');
                                                    return;
                                                }
                                            }
                                            setSelectedMonthKey(key);
                                        }}
                                        className="card-section p-0 overflow-hidden group hover:border-primary-300 dark:hover:border-primary-800 transition-all hover:shadow-xl hover:shadow-primary-500/5 text-left"
                                    >
                                        <div className="p-4 md:p-5 border-b border-stone-50 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
                                            <div>
                                                <h3 className="text-xl font-bold text-stone-900 dark:text-white">{data.monthName || ''}</h3>
                                                <p className="text-xs text-stone-500 font-medium tracking-wide uppercase">{data.year || ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                    data.source === 'local' 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                                        : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                                                }`}>
                                                    {data.source === 'local' 
                                                        ? (language === 'bn' ? 'ডিভাইস' : 'Device') 
                                                        : (language === 'bn' ? 'আর্কাইভ (ডিস্ক)' : 'Archive (Disk)')}
                                                </span>
                                                <div className="size-10 rounded-full bg-brand-base-light dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-[#AF8F42] group-hover:bg-[#AF8F42]/10 transition-all">
                                                    <span className="material-symbols-outlined">chevron_right</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 md:p-5 grid grid-cols-2 gap-4 md:gap-5 font-bold">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">{t('dashboard.inflow')}</p>
                                                <p className="text-lg text-green-600">+{currencySymbol}{formatAmount(data.income)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">{t('dashboard.outflow')}</p>
                                                <p className="text-lg text-rose-600">-{currencySymbol}{formatAmount(data.expense)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">{t('ledger.savings')}</p>
                                                <p className={`text-lg ${(data.savings || 0) >= 0 ? 'text-primary-600' : 'text-amber-600'}`}>
                                                    {currencySymbol}{formatAmount(data.savings)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-stone-400 uppercase tracking-widest">{t('ledger.entries_count')}</p>
                                                <p className="text-lg text-stone-700 dark:text-stone-300">{data.count || 0}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="col-span-full card p-20 flex flex-col items-center justify-center text-stone-400 border-dashed border-2 opacity-50">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">history_edu</span>
                                <p className="text-lg font-black uppercase tracking-widest">{t('ledger.zero_ops')}</p>
                                <p className="text-sm font-medium">{t('ledger.zero_ops_desc')}</p>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default History;
