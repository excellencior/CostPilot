
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import History from '../features/history/History';
import { View, Transaction, MonthlyData, Category } from '../entities/types';
import Dashboard from '../features/dashboard/Dashboard';
import Overview from '../features/dashboard/Overview';
import Settings from '../features/settings/Settings';
import NewEntryModal from '../features/transactions/NewEntryModal';
import Support from '../features/static/Support';
import TermsOfService from '../features/static/TermsOfService';
import PrivacyPolicy from '../features/static/PrivacyPolicy';
import LandingPage from '../features/static/LandingPage';
import { LocalRepository } from '../infrastructure/local/local-repository';
import { LocalBackupProvider } from '../application/contexts/LocalBackupContext';
import Layout from '../shared/Layout';
import { Toaster, toast } from 'react-hot-toast';
import { getCurrencySymbol } from '../entities/financial';
import { Preferences } from '@capacitor/preferences';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const RequireTerms: React.FC<{ hasAcceptedTerms: boolean | null, children: React.ReactNode }> = ({ hasAcceptedTerms, children }) => {
    const location = useLocation();

    // While checking preferences, don't redirect yet to prevent flash
    if (hasAcceptedTerms === null) return null;

    // Root path logic: decide whether to show LandingPage or Dashboard
    if (location.pathname === '/') {
        return hasAcceptedTerms ? <Navigate to="/dashboard" replace /> : <>{children}</>;
    }

    // Guard other paths
    if (!hasAcceptedTerms) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const AppContent: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentView = (location.pathname.split('/')[1] as View) || 'dashboard';

    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [currency, setCurrency] = useState('BDT');
    const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | null>(null);
    const [historyViewMode, setHistoryViewMode] = useState<'summary' | 'calendar'>('summary');

    const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);

    useEffect(() => {
        const checkTerms = async () => {
            const { value } = await Preferences.get({ key: 'hasAcceptedTerms' });
            setHasAcceptedTerms(value === 'true');
        };
        checkTerms();
    }, []);

    const hideFAB = currentView === 'history' && historyViewMode === 'calendar';

    // Apply theme on mount and when changed
    const applyTheme = useCallback(() => {
        const theme = LocalRepository.getSettings().theme;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (Capacitor.isNativePlatform()) {
                StatusBar.setStyle({ style: Style.Dark });
                StatusBar.setBackgroundColor({ color: '#0c0a09' });
            }
        } else {
            document.documentElement.classList.remove('dark');
            if (Capacitor.isNativePlatform()) {
                StatusBar.setStyle({ style: Style.Light });
                StatusBar.setBackgroundColor({ color: '#fcfaf6' }); // Match light background
            }
        }
    }, []);

    useEffect(() => {
        applyTheme();
    }, [applyTheme]);

    // Simplified loadData: just fetch what's in repo
    const loadData = useCallback(() => {
        const freshTransactions = LocalRepository.getAllExpenses();
        setTransactions(freshTransactions);
        setCurrency('BDT');
    }, []);

    // Listen for cross-tab or cross-file local storage changes
    useEffect(() => {
        const handleStorageChange = () => {
            applyTheme();
            loadData();
        };

        // Custom event for same-window updates
        window.addEventListener('costpilot-settings-updated', handleStorageChange);
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('costpilot-settings-updated', handleStorageChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [applyTheme]);

    // Persist currency (always BDT)
    useEffect(() => {
        LocalRepository.updateSettings({ currency: 'BDT' });
    }, []);

    // Persist current view whenever it changes
    useEffect(() => {
        LocalRepository.updateSettings({ lastView: currentView });
    }, [currentView]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Double back button to exit logic
    useEffect(() => {
        let backButtonListener: any;

        const setupBackButton = async () => {
            if (!Capacitor.isNativePlatform()) return;

            backButtonListener = await CapApp.addListener('backButton', (data) => {
                const whiteList = ['/dashboard', '/'];
                if (whiteList.includes(location.pathname)) {
                    // Logic for double-tap to exit
                    const now = Date.now();
                    const lastPress = (window as any).lastBackPress || 0;
                    
                    if (now - lastPress < 2000) {
                        CapApp.exitApp();
                    } else {
                        (window as any).lastBackPress = now;
                        toast('Press back again to exit', {
                            duration: 2000,
                            position: 'bottom-center',
                            style: {
                                borderRadius: '12px',
                                background: '#1c1917',
                                color: '#fff',
                                fontWeight: 'bold',
                                border: '1px solid #AF8F42'
                            }
                        });
                    }
                } else {
                    // Go back if not on dashboard/root
                    navigate(-1);
                }
            });
        };

        setupBackButton();

        return () => {
            if (backButtonListener) {
                backButtonListener.remove();
            }
        };
    }, [location.pathname, navigate]);

    const handleSaveTransaction = async (transaction: Omit<Transaction, 'id'> | Transaction) => {
        const isEditing = 'id' in transaction;
        const transactionData: any = {
            ...transaction,
            id: isEditing ? (transaction as Transaction).id : generateId(),
            user_id: null,
        };
        LocalRepository.upsertExpense(transactionData);
        setEditingTransaction(null);
        loadData();

        toast.success(isEditing ? 'Transaction updated' : 'New entry added', {
            style: {
                borderRadius: '12px',
                background: '#1c1917',
                color: '#fff',
                fontWeight: 'bold',
                border: '1px solid #AF8F42'
            }
        });
    };

    const handleDeleteTransaction = async (id: string) => {
        LocalRepository.deleteExpense(id);
        setEditingTransaction(null);
        loadData();
        toast.success('Transaction removed', {
            style: {
                borderRadius: '12px',
                background: '#1c1917',
                color: '#fff',
                fontWeight: 'bold',
                border: '1px solid #AF8F42'
            }
        });
    };

    const handleDeleteTransactions = (ids: string[]) => {
        ids.forEach(id => LocalRepository.deleteExpense(id));
        loadData();
        toast.success(`${ids.length} transaction${ids.length > 1 ? 's' : ''} removed`, {
            style: {
                borderRadius: '12px',
                background: '#1c1917',
                color: '#fff',
                fontWeight: 'bold',
                border: '1px solid #AF8F42'
            }
        });
    };


    // Categories management removed

    const monthlyHistory = useMemo(() => {
        const history: MonthlyData[] = [];
        const transactionsByMonth: { [key: string]: Transaction[] } = {};

        transactions.forEach(t => {
            const monthKey = `${t.date.substring(0, 7)}`;
            if (!transactionsByMonth[monthKey]) {
                transactionsByMonth[monthKey] = [];
            }
            transactionsByMonth[monthKey].push(t);
        });

        Object.keys(transactionsByMonth).sort().reverse().forEach(monthKey => {
            const monthTransactions = transactionsByMonth[monthKey];
            const totalIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const dateDate = new Date(`${monthKey}-01`);

            history.push({
                month: dateDate.toLocaleString('default', { month: 'long' }),
                year: dateDate.getFullYear(),
                income: totalIncome,
                expense: totalExpenses,
            });
        });

        // Always ensure current month is present and at the top if no future entries exist
        const now = new Date();
        const currentMonthName = now.toLocaleString('default', { month: 'long' });
        const currentYear = now.getFullYear();

        const currentMonthIdx = history.findIndex(h => h.month === currentMonthName && h.year === currentYear);

        if (currentMonthIdx === -1) {
            const currentMonthObj = {
                month: currentMonthName,
                year: currentYear,
                income: 0,
                expense: 0
            };

            const insertIdx = history.findIndex(h => h.year < currentYear || (h.year === currentYear && new Date(`${h.month} 1, ${h.year}`).getMonth() < now.getMonth()));
            if (insertIdx === -1) history.push(currentMonthObj);
            else history.splice(insertIdx, 0, currentMonthObj);
        }

        return history;
    }, [transactions]);

    const getMonthTransactions = (monthData: MonthlyData) => {
        return transactions.filter(t => {
            const d = new Date(t.date);
            return d.toLocaleString('default', { month: 'long' }) === monthData.month && d.getFullYear() === monthData.year;
        });
    };

    const handleViewChange = (newView: View) => {
        navigate(`/${newView}`);
    };

    return (
        <Routes>
            {/* Public layout-less routes */}
            <Route path="/" element={
                <RequireTerms hasAcceptedTerms={hasAcceptedTerms}>
                    <LandingPage onAccepted={() => setHasAcceptedTerms(true)} />
                </RequireTerms>
            } />
            <Route path="/privacy" element={<PrivacyPolicy onBack={() => navigate(-1)} />} />
            <Route path="/terms" element={<TermsOfService onBack={() => navigate(-1)} />} />

            {/* App Layout Route block */}
            <Route path="/*" element={
                <RequireTerms hasAcceptedTerms={hasAcceptedTerms}>
                    <Layout
                        currentView={currentView}
                        onNavigate={handleViewChange}
                        onAddEntry={() => {
                            setEditingTransaction(null);
                            setIsEntryModalOpen(true);
                        }}
                        hideFAB={hideFAB}
                    >
                        <div key={currentView} className="animate-slide-up w-full">
                            <Routes>
                                <Route
                                    path="/dashboard"
                                    element={
                                        <Dashboard
                                            monthlyData={monthlyHistory}
                                            transactions={transactions}
                                            onAddEntry={() => {
                                                setEditingTransaction(null);
                                                setIsEntryModalOpen(true);
                                            }}
                                            onViewAll={() => { setTypeFilter(null); navigate('/overview'); }}
                                            onTransactionClick={(t) => {
                                                setEditingTransaction(t);
                                                setIsEntryModalOpen(true);
                                            }}
                                            onTypeFilter={(type) => { setTypeFilter(type); navigate('/overview'); }}
                                            currencySymbol={getCurrencySymbol(currency)}
                                        />
                                    }
                                />

                                <Route
                                    path="/overview"
                                    element={
                                        <Overview
                                            month={selectedMonth || monthlyHistory[0]}
                                            transactions={getMonthTransactions(selectedMonth || monthlyHistory[0])}
                                            onBack={() => { setTypeFilter(null); navigate('/dashboard'); }}
                                            onTransactionClick={(t) => {
                                                setEditingTransaction(t);
                                                setIsEntryModalOpen(true);
                                            }}
                                            onDeleteTransactions={handleDeleteTransactions}
                                            currency={currency}
                                            typeFilter={typeFilter}
                                            onClearFilter={() => setTypeFilter(null)}
                                        />
                                    }
                                />

                                <Route
                                    path="/history"
                                    element={
                                        <History
                                            transactions={transactions}
                                            onTransactionClick={(t) => {
                                                setEditingTransaction(t);
                                                setIsEntryModalOpen(true);
                                            }}
                                            onDeleteTransactions={handleDeleteTransactions}
                                            currencySymbol={getCurrencySymbol(currency)}
                                            viewMode={historyViewMode}
                                            onViewModeChange={setHistoryViewMode}
                                        />
                                    }
                                />

                                <Route
                                    path="/settings"
                                    element={
                                        <Settings
                                            onNavigate={(v) => navigate(`/${v}`)}
                                            transactions={transactions}
                                            currency={currency}
                                        />
                                    }
                                />

                                <Route path="/support" element={<Support onBack={() => navigate('/settings')} />} />

                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </div>

                        <NewEntryModal
                            isOpen={isEntryModalOpen}
                            onClose={() => {
                                setIsEntryModalOpen(false);
                                setEditingTransaction(null);
                            }}
                            onSave={handleSaveTransaction}
                            onDelete={handleDeleteTransaction}
                            editingTransaction={editingTransaction}
                        />

                        <Toaster position="top-center" />
                    </Layout>
                </RequireTerms>
            } />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <LocalBackupProvider>
            <AppContent />
        </LocalBackupProvider>
    );
};

export default App;
