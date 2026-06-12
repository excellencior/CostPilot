import { Transaction, Category } from '../../entities/types';

const STORAGE_KEY = 'costpilot_local_db';
const CATEGORY_KEY = 'costpilot_local_categories';
const SYNC_META_KEY = 'costpilot_sync_meta';
const SETTINGS_KEY = 'costpilot_settings';
const BUDGET_PLANS_KEY = 'costpilot_budget_plans';
const MONTHLY_BUDGETS_KEY = 'costpilot_monthly_budgets';

export interface LocalExpense extends Transaction {
    user_id: string | null;
    created_at: string;
    updated_at: string;
    deleted: boolean;
    is_synced: boolean;
}

export interface LocalCategory extends Category {
    user_id: string | null;
    created_at: string;
    updated_at: string;
    deleted: boolean;
    is_synced: boolean;
}

// Helper to get raw data
const getRawData = (key: string): Record<string, any> => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

// Helper to save raw data
const saveRawData = (key: string, data: Record<string, any>) => {
    localStorage.setItem(key, JSON.stringify(data));
};

export const LocalRepository = {
    // --- EXPENSES ---
    // Get all active expenses
    getAllExpenses: (): LocalExpense[] => {
        const data = getRawData(STORAGE_KEY);
        return Object.values(data)
            .filter((item: any) => !item.deleted)
            .sort((a: any, b: any) => {
                const dateSort = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateSort !== 0) return dateSort;
                const aTime = a.created_at || '';
                const bTime = b.created_at || '';
                if (bTime && aTime) return bTime.localeCompare(aTime);
                return (b.id || '').localeCompare(a.id || '');
            });
    },

    // Get all expenses (including deleted) as a raw map
    getRawExpenses: (): Record<string, LocalExpense> => {
        return getRawData(STORAGE_KEY) as Record<string, LocalExpense>;
    },

    // Get expenses pending sync
    getPendingSyncExpenses: (): LocalExpense[] => {
        const data = getRawData(STORAGE_KEY);
        return Object.values(data).filter((item: any) => !item.is_synced);
    },

    // Upsert Expense
    upsertExpense: (expense: Omit<LocalExpense, 'updated_at' | 'created_at' | 'is_synced' | 'deleted'> & Partial<LocalExpense>) => {
        const data = getRawData(STORAGE_KEY);
        const now = new Date().toISOString();
        const existing = data[expense.id];

        const record: LocalExpense = {
            ...expense,
            user_id: expense.user_id ?? (existing?.user_id || null),
            created_at: existing?.created_at || now,
            updated_at: now,
            deleted: expense.deleted ?? false,
            is_synced: expense.is_synced ?? false,
        } as LocalExpense;

        data[expense.id] = record;
        saveRawData(STORAGE_KEY, data);
        return record;
    },

    // Soft delete expense
    deleteExpense: (id: string) => {
        const data = getRawData(STORAGE_KEY);
        if (data[id]) {
            data[id].deleted = true;
            data[id].updated_at = new Date().toISOString();
            data[id].is_synced = false;
            saveRawData(STORAGE_KEY, data);
        }
    },

    // Hard delete expense (actually remove from storage)
    hardDeleteExpense: (id: string) => {
        const data = getRawData(STORAGE_KEY);
        if (data[id]) {
            delete data[id];
            saveRawData(STORAGE_KEY, data);
        }
    },

    // --- CATEGORIES ---
    getAllCategories: (): LocalCategory[] => {
        const data = getRawData(CATEGORY_KEY);
        return Object.values(data).filter((item: any) => !item.deleted);
    },

    getPendingSyncCategories: (): LocalCategory[] => {
        const data = getRawData(CATEGORY_KEY);
        return Object.values(data).filter((item: any) => !item.is_synced);
    },

    upsertCategory: (category: Omit<LocalCategory, 'updated_at' | 'created_at' | 'is_synced' | 'deleted'> & Partial<LocalCategory>) => {
        const data = getRawData(CATEGORY_KEY);
        const now = new Date().toISOString();
        if (!category.id) {
            console.error('LocalRepository: Cannot upsert category without ID');
            return null;
        }
        const existing = data[category.id];

        const record: LocalCategory = {
            ...category,
            user_id: category.user_id ?? (existing?.user_id || null),
            created_at: existing?.created_at || now,
            updated_at: now,
            deleted: category.deleted ?? false,
            is_synced: false,
        } as LocalCategory;

        data[category.id] = record;
        saveRawData(CATEGORY_KEY, data);
        return record;
    },

    // Bulk upsert (generic)
    bulkUpsert: (items: any[], type: 'expense' | 'category', fromRemote: boolean = false) => {
        const key = type === 'expense' ? STORAGE_KEY : CATEGORY_KEY;
        const data = getRawData(key);
        const now = new Date().toISOString();
        
        items.forEach(item => {
            const existing = data[item.id];
            data[item.id] = {
                ...item,
                user_id: item.user_id ?? (existing?.user_id || null),
                created_at: existing?.created_at || now,
                updated_at: now,
                deleted: item.deleted ?? false,
                is_synced: fromRemote ? true : false
            };
        });
        saveRawData(key, data);
    },

    // Replace all local data with remote data (for full sync / pull updates)
    // This removes local items not present in the remote set, propagating deletions.
    replaceAll: (items: any[], type: 'expense' | 'category') => {
        const key = type === 'expense' ? STORAGE_KEY : CATEGORY_KEY;
        const newData: Record<string, any> = {};
        items.forEach(item => {
            newData[item.id] = {
                ...item,
                is_synced: true
            };
        });
        saveRawData(key, newData);
    },

    // --- META ---
    getLastSync: (): string | null => {
        const meta = localStorage.getItem(SYNC_META_KEY);
        return meta ? JSON.parse(meta).last_sync : null;
    },

    setLastSync: (isoDate: string) => {
        localStorage.setItem(SYNC_META_KEY, JSON.stringify({ last_sync: isoDate }));
    },

    // Assign User ID (Migration)
    assignUserId: (userId: string) => {
        // Expenses
        const expData = getRawData(STORAGE_KEY);
        Object.values(expData).forEach((item: any) => {
            if (!item.user_id) {
                item.user_id = userId;
                item.updated_at = new Date().toISOString();
                item.is_synced = false;
            }
        });
        saveRawData(STORAGE_KEY, expData);

        // Categories
        const catData = getRawData(CATEGORY_KEY);
        Object.values(catData).forEach((item: any) => {
            if (!item.user_id) {
                item.user_id = userId;
                item.updated_at = new Date().toISOString();
                item.is_synced = false;
            }
        });
        saveRawData(CATEGORY_KEY, catData);
    },

    // --- SETTINGS ---
    getSettings: () => {
        const data = localStorage.getItem(SETTINGS_KEY);
        const defaults = { currency: 'BDT', theme: 'light', lastView: 'dashboard' };
        try {
            return data ? { ...defaults, ...JSON.parse(data) } : defaults;
        } catch {
            return defaults;
        }
    },

    updateSettings: (updates: Record<string, any>) => {
        const current = LocalRepository.getSettings();
        const next = { ...current, ...updates };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    },

    // --- BUDGETS ---
    getBudgetPlans: (): { id: string; name: string; amount: number }[] => {
        const data = getRawData(BUDGET_PLANS_KEY);
        return Object.values(data);
    },

    upsertBudgetPlan: (plan: { id: string; name: string; amount: number }) => {
        const data = getRawData(BUDGET_PLANS_KEY);
        data[plan.id] = plan;
        saveRawData(BUDGET_PLANS_KEY, data);
        return plan;
    },

    getMonthlyBudget: (year: number, month: string): number | null => {
        // month comes from `toLocaleString('default', { month: 'long' })` e.g. "January" or we can just use "YYYY-Month"
        const key = `${year}-${month}`;
        const data = getRawData(MONTHLY_BUDGETS_KEY);
        return data[key] || null;
    },

    setMonthlyBudget: (year: number, month: string, amount: number | null) => {
        const key = `${year}-${month}`;
        const data = getRawData(MONTHLY_BUDGETS_KEY);
        if (amount === null) {
            delete data[key];
        } else {
            data[key] = amount;
        }
        saveRawData(MONTHLY_BUDGETS_KEY, data);
    },

    deleteBudgetPlan: (id: string) => {
        const data = getRawData(BUDGET_PLANS_KEY);
        delete data[id];
        saveRawData(BUDGET_PLANS_KEY, data);
    }
};
