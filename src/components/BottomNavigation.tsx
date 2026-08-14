import React from 'react';
import { Home, BookOpen, BarChart3, FileText, Target, Globe, Sparkles } from 'lucide-react';
import { ActiveTab, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  lang?: SupportedLanguage;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);

  const navItems = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'disciplinas', label: t.navDisciplines, icon: BookOpen },
    { id: 'pauta', label: t.navPauta, icon: FileText, isCenter: true },
    { id: 'ia', label: 'Tutor IA', icon: Sparkles, isAi: true },
    { id: 'desempenho', label: t.navStats, icon: BarChart3 },
    { id: 'falta', label: t.navMissing, icon: Target },
  ];

  return (
    <nav className="no-print fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-xl">
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800/90 rounded-3xl p-1.5 shadow-2xl shadow-slate-900/15 dark:shadow-black/80 flex items-center justify-around transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`relative px-3.5 py-1.5 sm:py-2 rounded-2xl flex flex-col items-center gap-0.5 sm:gap-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'bg-blue-600/15 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 hover:bg-blue-600/25 border border-blue-500/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-bold tracking-tight whitespace-nowrap">{item.label}</span>
              </button>
            );
          }

          if (item.isAi) {
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`flex-1 py-1.5 px-1 rounded-2xl flex flex-col items-center gap-0.5 sm:gap-1 transition-all ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 font-bold scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-amber-500'}`} />
                <span className="text-[9px] sm:text-[10px] tracking-tight whitespace-nowrap">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as ActiveTab)}
              className={`flex-1 py-1.5 px-1 rounded-2xl flex flex-col items-center gap-0.5 sm:gap-1 transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-[9px] sm:text-[10px] tracking-tight whitespace-nowrap truncate max-w-[54px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
