import React from 'react';
import { 
  Plus, 
  Calculator, 
  Target, 
  BarChart3, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  SlidersHorizontal,
  ArrowRight,
  GraduationCap,
  Award,
  Calendar
} from 'lucide-react';
import { Subject, StudentProfile, ActiveTab, PautaSummary, SupportedLanguage } from '../types';
import { generatePautaSummary, getQualitativeLabel } from '../utils/gradeCalculations';
import { getTranslation } from '../utils/i18n';

interface HomeDashboardProps {
  student: StudentProfile;
  subjects: Subject[];
  onOpenAddSubject: () => void;
  onOpenSubjectDetail?: (subject: Subject) => void;
  onOpenQuickCalc: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAi: () => void;
  targetGrade: number;
  lang?: SupportedLanguage;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  student,
  subjects,
  onOpenAddSubject,
  onOpenQuickCalc,
  onSelectTab,
  onOpenAi,
  targetGrade,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);
  const summary: PautaSummary = generatePautaSummary(student, subjects);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Quick Action Grid (Clean, direct & non-redundant) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Disciplinas Tab Button */}
        <div
          onClick={() => onSelectTab('disciplinas')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <span className="font-bold text-slate-900 dark:text-white text-xs block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {t.navDisciplines}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {subjects.length} Cadastradas
            </span>
          </div>
        </div>

        {/* Quick Calc */}
        <div
          onClick={onOpenQuickCalc}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 hover:shadow-md transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <span className="font-bold text-slate-900 dark:text-white text-xs block group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {t.calculateAverage}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">P1 + P2 + MAC</span>
          </div>
        </div>

        {/* Missing Grade */}
        <div
          onClick={() => onSelectTab('falta')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <span className="font-bold text-slate-900 dark:text-white text-xs block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {t.missingGrade}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Previsão 0-20</span>
          </div>
        </div>

        {/* Stats */}
        <div
          onClick={() => onSelectTab('desempenho')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <span className="font-bold text-slate-900 dark:text-white text-xs block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {t.navStats}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Gráficos & Análise</span>
          </div>
        </div>

      </div>

      {/* Main General Summary Box (0-20 Values) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/40 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider block">
              Resumo Geral do Aluno (Escala 0-20)
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-heading">
              Rendimento Académico • {student.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Nº de Ordem: <strong className="text-slate-900 dark:text-white">{student.orderNumber}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{student.classRoom}</span>
          </div>
        </div>

        {/* Big Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">{t.generalAverage}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-cyan-300 font-heading">
                {summary.generalAverage !== null ? summary.generalAverage.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-slate-400">/ 20</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              {summary.generalAverage !== null ? getQualitativeLabel(summary.generalAverage) : 'Sem notas lançadas'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">{t.targetGoal}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-200 font-heading">
                {targetGrade.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">/ 20</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Objetivo Pessoal
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">{t.overallStatus}</span>
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                summary.generalAverage === null ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700' :
                summary.generalAverage >= targetGrade ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' :
                summary.generalAverage >= 10 ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30' :
                'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
              }`}>
                {summary.generalAverage === null ? t.statusPending :
                 summary.generalAverage >= targetGrade ? '🎯 Na Meta!' :
                 summary.generalAverage >= 10 ? '👍 Aprovado' :
                 `📉 Falta ${(targetGrade - summary.generalAverage).toFixed(1)}`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 block">
              {summary.approvedCount} de {summary.totalSubjects} positivas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">{t.quarters}</span>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5 mt-1">
              <div className="flex justify-between">
                <span>T1:</span>
                <strong className="text-slate-900 dark:text-white">{summary.generalAverageT1 !== null ? summary.generalAverageT1.toFixed(1) : '--'}</strong>
              </div>
              <div className="flex justify-between">
                <span>T2:</span>
                <strong className="text-slate-900 dark:text-white">{summary.generalAverageT2 !== null ? summary.generalAverageT2.toFixed(1) : '--'}</strong>
              </div>
              <div className="flex justify-between">
                <span>T3:</span>
                <strong className="text-slate-900 dark:text-white">{summary.generalAverageT3 !== null ? summary.generalAverageT3.toFixed(1) : '--'}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Disciplines Hub Card (Redirects explicitly into the Disciplines Tab) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/10 via-slate-900/5 to-slate-900/10 dark:from-blue-950/40 dark:via-slate-900/80 dark:to-slate-900 border border-blue-200/60 dark:border-blue-900/40 shadow-xl transition-all">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Gestão Curricular de Disciplinas</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white font-heading">
              Aceda ao módulo de Disciplinas para lançar notas de P1, P2 e MAC
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Todas as suas matérias, professores, avaliações dos três trimestres (T1, T2 e T3) e opções de visualização na pauta escolar estão organizadas dentro da aba <strong>Disciplinas</strong>.
            </p>

            {/* Sub-metrics pill row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                📚 {subjects.length} Disciplinas Cadastradas
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                ✓ {summary.approvedCount} Positivas
              </span>
              {summary.failedCount > 0 && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                  ⚠ {summary.failedCount} Negativas
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => onSelectTab('disciplinas')}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Abrir Módulo de Disciplinas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAddSubject}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-blue-500" />
              <span>Adicionar Nova Disciplina</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

