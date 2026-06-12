import React from 'react';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface SupportProps {
    onBack: () => void;
}

const Support: React.FC<SupportProps> = ({ onBack }) => {
    const { t } = useLanguage();
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
                <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">{t('support.title')}</h1>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {/* Developer Profile Card */}
                <div className="card p-8 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 size-40 bg-gradient-to-br from-[#AF8F42] to-[#D4AF37] opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-700"></div>

                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="size-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20">
                            <span className="material-symbols-outlined text-5xl">person</span>
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-1">Apurbo</h2>
                            <p className="text-primary-600 dark:text-primary-400 font-bold tracking-widest uppercase text-xs mb-4">@abturjo</p>
                            <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed mb-6 italic">
                                {t('support.quote')}
                            </p>

                            <a
                                href="mailto:turjob44@gmail.com"
                                className="inline-flex items-center gap-3 bg-brand-surface-light dark:bg-brand-surface-dark border border-[#AF8F42]/40 dark:border-[#AF8F42]/50 hover:border-[#AF8F42] dark:hover:border-[#AF8F42] px-6 py-3 rounded-xl font-bold text-stone-900 dark:text-white transition-all hover:shadow-xl hover:shadow-[#AF8F42]/10 active:scale-95 group"
                            >
                                <span className="material-symbols-outlined text-xl text-[#AF8F42] group-hover:rotate-12 transition-transform">mail</span>
                                <span>turjob44@gmail.com</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-6 border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
                        <div className="flex items-center gap-3 mb-3 text-amber-600 dark:text-amber-400">
                            <span className="material-symbols-outlined">security</span>
                            <h3 className="font-bold">{t('support.privacy_title')}</h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                            {t('support.privacy_desc')}
                        </p>
                    </div>

                    <div className="card p-6 border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
                        <div className="flex items-center gap-3 mb-3 text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined">update</span>
                            <h3 className="font-bold">{t('support.update_title')}</h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                            {t('support.update_desc')}
                        </p>
                    </div>
                </div>

                {/* Support Message */}
                <div className="text-center py-6">
                    <p className="text-stone-400 dark:text-stone-500 text-[11px] font-bold uppercase tracking-[0.2em]">
                        {t('footer.dedicated')}
                    </p>
                    <div className="w-12 h-px bg-[#AF8F42]/30 mx-auto mt-4"></div>
                </div>
            </div>
        </div>
    );
};

export default Support;
