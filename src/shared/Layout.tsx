import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View } from '../entities/types';
import Footer from './Footer';
import { useLocalBackup } from '../application/contexts/LocalBackupContext';
import { useLanguage } from '../application/contexts/LanguageContext';

interface LayoutProps {
    children: React.ReactNode;
    currentView: View;
    onNavigate: (view: View) => void;
    onAddEntry: () => void;
    hideFAB?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, onAddEntry, hideFAB = false }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFabVisible, setIsFabVisible] = useState(true);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

    // Reset scroll position on route/view change
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [currentView]);


    // Backup Context for Nav Action
    const {
        isEnabled: isBackupEnabled,
        backupStatus,
        lastBackupDate,
        performManualBackup
    } = useLocalBackup();

    // Close sidebar on navigation (for mobile/tablet)
    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsSidebarOpen(false);
    };

    const navItems: { view: View; icon: string; labelKey: string }[] = [
        { view: 'dashboard', icon: 'dashboard', labelKey: 'common.dashboard' },
        { view: 'history', icon: 'history', labelKey: 'common.history' },
        { view: 'settings', icon: 'settings', labelKey: 'common.settings' },
    ];

    // Track the last directly-selected main nav item
    // Sub-views (overview, category-picker, etc.) keep whatever nav was last active
    const mainNavViews = new Set(navItems.map(item => item.view));
    const lastMainNavRef = useRef<View>(
        mainNavViews.has(currentView) ? currentView : 'dashboard'
    );

    // Update ref only when currentView is a main nav item
    useEffect(() => {
        if (mainNavViews.has(currentView)) {
            lastMainNavRef.current = currentView;
        }
    }, [currentView]);

    // For legal/support sub-views, always highlight settings; for others, keep last nav
    const activeNavView = (() => {
        if (mainNavViews.has(currentView)) return currentView;
        if (['terms', 'privacy', 'support'].includes(currentView)) return currentView;
        return lastMainNavRef.current;
    })();

    return (
        <>
            <div className="h-screen flex flex-col bg-brand-base-light dark:bg-brand-base-dark overflow-hidden">
                <div className="flex-1 flex w-full max-w-[1440px] mx-auto relative overflow-hidden">
                    {/* Responsive Sidebar (Mobile: hidden | Tablet: compressed | Desktop: full) */}
                    <aside className={`
                    hidden sm:flex flex-col bg-brand-surface-light dark:bg-brand-surface-dark border-r border-[#AF8F42]/30 dark:border-[#AF8F42]/40 transition-all duration-300 p-4 lg:p-5 shrink-0 overflow-y-auto hide-scrollbar
                    sm:w-20 lg:w-64
                `}>
                        <div className="flex items-center justify-center lg:justify-between mb-8 lg:px-2">
                            <div className="flex items-center gap-2">
                                <img src="/costpilot_logo_suite.svg" alt="CostPilot" className="size-10 object-contain" />
                                <h1 className="hidden lg:block text-xl font-bold tracking-tight font-brand-title">
                                    <span className="text-[#8c7851]">Cost</span>
                                    <span className="text-[#8c7851]/70">Pilot</span>
                                </h1>
                            </div>

                            {/* Desktop Sync Button */}
                            {isBackupEnabled && (
                                <button
                                    onClick={performManualBackup}
                                    disabled={backupStatus === 'syncing'}
                                    className={`hidden lg:flex size-9 rounded-xl border flex-shrink-0 items-center justify-center transition-all duration-300 ${backupStatus === 'syncing'
                                            ? 'bg-[#AF8F42]/10 border-[#AF8F42]/30 text-[#AF8F42]'
                                            : backupStatus === 'success'
                                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                                : backupStatus === 'error'
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                                    : 'bg-brand-surface-light dark:bg-brand-surface-dark border-[#AF8F42]/30 text-stone-600 dark:text-stone-400 hover:border-[#AF8F42] hover:text-[#AF8F42] hover:bg-[#AF8F42]/5'
                                        }`}
                                    title={lastBackupDate ? t('navigation.last_backup', { date: new Date(lastBackupDate).toLocaleDateString() }) : t('navigation.never')}
                                >
                                    <span className={`material-symbols-outlined text-[20px] ${backupStatus === 'syncing' ? 'animate-spin' : ''}`}>
                                        {backupStatus === 'success' ? 'check_circle' : backupStatus === 'error' ? 'error' : 'sync'}
                                    </span>
                                </button>
                            )}
                        </div>

                        <nav className="flex-1 space-y-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.view}
                                    onClick={() => handleNavigate(item.view)}
                                    className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2 rounded-xl font-bold transition-all relative group ${currentView === item.view || activeNavView === item.view
                                        ? 'text-[#AF8F42] dark:text-[#D4AF37]'
                                        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                                        }`}
                                >
                                    {(currentView === item.view || activeNavView === item.view) && (
                                        <div className="absolute inset-0 bg-[#AF8F42]/10 dark:bg-[#AF8F42]/5 backdrop-blur-md rounded-xl border border-[#AF8F42]/20 dark:border-[#AF8F42]/10 animate-fade-in"></div>
                                    )}
                                    <span className="material-symbols-outlined text-2xl relative z-10">{item.icon}</span>
                                    <span className="hidden lg:block relative z-10">{t(item.labelKey)}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Sidebar Middle - Trust Section (Desktop Only) */}
                        <div className="hidden lg:block my-4 px-3 py-3 rounded-xl border border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-gradient-to-br from-stone-50 to-white dark:from-stone-800/50 dark:to-stone-900/50 relative overflow-hidden group">
                            <div className="absolute -top-8 -right-8 size-16 bg-[#AF8F42]/10 rounded-full blur-xl group-hover:bg-[#AF8F42]/20 transition-all"></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="size-7 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-1.5 border border-primary-200 dark:border-primary-800">
                                    <span className="material-symbols-outlined text-sm">verified_user</span>
                                </div>
                                <p className="text-[10px] font-bold text-stone-900 dark:text-white uppercase tracking-wider mb-0.5">{t('navigation.local_first')}</p>
                                <p className="text-[8px] text-stone-500 dark:text-stone-400 font-medium leading-tight">
                                    {t('navigation.private_encrypted')}
                                </p>
                            </div>
                        </div>

                        {/* Legal & Support Section (Desktop Only) */}
                        <div className="hidden lg:block pb-6 space-y-3 px-2">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-4">{t('navigation.legal_support')}</p>
                            <div className="space-y-1">
                                <button
                                    onClick={() => handleNavigate('terms')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl font-bold transition-all relative group ${currentView === 'terms'
                                        ? 'text-[#AF8F42] dark:text-[#D4AF37]'
                                        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                                        }`}
                                >
                                    {currentView === 'terms' && (
                                        <div className="absolute inset-x-0 inset-y-1 bg-[#AF8F42]/10 dark:bg-[#AF8F42]/5 backdrop-blur-md rounded-xl border border-[#AF8F42]/20 dark:border-[#AF8F42]/10 animate-fade-in"></div>
                                    )}
                                    <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform relative z-10">article</span>
                                    <span className="text-[12px] relative z-10">{t('navigation.terms_of_service')}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('privacy')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl font-bold transition-all relative group ${currentView === 'privacy'
                                        ? 'text-[#AF8F42] dark:text-[#D4AF37]'
                                        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                                        }`}
                                >
                                    {currentView === 'privacy' && (
                                        <div className="absolute inset-x-0 inset-y-1 bg-[#AF8F42]/10 dark:bg-[#AF8F42]/5 backdrop-blur-md rounded-xl border border-[#AF8F42]/20 dark:border-[#AF8F42]/10 animate-fade-in"></div>
                                    )}
                                    <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform relative z-10">policy</span>
                                    <span className="text-[12px] relative z-10">{t('navigation.privacy_policy')}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('support')}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-[12px] font-bold text-stone-500 hover:text-[#AF8F42] transition-colors group"
                                >
                                    <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">headset_mic</span>
                                    {t('navigation.get_help')}
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col min-w-0 relative h-full">
                        <header 
                            className="flex lg:hidden items-center justify-between py-2 px-4 mx-3 bg-brand-surface-light/70 dark:bg-brand-surface-dark/70 backdrop-blur-xl border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 rounded-2xl fixed left-0 right-0 sm:right-auto z-30 transition-all duration-300 shadow-lg shadow-black/5 dark:shadow-black/20" 
                            style={{ 
                                top: 'calc(0.5rem + env(safe-area-inset-top))',
                                transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-150%)',
                                opacity: isHeaderVisible ? 1 : 0,
                                pointerEvents: isHeaderVisible ? 'auto' : 'none'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {/* Brand show only on mobile (when sidebar is hidden) */}
                                <div className="flex sm:hidden items-center gap-2">
                                    <img src="/costpilot_logo_suite.svg" alt="CostPilot" className="size-8 object-contain" />
                                    <span className="font-bold font-brand-title">
                                        <span className="text-[#8c7851]">Cost</span>
                                        <span className="text-[#8c7851]/70">Pilot</span>
                                    </span>
                                </div>
                            </div>

                            {/* Mobile Nav Actions (Right side) */}
                            <div className="flex items-center gap-2">
                                {/* Sync/Backup Status Icon */}
                                {isBackupEnabled && (
                                    <button
                                        onClick={performManualBackup}
                                        disabled={backupStatus === 'syncing'}
                                        className={`size-9 rounded-xl border flex items-center justify-center transition-all duration-300 ${backupStatus === 'syncing'
                                                ? 'bg-[#AF8F42]/10 border-[#AF8F42]/30 text-[#AF8F42]'
                                                : backupStatus === 'success'
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                                    : backupStatus === 'error'
                                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                                        : 'bg-brand-surface-light dark:bg-brand-surface-dark border-[#AF8F42]/30 text-stone-600 dark:text-stone-400 active:scale-95'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${backupStatus === 'syncing' ? 'animate-spin' : ''}`}>
                                            {backupStatus === 'success' ? 'check_circle' : backupStatus === 'error' ? 'error' : 'sync'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </header>

                        <div 
                            ref={scrollContainerRef}
                            className="flex-1 px-5 py-4 md:px-6 md:py-6 lg:px-14 overflow-y-auto w-full max-w-5xl mx-auto main-content-container"
                            onScroll={(e) => {
                                const currentScrollY = e.currentTarget.scrollTop;
                                if (currentScrollY > lastScrollY.current + 10) {
                                    setIsFabVisible(false); // Scrolling down
                                    setIsHeaderVisible(false); // Hide top bar
                                } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY === 0) {
                                    setIsFabVisible(true);  // Scrolling up or at top
                                    setIsHeaderVisible(true);  // Show top bar
                                }
                                lastScrollY.current = currentScrollY;
                            }}
                        >
                            {children}
                            {currentView === 'settings' && <Footer onNavigate={handleNavigate} />}
                        </div>

                        {/* Floating Action Button (FAB) */}
                        {(['dashboard', 'history'] as View[]).includes(currentView) && !hideFAB && (
                            <button
                                onClick={onAddEntry}
                                className={`fixed right-6 md:right-10 size-14 rounded-full shadow-2xl shadow-[#AF8F42]/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 z-40 group overflow-hidden fab-button ${isFabVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}
                            >
                                <img src="/fab_plus.png" alt="Add Entry" className="size-full object-cover group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        )}

                        {/* Bottom Nav (Mobile Only) */}
                        <nav 
                            className="sm:hidden fixed left-1/2 -translate-x-1/2 w-[280px] bg-brand-surface-light/90 dark:bg-brand-surface-dark/90 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 z-30 flex items-center justify-around px-2 rounded-2xl shadow-lg shadow-black/10 dark:shadow-black/30 transition-all duration-300 h-14" 
                            style={{ 
                                bottom: 'calc(0.5rem + env(safe-area-inset-bottom))' 
                            }}
                        >
                            {navItems.map((item) => (
                                <button
                                    key={item.view}
                                    onClick={() => handleNavigate(item.view)}
                                    className={`flex flex-col items-center gap-1 p-2 min-w-[72px] transition-all relative rounded-lg ${currentView === item.view || activeNavView === item.view
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-stone-400 dark:text-stone-500'
                                        }`}
                                >
                                    {(currentView === item.view || activeNavView === item.view) && (
                                        <div className="absolute inset-x-0 inset-y-2 bg-primary-800/10 dark:bg-white/10 backdrop-blur-md rounded-xl border border-primary-500/10 dark:border-white/20 animate-scale-in"></div>
                                    )}
                                    <span className="material-symbols-outlined text-2xl relative z-10">{item.icon}</span>
                                    <span className="text-[10px] font-bold relative z-10">{t(item.labelKey)}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Overlay Backdrop */}
                        {isSidebarOpen && (
                            <div
                                className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 md:hidden animate-backdrop"
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        )}
                    </main>
                </div>
            </div >
        </>
    );
};

export default Layout;
