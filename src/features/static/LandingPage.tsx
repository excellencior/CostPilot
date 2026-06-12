import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { useLanguage } from '../../application/contexts/LanguageContext';

interface LandingPageProps {
    onAccepted?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onAccepted }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();


    const handleContinue = async () => {
        await Preferences.set({ key: 'hasAcceptedTerms', value: 'true' });
        if (onAccepted) onAccepted();
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-brand-base-light dark:bg-brand-base-dark text-stone-900 dark:text-stone-100 flex flex-col items-center p-6 sm:p-10">
            <div className="flex-grow flex flex-col items-center justify-center w-full max-w-2xl text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Brand Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <img
                            src="/costpilot_logo_suite.svg"
                            alt="CostPilot"
                            className="w-14 h-14 object-contain"
                        />
                        <h1 className="text-5xl font-black tracking-tight font-brand-title">
                            <span className="text-[#8c7851]">Cost</span>
                            <span className="text-[#8c7851]/75">Pilot</span>
                        </h1>
                    </div>
                    <p className="text-lg text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
                        {t('landing.description')}
                    </p>
                </div>

                {/* Quote Section */}
                <div className="card-section p-8 text-center space-y-6 bg-brand-surface-light/50 dark:bg-brand-surface-dark/50 border border-stone-200 dark:border-stone-800 relative overflow-hidden shadow-inner">
                    <span className="material-symbols-outlined absolute -top-4 -left-2 text-[120px] text-[#AF8F42]/10 dark:text-[#AF8F42]/20 rotate-12 select-none pointer-events-none">format_quote</span>
                    <div className="relative z-10 space-y-4">
                        <p className="text-lg md:text-xl font-medium text-stone-700 dark:text-stone-300 leading-relaxed italic">
                            {t('landing.quote')}
                        </p>
                        <div className="h-1 w-12 bg-[#AF8F42] mx-auto rounded-full"></div>
                    </div>
                </div>

                {/* Call To Action */}
                <div className="pt-6 space-y-6 w-full max-w-sm mx-auto">
                    <button
                        onClick={handleContinue}
                        className="w-full py-1 text-lg shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 transition-all btn-primary hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span>{t('landing.continue_btn')}</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>

                    <div className="flex items-center justify-center gap-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        <button onClick={() => navigate('/privacy')} className="hover:text-[#AF8F42] transition-colors">{t('navigation.privacy_policy')}</button>
                        <span className="size-1 rounded-full bg-stone-300 dark:bg-stone-700"></span>
                        <button onClick={() => navigate('/terms')} className="hover:text-[#AF8F42] transition-colors">{t('navigation.terms_of_service')}</button>
                    </div>
                </div>
            </div>

            {/* Footer text */}
            <div className="w-full py-6 text-[10px] text-stone-400 dark:text-stone-500 font-medium tracking-widest uppercase text-center mt-auto">
                &copy; {new Date().getFullYear()} CostPilot • {t('landing.visual_clarity')}
            </div>
        </div>
    );
};

export default LandingPage;
