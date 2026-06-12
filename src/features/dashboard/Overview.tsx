import React, { useMemo, useState, useCallback } from 'react';
import { Transaction, MonthlyData } from '../../entities/types';
import { formatDate } from '../../entities/financial';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface OverviewProps {
  month: MonthlyData;
  transactions: Transaction[];
  onBack: () => void;
  onTransactionClick: (t: Transaction) => void;
  onDeleteTransactions: (ids: string[]) => void;
  currency: string;
  typeFilter?: 'income' | 'expense' | null;
  onClearFilter?: () => void;
}

const getCurrencySymbol = (code: string) => {
  const symbols: Record<string, string> = { 'USD': '$', 'BDT': '৳', 'EUR': '€' };
  return symbols[code] || '$';
};

const Overview: React.FC<OverviewProps> = ({ month, transactions, onBack, onTransactionClick, onDeleteTransactions, currency, typeFilter, onClearFilter }) => {
  const { t, language } = useLanguage();
  const currencySymbol = getCurrencySymbol(currency);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const getLocalizedMonth = useCallback((monthName: string, year: number) => {
    if (monthName === 'Unknown') return monthName;
    try {
      const date = new Date(`${monthName} 1, ${year}`);
      return date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
    } catch {
      return monthName;
    }
  }, [language]);

  const filteredTransactions = useMemo(() => {
    if (!typeFilter) return transactions;
    return transactions.filter(t => t.type === typeFilter);
  }, [transactions, typeFilter]);

  // Flat map for quick lookup by id
  const transactionMap = useMemo(() => {
    const map = new Map<string, Transaction>();
    filteredTransactions.forEach(t => map.set(t.id, t));
    return map;
  }, [filteredTransactions]);

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

  const selectedTransactions = useMemo(
    () => Array.from(selectedIds).map(id => transactionMap.get(id)).filter(Boolean) as Transaction[],
    [selectedIds, transactionMap]
  );

  // Group sorted transactions by date
  const groupedDays = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      const dateSort = b.date.localeCompare(a.date);
      if (dateSort !== 0) return dateSort;
      const aTime = (a as any).created_at || '';
      const bTime = (b as any).created_at || '';
      if (bTime && aTime) return bTime.localeCompare(aTime);
      return b.id.localeCompare(a.id);
    });

    const grouped: { [dateKey: string]: { label: string; transactions: Transaction[] } } = {};
    sorted.forEach(t => {
      const dateStr = t.date || '';
      let dObj = new Date(dateStr);
      if (isNaN(dObj.getTime())) {
        dObj = new Date();
      }
      const year = dObj.getFullYear();
      const monthVal = dObj.getMonth() + 1;
      const day = dObj.getDate();
      const dateKey = `${year}-${String(monthVal).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!grouped[dateKey]) {
        const monthName = dObj.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
        grouped[dateKey] = { label: `${day} ${monthName} - ${year}`, transactions: [] };
      }
      grouped[dateKey].transactions.push(t);
    });

    return { grouped, sortedDateKeys: Object.keys(grouped).sort().reverse() };
  }, [filteredTransactions, language]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="size-10 rounded-lg bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white leading-tight font-brand-title">
              {getLocalizedMonth(month.month, month.year)} {month.year}
            </h2>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">{t('overview.monthly_records')}</p>
          </div>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-3 md:p-4 flex items-center gap-4">
          <div className="size-12 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
            <span className="material-symbols-outlined">arrow_upward</span>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('dashboard.total_income')}</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white">{currencySymbol}{(month.income || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="card p-3 md:p-4 flex items-center gap-4">
          <div className="size-12 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <span className="material-symbols-outlined">arrow_downward</span>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('dashboard.total_expense')}</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white">{currencySymbol}{(month.expense || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <section className="space-y-4">
        {typeFilter && (
          <div className="flex items-center gap-2 px-1 animate-in fade-in duration-300">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${typeFilter === 'income'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
              }`}>
              <span className="material-symbols-outlined text-sm">{typeFilter === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
              {t('overview.showing_filter', { type: typeFilter === 'income' ? t('common.income') : t('common.expense') })}
            </div>
            {onClearFilter && (
              <button
                onClick={onClearFilter}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95 uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                {t('overview.clear')}
              </button>
            )}
          </div>
        )}

        {/* Section header with select controls */}
        <div className="flex items-center justify-between px-1">
          {/* Left: contextual title */}
          <div className="flex flex-col">
            {isSelectMode ? (
              <>
                <h3 className="font-bold text-stone-900 dark:text-white leading-tight">
                  {selectedIds.size > 0
                    ? t('overview.selected_count', { count: selectedIds.size, total: filteredTransactions.length })
                    : t('overview.select_entries')
                  }
                </h3>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  {t('overview.total_this_month', { count: filteredTransactions.length })}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-stone-900 dark:text-white leading-tight">{t('overview.timeline')}</h3>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">{t('overview.entries_this_month', { count: filteredTransactions.length })}</p>
              </>
            )}
          </div>

          {/* Right: action buttons */}
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

        <div className="flex flex-col gap-5">
          {groupedDays.sortedDateKeys.length === 0 ? (
            <div className="py-20 card flex flex-col items-center justify-center text-stone-400 border-dashed border-2">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-20">history_edu</span>
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">{t('overview.no_records')}</p>
            </div>
          ) : (
            groupedDays.sortedDateKeys.map(dateKey => {
              const dayTransactions = groupedDays.grouped[dateKey].transactions;
              const dailyExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const dailyIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
              const dailyNet = dailyExpense - dailyIncome;

              return (
                <div key={dateKey} className="space-y-2.5">
                  {/* Date header with daily total */}
                  <div className="flex items-center gap-3 px-1 pt-1">
                    <span className="material-symbols-outlined text-base text-primary-500 dark:text-primary-400">calendar_today</span>
                    <h3 className="text-xs font-extrabold text-stone-600 dark:text-stone-300 uppercase tracking-widest whitespace-nowrap">
                      {groupedDays.grouped[dateKey].label}
                    </h3>
                    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                    <span className={`text-xs font-black tabular-nums whitespace-nowrap ${dailyNet > 0 ? 'text-rose-500 dark:text-rose-400' : dailyNet < 0 ? 'text-green-600 dark:text-green-400' : 'text-stone-400'}`}>
                      {dailyNet > 0 ? `-${currencySymbol}${dailyNet.toLocaleString()}` : dailyNet < 0 ? `+${currencySymbol}${Math.abs(dailyNet).toLocaleString()}` : `${currencySymbol}0`}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {dayTransactions.map((tItem) => {
                      const isSelected = selectedIds.has(tItem.id);
                      return (
                        /* Wrapper is relative so checkbox overlay can be absolute */
                        <div key={tItem.id} className="relative">
                          {/* The card — layout never shifts */}
                          <button
                            onClick={() => isSelectMode ? toggleId(tItem.id) : onTransactionClick(tItem)}
                            className={`w-full card p-3 flex items-center gap-4 group border transition-all duration-200 ease-out active:scale-[0.99] text-left
                              ${isSelected
                                ? 'border-primary-500 dark:border-primary-500 shadow-md shadow-primary-500/10'
                                : 'border-[#AF8F42]/30 dark:border-[#AF8F42]/40 hover:border-[#AF8F42]/60 hover:shadow-xl hover:shadow-[#AF8F42]/10'
                              }`}
                          >
                            <div className={`size-12 rounded-lg flex items-center justify-center bg-stone-50 dark:bg-stone-800 shrink-0 ${tItem.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
                              <span className="material-symbols-outlined text-2xl">{tItem.type === 'income' ? 'trending_up' : 'payments'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-stone-900 dark:text-white truncate">{tItem.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${tItem.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>{tItem.type === 'income' ? t('common.income') : t('common.expense')}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-lg ${tItem.type === 'expense' ? 'text-stone-900 dark:text-white' : 'text-green-600 dark:text-green-400'}`}>
                                {tItem.type === 'expense' ? '-' : '+'}{currencySymbol}{tItem.amount.toLocaleString()}
                              </p>
                            </div>
                          </button>

                          {/* Checkbox overlay — only rendered in select mode, floats top-left */}
                          {isSelectMode && (
                            <div
                              onClick={() => toggleId(tItem.id)}
                              className="absolute top-2 left-2 pointer-events-none"
                            >
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
            })
          )}
        </div>
      </section>

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
            {selectedTransactions.map(tItem => (
              <div key={tItem.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-left">
                <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${tItem.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                  <span className="material-symbols-outlined text-[16px]">{tItem.type === 'income' ? 'trending_up' : 'payments'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-900 dark:text-white truncate">{tItem.title}</p>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">{tItem.type === 'income' ? t('common.income') : t('common.expense')}</p>
                </div>
                <span className={`text-xs font-bold tabular-nums ${tItem.type === 'expense' ? 'text-stone-700 dark:text-stone-300' : 'text-green-600 dark:text-green-400'}`}>
                  {tItem.type === 'expense' ? '-' : '+'}{currencySymbol}{tItem.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
};

export default Overview;
