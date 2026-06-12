import React from 'react';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
                <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">{t('privacy.title')}</h1>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {/* Main Card with Gradient Glow */}
                <div className="card p-8 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 size-40 bg-gradient-to-br from-[#AF8F42] to-[#D4AF37] opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-700"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 shrink-0">
                            <span className="material-symbols-outlined text-3xl">visibility_off</span>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">{t('privacy.mission_title')}</h2>
                            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                                {t('privacy.mission_desc')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-6 border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-brand-surface-light dark:bg-brand-surface-dark">
                        <div className="flex items-center gap-3 mb-3 text-primary-600 dark:text-primary-400">
                            <span className="material-symbols-outlined">save</span>
                            <h3 className="font-bold">{t('privacy.storage_title')}</h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                            {t('privacy.storage_desc')}
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-stone-500 dark:text-stone-400">
                            <li>{t('privacy.storage_bullet1')}</li>
                            <li>{t('privacy.storage_bullet2')}</li>
                            <li>{t('privacy.storage_bullet3')}</li>
                        </ul>
                    </div>

                    <div className="card p-6 border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-brand-surface-light dark:bg-brand-surface-dark">
                        <div className="flex items-center gap-3 mb-3 text-primary-600 dark:text-primary-400">
                            <span className="material-symbols-outlined">lock</span>
                            <h3 className="font-bold">{t('privacy.zero_access_title')}</h3>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                            {t('privacy.zero_access_desc')}
                        </p>
                    </div>
                </div>

                {/* Rights Card */}
                <div className="card p-6 border-[#AF8F42]/20 dark:border-[#AF8F42]/10 bg-brand-surface-light dark:bg-brand-surface-dark">
                    <div className="flex items-center gap-3 mb-3 text-primary-600 dark:text-primary-400">
                        <span className="material-symbols-outlined">delete_forever</span>
                        <h3 className="font-bold">{t('privacy.rights_title')}</h3>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                        {t('privacy.rights_desc')}
                    </p>
                </div>

                {/* Signature/Footer */}
                <div className="text-center py-6">
                    <p className="text-stone-400 dark:text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                        {t('privacy.last_updated')}
                    </p>
                    <div className="w-12 h-px bg-[#AF8F42]/30 mx-auto mt-4"></div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;

