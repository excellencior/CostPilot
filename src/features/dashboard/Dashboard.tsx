import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MonthlyData, Transaction } from '../../entities/types';
import { formatDate } from '../../entities/financial';
import WelcomeModal from './WelcomeModal';
import BudgetModal from './BudgetModal';
import { INSPIRATIONAL_QUOTES, BN_INSPIRATIONAL_QUOTES } from '../../quotes';
import { Preferences } from '@capacitor/preferences';
import { LocalRepository } from '../../infrastructure/local/local-repository';
import { getCurrencySymbol, formatAmount, getMonthIndex, getMonthName } from '../../entities/financial';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface DashboardProps {
  monthlyData: MonthlyData[];
  transactions: Transaction[];
  onAddEntry: () => void;
  onViewAll: () => void;
  onTransactionClick: (t: Transaction) => void;
  onTypeFilter: (type: 'income' | 'expense') => void;
  currencySymbol: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  monthlyData,
  transactions,
  onAddEntry,
  onViewAll,
  onTransactionClick,
  onTypeFilter,
  currencySymbol
}) => {
  const { t, language } = useLanguage();
  const currentMonth = monthlyData[0] || { month: 'Unknown', year: new Date().getFullYear(), income: 0, expense: 0 };
  const balance = currentMonth.income - currentMonth.expense;

  // Filter transactions for the current focused month only
  const currentMonthTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const parts = t.date.split('-');
    if (parts.length < 2) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const targetMonthIndex = getMonthIndex(currentMonth.month);
    return year === currentMonth.year && month === (targetMonthIndex + 1);
  });

  const recentTransactions = currentMonthTransactions.slice(0, 4);
  const hasEntries = currentMonthTransactions.length > 0;

  // Pick a random quote index once per layout cycle when empty
  const quoteIndex = useMemo(() => Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length), [hasEntries]);
  const quote = language === 'bn' ? BN_INSPIRATIONAL_QUOTES[quoteIndex] : INSPIRATIONAL_QUOTES[quoteIndex];

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);

  const loadBudget = useCallback(() => {
    setMonthlyBudget(LocalRepository.getMonthlyBudget(currentMonth.year, currentMonth.month));
  }, [currentMonth.year, currentMonth.month]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  useEffect(() => {
    const checkVisited = async () => {
      const { value } = await Preferences.get({ key: 'hasVisitedDashboard' });
      if (!value) {
        setIsWelcomeModalOpen(true);
      }
    };
    checkVisited();
  }, []);

  const handleCloseWelcome = async () => {
    await Preferences.set({ key: 'hasVisitedDashboard', value: 'true' });
    setIsWelcomeModalOpen(false);
  };

  const getLocalizedMonth = useCallback((monthName: string, year: number) => {
    if (monthName === 'Unknown') return monthName;
    const monthIndex = getMonthIndex(monthName);
    return getMonthName(monthIndex, language === 'bn');
  }, [language]);

  const budgetQuoteIndex = useMemo(() => Math.floor(Math.random() * 5), [monthlyBudget]);
  const budgetQuotes = language === 'bn' ? [
    "বাজেট হলো আপনার অর্থকে বলা সে কোথায় যাবে।",
    "যা অবশিষ্ট থাকে তা সঞ্চয় করবেন না — সঞ্চয় করার পরে যা অবশিষ্ট থাকে তা ব্যয় করুন।",
    "স্বাধীনতার গোপন রহস্য একটি পরিকল্পনা দিয়ে শুরু হয়।",
    "প্রতিটি বাজেট আপনার স্বপ্নের আরও এক ধাপ কাছাকাছি।",
    "ছোট বাজেট বড় ভবিষ্যতের দিকে নিয়ে যায়।"
  ] : [
    "A budget is telling your money where to go.",
    "Don't save what's left — spend what's left after saving.",
    "The secret to freedom starts with a plan.",
    "Every budget is a step closer to your dreams.",
    "Small budgets lead to big futures.",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcome} />

      {/* Hero Stats */}
      <section className={`card p-6 md:p-10 border-none text-white overflow-hidden relative shadow-2xl transition-all duration-700 ${hasEntries ? 'bg-primary-600 shadow-primary-600/30' : 'bg-stone-900 shadow-stone-900/40'
        }`}>
        {/* Artistic Decorative Elements */}
        {!hasEntries && (
          <>
            <div className="absolute -top-24 -right-24 size-64 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-24 -left-24 size-64 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
          </>
        )}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex flex-col justify-center flex-1">
            <p className="text-primary-200/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-100 flex items-center gap-2">
              {hasEntries ? `${t('dashboard.active_portfolio')} ・ ${getLocalizedMonth(currentMonth.month, currentMonth.year)}` : t('dashboard.start_journey')}
            </p>

            {hasEntries ? (
              <h3 className="text-4xl md:text-6xl font-black tracking-tight">{currencySymbol}{formatAmount(balance)}</h3>
            ) : (
              <div className="space-y-4">
                <h3 className="text-3xl md:text-5xl font-light tracking-tight leading-tight">
                  {quote.line1} <span className="font-black text-white">{quote.highlight}</span>
                </h3>
                <h3 className="text-3xl md:text-5xl font-light tracking-tight leading-tight italic opacity-90">
                  {quote.line2} <span className="font-black text-primary-200 not-italic">{quote.highlightSuffix}</span>
                </h3>
              </div>
            )}
          </div>

          {hasEntries && (
            <div className="flex flex-row sm:flex-row items-center gap-2 md:gap-4 w-full sm:w-auto">
              <button
                onClick={() => onTypeFilter('income')}
                className="flex-1 sm:flex-none flex items-center gap-3 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 hover:bg-white/20 hover:border-white/25 transition-all active:scale-95 cursor-pointer"
              >
                <div className="size-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">{t('dashboard.inflow')}</p>
                  <p className="text-sm md:text-base font-bold font-mono text-white leading-none">
                    {currencySymbol}{formatAmount(currentMonth.income)}
                  </p>
                </div>
              </button>

              <button
                onClick={() => onTypeFilter('expense')}
                className="flex-1 sm:flex-none flex items-center gap-3 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 hover:bg-white/20 hover:border-white/25 transition-all active:scale-95 cursor-pointer"
              >
                <div className="size-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">{t('dashboard.outflow')}</p>
                  <p className="text-sm md:text-base font-bold font-mono text-white leading-none">
                    {currencySymbol}{formatAmount(currentMonth.expense)}
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Mini Progress Bar - Only shown with data */}
        {hasEntries && (
          <div className="mt-6 relative z-10 space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary-100/60">
              <span>{t('dashboard.velocity')}</span>
              <span>{Math.min(100, (currentMonth.income > 0 ? Math.round((currentMonth.expense / currentMonth.income) * 100) : 0))}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-1000"
                style={{ width: `${Math.min(100, (currentMonth.income > 0 ? (currentMonth.expense / currentMonth.income) * 100 : 0))}%` }}
              ></div>
            </div>
          </div>
        )}
      </section>

      {/* Recent & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Transactions */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-stone-900 dark:text-white">{t('dashboard.recent_transactions')}</h3>
          </div>

          <div className="space-y-2">
            {recentTransactions.length > 0 ? (
              <>
                {recentTransactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => onTransactionClick(tx)}
                    className="w-full card p-3 md:p-4 flex items-center gap-3 md:gap-4 border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 hover:border-[#AF8F42]/60 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-[#AF8F42]/10 group active:scale-[0.99]"
                  >
                    <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">{tx.type === 'income' ? 'trending_up' : 'payments'}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-stone-900 dark:text-white truncate">{tx.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>{tx.type === 'income' ? t('common.income') : t('common.expense')}</span>
                        <span className="text-[8px] text-stone-300 dark:text-stone-700 font-black leading-none">•</span>
                        <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider leading-none">{formatDate(tx.date, language)}</span>
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(tx.amount)}
                    </div>
                  </button>
                ))}

                {hasEntries && (
                  <div className="pt-2">
                    <button
                      onClick={onViewAll}
                      className="w-full py-3.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/60 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-200/60 dark:border-stone-800 transition-all active:scale-[0.98] shadow-sm uppercase tracking-wider"
                    >
                      <span>{t('dashboard.view_all')}</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-8 flex flex-col items-center justify-center text-stone-400 border-dashed border-stone-200 dark:border-stone-800">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">history_edu</span>
                <p className="text-sm font-medium">{t('dashboard.no_transactions_yet')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Financial Health */}
        <section className="space-y-4">
          <h3 className="font-bold text-stone-900 dark:text-white px-1">{t('dashboard.overview')}</h3>
          <div className="card p-3 md:p-4 bg-stone-900 text-white dark:bg-brand-surface-dark">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-4">{t('dashboard.financial_health')}</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-sm text-stone-300">{t('dashboard.savings_rate')}</p>
                <p className="text-xl font-bold">{currentMonth.income > 0 ? Math.round(((currentMonth.income - currentMonth.expense) / currentMonth.income) * 100) : 0}%</p>
              </div>
              <div className="w-full h-2 bg-stone-800 dark:bg-stone-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${Math.max(0, currentMonth.income > 0 ? ((currentMonth.income - currentMonth.expense) / currentMonth.income) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="w-full flex justify-between items-center text-sm group hover:bg-white/5 -mx-1 px-1 py-1.5 rounded-lg transition-all active:scale-[0.98]"
              >
                <span className="text-stone-400 group-hover:text-stone-300 transition-colors">{t('dashboard.monthly_budget')}</span>
                {monthlyBudget !== null ? (
                  <span className="font-bold text-[#AF8F42] flex items-center gap-1.5">
                    {currencySymbol}{formatAmount(monthlyBudget)}
                    <span className="material-symbols-outlined text-[14px] text-stone-500 group-hover:text-[#AF8F42] transition-colors">edit</span>
                  </span>
                ) : (
                  <span className="font-bold text-stone-500 italic text-xs flex items-center gap-1.5">
                    {t('dashboard.tap_to_set')}
                    <span className="material-symbols-outlined text-[14px] text-[#AF8F42] group-hover:translate-x-0.5 transition-transform">add_circle</span>
                  </span>
                )}
              </button>
              {monthlyBudget === null && (
                <p className="text-[10px] italic text-stone-500 leading-relaxed px-0.5">
                  "{budgetQuotes[budgetQuoteIndex]}"
                </p>
              )}
              {monthlyBudget !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    <span>{t('dashboard.budget_used')}</span>
                    <span>{Math.min(100, monthlyBudget > 0 ? Math.round((currentMonth.expense / monthlyBudget) * 100) : 0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 dark:bg-stone-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        currentMonth.expense > monthlyBudget ? 'bg-rose-500' : currentMonth.expense > monthlyBudget * 0.8 ? 'bg-amber-500' : 'bg-[#AF8F42]'
                      }`}
                      style={{ width: `${Math.min(100, monthlyBudget > 0 ? (currentMonth.expense / monthlyBudget) * 100 : 0)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    {currentMonth.expense > monthlyBudget
                      ? <span className="text-rose-400 font-bold">{t('dashboard.over_budget', { amount: currencySymbol + formatAmount(currentMonth.expense - monthlyBudget) })}</span>
                      : <span>{t('dashboard.remaining', { amount: currencySymbol + formatAmount(monthlyBudget - currentMonth.expense) })}</span>
                    }
                  </p>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">{t('dashboard.total_transactions')}</span>
                <span className="font-bold text-white">{transactions.length}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentMonth={currentMonth.month}
        currentYear={currentMonth.year}
        currencySymbol={currencySymbol}
        onBudgetChange={loadBudget}
      />
    </div>
  );
};

export default Dashboard;
