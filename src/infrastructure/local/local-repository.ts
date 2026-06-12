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

const getMonthKeys = (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('costpilot_local_db_') && !key.endsWith('_migrated')) {
            keys.push(key);
        }
    }
    return keys;
};

const getMonthKeyForDate = (dateString: string): string => {
    if (!dateString) {
        const now = new Date();
        return `costpilot_local_db_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const monthKey = dateString.substring(0, 7);
    return `costpilot_local_db_${monthKey}`;
};

export const LocalRepository = {
    // --- EXPENSES ---
    // Get all active expenses
    getAllExpenses: (): LocalExpense[] => {
        const allExpenses: LocalExpense[] = [];
        const monthKeys = getMonthKeys();
        monthKeys.forEach(key => {
            const data = getRawData(key);
            Object.values(data).forEach((item: any) => {
                if (!item.deleted) {
                    allExpenses.push(item);
                }
            });
        });
        return allExpenses.sort((a: any, b: any) => {
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
        const combined: Record<string, LocalExpense> = {};
        const monthKeys = getMonthKeys();
        monthKeys.forEach(key => {
            const data = getRawData(key);
            Object.assign(combined, data);
        });
        return combined;
    },

    // Get expenses pending sync
    getPendingSyncExpenses: (): LocalExpense[] => {
        const pending: LocalExpense[] = [];
        const monthKeys = getMonthKeys();
        monthKeys.forEach(key => {
            const data = getRawData(key);
            Object.values(data).forEach((item: any) => {
                if (!item.is_synced) {
                    pending.push(item);
                }
            });
        });
        return pending;
    },

    // Upsert Expense
    upsertExpense: (expense: Omit<LocalExpense, 'updated_at' | 'created_at' | 'is_synced' | 'deleted'> & Partial<LocalExpense>) => {
        const now = new Date().toISOString();
        const targetKey = getMonthKeyForDate(expense.date);
        
        // Detect if this expense existed in a different month previously, and clean it up
        const allMonthKeys = getMonthKeys();
        let existing: LocalExpense | undefined;
        for (const key of allMonthKeys) {
            const keyData = getRawData(key);
            if (keyData[expense.id]) {
                existing = keyData[expense.id];
                if (key !== targetKey) {
                    delete keyData[expense.id];
                    saveRawData(key, keyData);
                }
                break;
            }
        }

        const targetData = getRawData(targetKey);
        const record: LocalExpense = {
            ...expense,
            user_id: expense.user_id ?? (existing?.user_id || null),
            created_at: existing?.created_at || now,
            updated_at: now,
            deleted: expense.deleted ?? false,
            is_synced: expense.is_synced ?? false,
        } as LocalExpense;

        targetData[expense.id] = record;
        saveRawData(targetKey, targetData);
        return record;
    },

    // Soft delete expense
    deleteExpense: (id: string) => {
        const allMonthKeys = getMonthKeys();
        for (const key of allMonthKeys) {
            const keyData = getRawData(key);
            if (keyData[id]) {
                keyData[id].deleted = true;
                keyData[id].updated_at = new Date().toISOString();
                keyData[id].is_synced = false;
                saveRawData(key, keyData);
                break;
            }
        }
    },

    // Hard delete expense (actually remove from storage)
    hardDeleteExpense: (id: string) => {
        const allMonthKeys = getMonthKeys();
        for (const key of allMonthKeys) {
            const keyData = getRawData(key);
            if (keyData[id]) {
                delete keyData[id];
                saveRawData(key, keyData);
                break;
            }
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
        if (type === 'category') {
            const data = getRawData(CATEGORY_KEY);
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
            saveRawData(CATEGORY_KEY, data);
        } else {
            const now = new Date().toISOString();
            const groups: Record<string, any[]> = {};
            items.forEach(item => {
                const key = getMonthKeyForDate(item.date);
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            const allMonthKeys = getMonthKeys();

            Object.entries(groups).forEach(([key, groupItems]) => {
                const data = getRawData(key);
                groupItems.forEach(item => {
                    allMonthKeys.forEach(k => {
                        if (k !== key) {
                            const kData = getRawData(k);
                            if (kData[item.id]) {
                                delete kData[item.id];
                                saveRawData(k, kData);
                            }
                        }
                    });

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
            });
        }
    },

    // Replace all local data with remote data
    replaceAll: (items: any[], type: 'expense' | 'category') => {
        if (type === 'category') {
            const newData: Record<string, any> = {};
            items.forEach(item => {
                newData[item.id] = {
                    ...item,
                    is_synced: true
                };
            });
            saveRawData(CATEGORY_KEY, newData);
        } else {
            const allMonthKeys = getMonthKeys();
            allMonthKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            const groups: Record<string, Record<string, any>> = {};
            items.forEach(item => {
                const key = getMonthKeyForDate(item.date);
                if (!groups[key]) groups[key] = {};
                groups[key][item.id] = {
                    ...item,
                    is_synced: true
                };
            });

            Object.entries(groups).forEach(([key, map]) => {
                saveRawData(key, map);
            });
        }
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
        const monthKeys = getMonthKeys();
        monthKeys.forEach(key => {
            const expData = getRawData(key);
            Object.values(expData).forEach((item: any) => {
                if (!item.user_id) {
                    item.user_id = userId;
                    item.updated_at = new Date().toISOString();
                    item.is_synced = false;
                }
            });
            saveRawData(key, expData);
        });

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
        const defaults = { currency: 'BDT', theme: 'light', lastView: 'dashboard', language: 'bn' };
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
    },

    getAvailableMonths: (): { monthKey: string; year: number; month: number }[] => {
        const keys = getMonthKeys();
        const months = keys.map(key => {
            const parts = key.split('_');
            const yyyymm = parts[parts.length - 1]; // e.g. "2026-03"
            const [year, month] = yyyymm.split('-').map(Number);
            return { monthKey: yyyymm, year, month };
        });
        
        // Always ensure current month is in the list
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!months.some(m => m.monthKey === currentMonthKey)) {
            months.push({ monthKey: currentMonthKey, year: now.getFullYear(), month: now.getMonth() + 1 });
        }
        
        // Sort descending
        return months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    },

    getMonthSummary: (monthKey: string) => {
        const key = `costpilot_local_db_${monthKey}`;
        const data = getRawData(key);
        let income = 0;
        let expense = 0;
        let count = 0;
        Object.values(data).forEach((item: any) => {
            if (!item.deleted) {
                count++;
                if (item.type === 'income') income += item.amount;
                else expense += item.amount;
            }
        });
        return { income, expense, savings: income - expense, count };
    },

    getExpensesForMonth: (monthKey: string): LocalExpense[] => {
        const key = `costpilot_local_db_${monthKey}`;
        const data = getRawData(key);
        return Object.values(data)
            .filter((item: any) => item && typeof item === 'object' && !item.deleted)
            .sort((a: any, b: any) => {
                const aDate = a.date || '';
                const bDate = b.date || '';
                const dateSort = new Date(bDate).getTime() - new Date(aDate).getTime();
                if (!isNaN(dateSort) && dateSort !== 0) return dateSort;
                const aTime = a.created_at || '';
                const bTime = b.created_at || '';
                if (bTime && aTime) return bTime.localeCompare(aTime);
                return (b.id || '').localeCompare(a.id || '');
            });
    },

    purgeMonthPartition: (monthKey: string) => {
        const key = `costpilot_local_db_${monthKey}`;
        localStorage.removeItem(key);
        window.dispatchEvent(new Event('costpilot-settings-updated'));
    }
};

// Migration check for existing users
(function migrateToMonthBasedStorage() {
    try {
        const oldDataStr = localStorage.getItem('costpilot_local_db');
        if (oldDataStr) {
            const oldData = JSON.parse(oldDataStr);
            const groups: Record<string, Record<string, any>> = {};
            
            Object.values(oldData).forEach((item: any) => {
                if (item && item.id) {
                    const dateStr = item.date || '';
                    const monthKey = dateStr.substring(0, 7) || new Date().toISOString().substring(0, 7);
                    const storageKey = `costpilot_local_db_${monthKey}`;
                    if (!groups[storageKey]) {
                        groups[storageKey] = {};
                    }
                    groups[storageKey][item.id] = item;
                }
            });

            Object.entries(groups).forEach(([key, data]) => {
                const existing = getRawData(key);
                const merged = { ...existing, ...data };
                saveRawData(key, merged);
            });

            localStorage.setItem('costpilot_local_db_migrated', oldDataStr);
            localStorage.removeItem('costpilot_local_db');
            console.log('Successfully migrated CostPilot database to month-based storage.');
        }
    } catch (e) {
        console.error('Error migrating to month-based database storage:', e);
    }
})();
