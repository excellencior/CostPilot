import React, { useState, useEffect } from 'react';
import { Category, Transaction } from '../../entities/types';
import DatePicker from '../../shared/ui/DatePicker';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import NumericKeypad from '../../shared/ui/NumericKeypad';
import { useLanguage } from '../../application/contexts/LanguageContext';

const DEFAULT_EXPENSE_CATEGORY: Category = {
  id: 'default-expense',
  name: 'Expense',
  icon: 'trending_down',
  color: 'bg-rose-100 text-rose-500',
  type: 'expense'
};

const DEFAULT_INCOME_CATEGORY: Category = {
  id: 'default-income',
  name: 'Income',
  icon: 'trending_up',
  color: 'bg-green-100 text-green-500',
  type: 'income'
};

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
  onDelete?: (id: string) => void;
  editingTransaction?: Transaction | null;
}

const NewEntryModal: React.FC<NewEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTransaction
}) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(DEFAULT_EXPENSE_CATEGORY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [liveExpr, setLiveExpr] = useState('');
  const descRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setTitle(editingTransaction.title);
      setCategory(editingTransaction.category || (editingTransaction.type === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY));
      setDate(editingTransaction.date);
    } else {
      setType('expense');
      setAmount('');
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(DEFAULT_EXPENSE_CATEGORY);
    }
  }, [editingTransaction, isOpen]);

  useEffect(() => {
    if (!editingTransaction) {
      setCategory(type === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY);
    }
  }, [type, editingTransaction]);

  // Recalculate textarea height when title or open state changes
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    el.style.overflowY = el.scrollHeight > 96 ? 'auto' : 'hidden';
  }, [title, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Support expressions that may still be in the field (e.g. keypad left open without applying)
    let parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) && /[+\-*/]/.test(amount)) {
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${amount})`)();
        if (typeof result === 'number' && isFinite(result)) parsedAmount = Math.round(result * 100) / 100;
      } catch { /* noop */ }
    }
    if (!parsedAmount || parsedAmount <= 0) return;

    const transactionData = {
      title: title || (type === 'expense' ? 'New Expense' : 'New Income'),
      amount: parsedAmount,
      type,
      category,
      date,
    };

    if (editingTransaction) {
      onSave({ ...transactionData, id: editingTransaction.id });
    } else {
      onSave(transactionData);
    }

    onClose();
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (editingTransaction && onDelete) {
      onDelete(editingTransaction.id);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-stone-900/60 transition-opacity animate-backdrop"
          onClick={onClose}
        />

        <div className="relative w-full max-w-sm bg-brand-surface-light dark:bg-brand-surface-dark rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              {editingTransaction ? t('overview.edit_entry') : t('entry.new_entry')}
            </h2>
            <div className="flex items-center gap-2">
              {editingTransaction && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="size-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  title={t('overview.delete_title')}
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="size-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
              {(['expense', 'income'] as const).map((typeVal) => (
                <button
                  key={typeVal}
                  type="button"
                  onClick={() => setType(typeVal)}
                  disabled={!!editingTransaction}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${type === typeVal
                    ? 'bg-brand-surface-light dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-500 opacity-50'
                    }`}
                >
                  {typeVal === 'income' ? t('common.income') : t('common.expense')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">{t('entry.amount')}</label>
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={() => { setLiveExpr(amount); setIsKeypadOpen(true); }}
                  className={`input-field font-sans font-bold tracking-tight text-xl cursor-pointer select-none min-h-[40px] flex items-center overflow-hidden text-right justify-end ${!isKeypadOpen && !amount ? 'text-stone-400 font-normal font-sans font-bold' : ''}`}
                >
                  {isKeypadOpen
                    ? (
                      <span className="whitespace-nowrap flex items-center">
                        {liveExpr}
                        <span className="inline-block w-[2px] h-5 bg-[#AF8F42] ml-0.5 animate-cursor-blink"></span>
                      </span>
                    )
                    : (amount || <span className="text-stone-400 font-normal font-sans font-bold">0.00</span>)
                  }
                </div>
                <input type="hidden" value={amount} />
              </div>

              <div>
                <DatePicker
                  label={t('entry.date')}
                  value={date}
                  onChange={setDate}
                />
              </div>
            </div>

            <div>
              <label className="label-text">{t('entry.desc_label')}</label>
              <textarea
                ref={descRef}
                rows={1}
                className="input-field resize-none w-full leading-6"
                style={{ maxHeight: '6rem', overflowY: 'hidden', scrollbarWidth: 'none' }}
                placeholder={t('entry.description_placeholder')}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                  el.style.overflowY = el.scrollHeight > 96 ? 'auto' : 'hidden';
                }}
              />
            </div>


            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-2 text-xs"
              >
                {editingTransaction ? t('common.update') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('overview.delete_title')}
        message={t('overview.delete_confirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />

      <NumericKeypad
        isOpen={isKeypadOpen}
        value={amount}
        onChange={setAmount}
        onExprChange={setLiveExpr}
        onClose={() => { setIsKeypadOpen(false); setLiveExpr(''); }}
      />
    </>
  );
};

export default NewEntryModal;

