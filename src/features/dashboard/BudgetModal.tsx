import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BudgetPlan } from '../../entities/types';
import { LocalRepository } from '../../infrastructure/local/local-repository';
import NumericKeypad from '../../shared/ui/NumericKeypad';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface BudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMonth: string;
    currentYear: number;
    currencySymbol: string;
    onBudgetChange: () => void;
}

const BudgetModal: React.FC<BudgetModalProps> = ({
    isOpen,
    onClose,
    currentMonth,
    currentYear,
    currencySymbol,
    onBudgetChange
}) => {
    const { t, language } = useLanguage();
    const [plans, setPlans] = useState<BudgetPlan[]>([]);
    const [mode, setMode] = useState<'select' | 'edit'>('select');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<BudgetPlan | null>(null);
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [amountDisplay, setAmountDisplay] = useState('');
    const [activeBudget, setActiveBudget] = useState<number | null>(null);
    const [isKeypadOpen, setIsKeypadOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<BudgetPlan | null>(null);
    const [cursorVisible, setCursorVisible] = useState(true);

    const quotes = t('budget.quotes') as unknown as string[];
    const quote = useMemo(() => {
        if (!quotes || !Array.isArray(quotes)) return '';
        return quotes[Math.floor(Math.random() * quotes.length)];
    }, [isOpen, quotes]);

    const getLocalizedMonth = (monthName: string, year: number) => {
        if (monthName === 'Unknown') return monthName;
        try {
            const date = new Date(`${monthName} 1, ${year}`);
            return date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
        } catch {
            return monthName;
        }
    };

    useEffect(() => {
        if (!isKeypadOpen) { setCursorVisible(true); return; }
        const id = setInterval(() => setCursorVisible(v => !v), 530);
        return () => clearInterval(id);
    }, [isKeypadOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setPlans(LocalRepository.getBudgetPlans());
            setActiveBudget(LocalRepository.getMonthlyBudget(currentYear, currentMonth));
            setIsCreateOpen(false);
            setEditingPlan(null);
            setMode('select');
            setNewName('');
            setNewAmount('');
            setAmountDisplay('');
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, currentMonth, currentYear]);

    const handleSavePlan = () => {
        const amount = parseFloat(newAmount);
        if (!newName.trim() || isNaN(amount) || amount <= 0) return;

        const plan: BudgetPlan = {
            id: editingPlan?.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: newName.trim(),
            amount,
        };
        LocalRepository.upsertBudgetPlan(plan);
        setPlans(LocalRepository.getBudgetPlans());
        setIsCreateOpen(false);
        setEditingPlan(null);
        setNewName('');
        setNewAmount('');
        setAmountDisplay('');
    };

    const handleSelectPlan = (plan: BudgetPlan) => {
        LocalRepository.setMonthlyBudget(currentYear, currentMonth, plan.amount);
        setActiveBudget(plan.amount);
        onBudgetChange();
        onClose();
    };

    const handleEditPlan = (plan: BudgetPlan) => {
        setEditingPlan(plan);
        setNewName(plan.name);
        setNewAmount(plan.amount.toString());
        setAmountDisplay(plan.amount.toString());
        setIsCreateOpen(true);
    };

    const handleDeletePlan = () => {
        if (!deleteTarget) return;
        LocalRepository.deleteBudgetPlan(deleteTarget.id);
        setPlans(LocalRepository.getBudgetPlans());
        setDeleteTarget(null);
    };

    const handlePlanClick = (plan: BudgetPlan) => {
        if (mode === 'edit') {
            handleEditPlan(plan);
        } else {
            handleSelectPlan(plan);
        }
    };

    const handleClearBudget = () => {
        LocalRepository.setMonthlyBudget(currentYear, currentMonth, null);
        setActiveBudget(null);
        onBudgetChange();
        onClose();
    };

    const handleCloseCreate = () => {
        setIsCreateOpen(false);
        setEditingPlan(null);
        setIsKeypadOpen(false);
        setNewName('');
        setNewAmount('');
        setAmountDisplay('');
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* ========== MODAL 1: Select / Edit Plans ========== */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity animate-backdrop"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-sm bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
                        <h2 className="text-lg font-bold text-stone-900 dark:text-white">{t('budget.title')}</h2>
                        <div className="flex items-center gap-1">
                            {plans.length > 0 && (
                                <button
                                    onClick={() => setMode(m => m === 'select' ? 'edit' : 'select')}
                                    className={`h-8 rounded-full flex items-center justify-center transition-all ${mode === 'edit'
                                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 gap-1'
                                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 w-8'
                                        }`}
                                    title={mode === 'edit' ? t('common.save') : t('budget.edit_plan')}
                                >
                                    {mode === 'edit' && <span className="text-xs font-bold">{t('common.save')}</span>}
                                    <span className="material-symbols-outlined text-[20px]">{mode === 'edit' ? 'check' : 'edit'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-5 max-h-[65vh] overflow-y-auto hide-scrollbar">
                        <div className="flex flex-col gap-3">
                            {/* Active budget status — hidden in edit mode */}
                            {activeBudget !== null && mode !== 'edit' && (
                                <div className="p-3 rounded-xl bg-[#AF8F42]/5 dark:bg-[#AF8F42]/10 border border-[#AF8F42]/20 flex items-center justify-between animate-scale-in">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{t('budget.active_budget')}</span>
                                    <span className="text-lg font-black text-[#AF8F42]">{currencySymbol}{activeBudget.toLocaleString()}</span>
                                </div>
                            )}

                            {/* Create new plan button — hidden in edit mode */}
                            {mode !== 'edit' && (
                                <button
                                    onClick={() => { setEditingPlan(null); setIsCreateOpen(true); }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[#AF8F42]/30 hover:border-[#AF8F42]/60 text-[#AF8F42] hover:bg-[#AF8F42]/5 transition-all active:scale-[0.98] animate-scale-in"
                                >
                                    <div className="size-10 rounded-lg bg-[#AF8F42]/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-xl">add</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">{t('budget.new_plan')}</p>
                                        <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">{t('budget.define_reusable')}</p>
                                    </div>
                                </button>
                            )}

                            {/* Saved Plans */}
                            {plans.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1 pt-1">
                                        {mode === 'edit' ? t('budget.tap_to_edit') : t('budget.saved_plans')}
                                    </p>
                                    {plans.map((plan) => (
                                        <div key={plan.id} className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePlanClick(plan)}
                                                className={`flex-1 flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] ${mode === 'edit'
                                                    ? 'border-primary-200 dark:border-primary-900/30 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                                                    : activeBudget === plan.amount
                                                        ? 'border-[#AF8F42] bg-[#AF8F42]/5 dark:bg-[#AF8F42]/10'
                                                        : 'border-stone-100 dark:border-stone-800 hover:border-[#AF8F42]/50 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${mode === 'edit'
                                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                                        : activeBudget === plan.amount
                                                            ? 'bg-[#AF8F42]/20 text-[#AF8F42]'
                                                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-xl">
                                                            {mode === 'edit' ? 'edit' : activeBudget === plan.amount ? 'check_circle' : 'account_balance_wallet'}
                                                        </span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-stone-900 dark:text-white">{plan.name}</p>
                                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{t('budget.plan_label')}</p>
                                                    </div>
                                                </div>
                                                <p className="text-base font-black text-stone-900 dark:text-white">{currencySymbol}{plan.amount.toLocaleString()}</p>
                                            </button>

                                            {/* Delete button in edit mode */}
                                            {mode === 'edit' && (
                                                <button
                                                    onClick={() => setDeleteTarget(plan)}
                                                    className="size-10 shrink-0 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors active:scale-95"
                                                    title={t('common.delete')}
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 px-4">
                                    <div className="size-12 bg-stone-50 dark:bg-stone-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-stone-100 dark:border-stone-800">
                                        <span className="material-symbols-outlined text-2xl text-stone-300 dark:text-stone-600">format_quote</span>
                                    </div>
                                    <p className="text-sm italic text-stone-500 dark:text-stone-400 leading-relaxed max-w-[240px] mx-auto">
                                        "{quote}"
                                    </p>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-3">{t('budget.new_plan')}</p>
                                </div>
                            )}

                            {/* Clear budget — hidden in edit mode */}
                            {activeBudget !== null && mode !== 'edit' && (
                                <button
                                    onClick={handleClearBudget}
                                    className="w-full py-2.5 rounded-xl text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all active:scale-95 animate-scale-in"
                                >
                                    {t('budget.remove_budget', { month: getLocalizedMonth(currentMonth, currentYear) })}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== MODAL 2: Create / Edit Plan ========== */}
            {isCreateOpen && (
                <div className={`fixed inset-0 z-[60] flex justify-center p-4 ${isKeypadOpen ? 'items-start pt-8' : 'items-center'} transition-all duration-300`}>
                    <div
                        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity animate-backdrop"
                        onClick={isKeypadOpen ? () => setIsKeypadOpen(false) : handleCloseCreate}
                    />

                    <div className="relative w-full max-w-sm bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
                            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                                {editingPlan ? t('budget.edit_plan') : t('budget.new_plan')}
                            </h2>
                            <button
                                onClick={handleCloseCreate}
                                className="size-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="label-text">{t('budget.plan_name')}</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={t('budget.enter_name_placeholder')}
                                    className="input-field text-sm text-right"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="label-text">{t('budget.plan_amount')}</label>
                                <div
                                    role="button"
                                    tabIndex={-1}
                                    onClick={() => { setAmountDisplay(newAmount); setIsKeypadOpen(true); }}
                                    className={`input-field font-mono text-lg cursor-pointer select-none min-h-[40px] flex items-center overflow-hidden text-right justify-end ${!isKeypadOpen && !newAmount ? 'text-stone-400 font-normal' : ''}`}
                                >
                                    {isKeypadOpen
                                        ? <span className="whitespace-nowrap">{amountDisplay}<span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>|</span></span>
                                        : (newAmount || <span className="text-stone-400 font-normal">0.00</span>)
                                    }
                                </div>
                                <input type="hidden" value={newAmount} />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseCreate}
                                    className="btn-secondary flex-1 py-2 text-xs"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleSavePlan}
                                    disabled={!newName.trim() || !newAmount || parseFloat(newAmount) <= 0}
                                    className="btn-primary flex-1 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {editingPlan ? t('common.save') : t('budget.save_plan')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeletePlan}
                title={t('budget.delete_plan')}
                message={t('budget.delete_confirm_desc', { name: deleteTarget?.name || '' })}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
            />

            <NumericKeypad
                isOpen={isKeypadOpen}
                value={newAmount}
                onChange={(val) => {
                    setNewAmount(val);
                    setAmountDisplay(val);
                }}
                onExprChange={(expr) => setAmountDisplay(expr)}
                onClose={() => setIsKeypadOpen(false)}
            />
        </>,
        document.body
    );
};

export default BudgetModal;
