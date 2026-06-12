import React from 'react';

interface TermsOfServiceProps {
    onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
    return (
        <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <button
                    onClick={onBack}
                    className="size-10 rounded-lg bg-brand-surface-light dark:bg-brand-surface-dark border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all active:scale-95 shadow-sm"
                >
                    <span className="material-symbols-outlined">home</span>
                </button>
                <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">Terms of Service</h1>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {/* Main Card with Gradient Glow */}
                <div className="card p-8 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 size-40 bg-gradient-to-br from-[#AF8F42] to-[#D4AF37] opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-700"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 shrink-0">
                            <span className="material-symbols-outlined text-3xl">gavel</span>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
                            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                                By accessing or using CostPilot, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the application. CostPilot is provided on an "as-is" and "as-available" basis.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-6 border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-brand-surface-light dark:bg-brand-surface-dark flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3 text-primary-600 dark:text-primary-400">
                                <span className="material-symbols-outlined">database</span>
                                <h3 className="font-bold">2. Use of Service</h3>
                            </div>
                            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                                CostPilot is a personal finance tracking tool. It operates exclusively as a local-first application, meaning your data is stored directly on your device.
                            </p>
                        </div>
                        <div className="bg-primary-500/5 dark:bg-primary-950/20 border-l-2 border-primary-500 p-2.5 rounded-r-lg">
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                                <strong>Backup:</strong> Grants read/write permissions for a directory of choice. You remain responsible for backup file safety.
                            </p>
                        </div>
                    </div>

                    <div className="card p-6 border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-brand-surface-light dark:bg-brand-surface-dark">
                        <div className="flex items-center gap-3 mb-3 text-primary-600 dark:text-primary-400">
                            <span className="material-symbols-outlined">shield_person</span>
                            <h3 className="font-bold">3. User Responsibility</h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                            You are responsible for maintaining the security of your device. Since CostPilot does not utilize cloud synchronization or accounts, lost devices or deleted app data cannot be recovered by us. CostPilot does not provide financial or tax advice.
                        </p>
                    </div>
                </div>

                {/* Modifications Card */}
                <div className="card p-6 border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-brand-surface-light dark:bg-brand-surface-dark">
                    <div className="flex items-center gap-3 mb-3 text-primary-600 dark:text-primary-400">
                        <span className="material-symbols-outlined">edit_note</span>
                        <h3 className="font-bold">4. Modifications to Terms</h3>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                        We reserve the right to modify these terms at any time. Significant changes will be announced within the application. Continued use of the service after such changes constitutes acceptance of the new terms.
                    </p>
                </div>

                {/* Signature/Footer */}
                <div className="text-center py-6">
                    <p className="text-stone-400 dark:text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                        Last Updated: March 8, 2026
                    </p>
                    <div className="w-12 h-px bg-[#AF8F42]/30 mx-auto mt-4"></div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;

