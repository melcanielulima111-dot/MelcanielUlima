import React, { useState } from 'react';
import { 
  Target, 
  Calculator, 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { Subject, SupportedLanguage } from '../types';
import { calculateQuarterAverage } from '../utils/gradeCalculations';
import { getTranslation } from '../utils/i18n';

interface MissingGradeCalculatorProps {
  subjects: Subject[];
  defaultTarget?: number;
  lang?: SupportedLanguage;
}

export const MissingGradeCalculator: React.FC<MissingGradeCalculatorProps> = ({
  subjects = [],
  defaultTarget = 14.0,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);
  const [calcMode, setCalcMode] = useState<'quarter' | 'annual'>('quarter');
  const [target, setTarget] = useState<number>(defaultTarget || 14.0);

  // Quarter mode states (empty string represents a blank note)
  const [p1, setP1] = useState<string>('12');
  const [p2, setP2] = useState<string>('');
  const [mac, setMac] = useState<string>('');

  // Annual mode states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [manualMt1, setManualMt1] = useState<string>('13');
  const [manualMt2, setManualMt2] = useState<string>('');
  const [manualMt3, setManualMt3] = useState<string>('');

  // Calculation for Quarter Mode (Can handle 0, 1, 2, or 3 blank grades)
  const calculateQuarterMissing = () => {
    const p1Num = p1.trim() === '' ? null : parseFloat(p1);
    const p2Num = p2.trim() === '' ? null : parseFloat(p2);
    const macNum = mac.trim() === '' ? null : parseFloat(mac);

    const entries = [
      { name: '1ª Prova (P1)', short: 'P1', value: p1Num },
      { name: '2ª Prova (P2)', short: 'P2', value: p2Num },
      { name: 'Av. Contínua (MAC)', short: 'MAC', value: macNum },
    ];

    const filledEntries = entries.filter(e => e.value !== null && !isNaN(e.value));
    const blankEntries = entries.filter(e => e.value === null || isNaN(e.value));
    const filledSum = filledEntries.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const targetTotal = target * 3;
    const passTotal = 10.0 * 3; // 30.0

    // 0 blank (all 3 filled)
    if (blankEntries.length === 0) {
      const avg = filledSum / 3;
      return {
        type: 'all_filled' as const,
        average: avg,
        diff: avg - target,
        message: avg >= target ? 'Meta já alcançada com sucesso!' : `Faltam ${(target - avg).toFixed(1)} valores para atingir a meta.`,
        isApproved: avg >= 10.0,
      };
    }

    // 1 blank (2 filled, 1 missing)
    if (blankEntries.length === 1) {
      const missing = blankEntries[0];
      const neededForTarget = targetTotal - filledSum;
      const neededForPass = passTotal - filledSum;

      return {
        type: 'one_missing' as const,
        missingField: missing.name,
        missingShort: missing.short,
        neededForTarget: Math.round(neededForTarget * 10) / 10,
        neededForPass: Math.max(0, Math.round(neededForPass * 10) / 10),
        isTargetPossible: neededForTarget <= 20.0,
        isPassPossible: neededForPass <= 20.0,
        isTargetGuaranteed: neededForTarget <= 0,
      };
    }

    // 2 blank (1 filled, 2 missing) - User requested feature
    if (blankEntries.length === 2) {
      const singleFilled = filledEntries[0];
      const neededSumTarget = targetTotal - singleFilled.value!;
      const neededEachTarget = neededSumTarget / 2;
      const neededSumPass = passTotal - singleFilled.value!;
      const neededEachPass = Math.max(0, neededSumPass / 2);

      return {
        type: 'two_missing' as const,
        knownField: singleFilled.name,
        knownValue: singleFilled.value!,
        missingNames: blankEntries.map(e => e.name).join(' e '),
        missingShort: blankEntries.map(e => e.short).join(' + '),
        neededEachTarget: Math.round(neededEachTarget * 10) / 10,
        neededEachPass: Math.round(neededEachPass * 10) / 10,
        isTargetPossible: neededEachTarget <= 20.0,
        isPassPossible: neededEachPass <= 20.0,
        isTargetGuaranteed: neededEachTarget <= 0,
      };
    }

    // 3 blank (all empty)
    return {
      type: 'all_empty' as const,
      neededEachTarget: target,
      neededEachPass: 10.0,
    };
  };

  // Calculation for Annual Mode (Can handle 1 or 2 blank trimesters)
  const calculateAnnualMissing = () => {
    const selectedSub = subjects.find(s => s.id === selectedSubjectId);
    
    let mt1Num = manualMt1.trim() === '' ? null : parseFloat(manualMt1);
    let mt2Num = manualMt2.trim() === '' ? null : parseFloat(manualMt2);
    let mt3Num = manualMt3.trim() === '' ? null : parseFloat(manualMt3);

    if (selectedSub) {
      const autoMt1 = calculateQuarterAverage(selectedSub.t1);
      const autoMt2 = calculateQuarterAverage(selectedSub.t2);
      const autoMt3 = calculateQuarterAverage(selectedSub.t3);
      if (autoMt1 !== null && manualMt1 === '') mt1Num = autoMt1;
      if (autoMt2 !== null && manualMt2 === '') mt2Num = autoMt2;
      if (autoMt3 !== null && manualMt3 === '') mt3Num = autoMt3;
    }

    const trimesters = [
      { name: '1º Trimestre (MT1)', short: 'T1', value: mt1Num },
      { name: '2º Trimestre (MT2)', short: 'T2', value: mt2Num },
      { name: '3º Trimestre (MT3)', short: 'T3', value: mt3Num },
    ];

    const filled = trimesters.filter(t => t.value !== null && !isNaN(t.value));
    const blanks = trimesters.filter(t => t.value === null || isNaN(t.value));
    const filledSum = filled.reduce((acc, curr) => acc + (curr.value || 0), 0);

    const targetAnnualTotal = target * 3;
    const passAnnualTotal = 10.0 * 3;

    if (blanks.length === 0) {
      const mfd = filledSum / 3;
      return {
        mode: 'all_filled' as const,
        mfd: Math.round(mfd * 10) / 10,
        isApproved: mfd >= 10.0,
        reachedTarget: mfd >= target,
      };
    }

    if (blanks.length === 1) {
      const missing = blanks[0];
      const neededTarget = targetAnnualTotal - filledSum;
      const neededPass = passAnnualTotal - filledSum;

      return {
        mode: 'one_missing' as const,
        missingName: missing.name,
        neededTarget: Math.round(neededTarget * 10) / 10,
        neededPass: Math.max(0, Math.round(neededPass * 10) / 10),
        isTargetPossible: neededTarget <= 20.0,
        isPassPossible: neededPass <= 20.0,
        isGuaranteed: neededTarget <= 0,
      };
    }

    if (blanks.length === 2) {
      const known = filled[0];
      const neededSumTarget = targetAnnualTotal - (known?.value || 0);
      const neededEachTarget = neededSumTarget / 2;
      const neededSumPass = passAnnualTotal - (known?.value || 0);
      const neededEachPass = Math.max(0, neededSumPass / 2);

      return {
        mode: 'two_missing' as const,
        knownName: known ? known.name : 'Nenhum',
        knownValue: known ? known.value! : 0,
        missingNames: blanks.map(b => b.name).join(' e '),
        neededEachTarget: Math.round(neededEachTarget * 10) / 10,
        neededEachPass: Math.round(neededEachPass * 10) / 10,
        isTargetPossible: neededEachTarget <= 20.0,
        isPassPossible: neededEachPass <= 20.0,
      };
    }

    return {
      mode: 'all_empty' as const,
      neededEachTarget: target,
      neededEachPass: 10.0,
    };
  };

  const quarterResult = calculateQuarterMissing();
  const annualResult = calculateAnnualMissing();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-heading">
                Calculadora de "Nota que Falta"
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Simule notas necessárias em avaliações ou trimestres restantes (escala 0-20).
              </p>
            </div>
          </div>
        </div>

        {/* Global Target Adjuster */}
        <div className="flex items-center gap-3 p-2.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 self-stretch sm:self-auto shadow-inner">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sua Meta (0-20):</span>
          </span>
          <input
            type="number"
            min="10"
            max="20"
            step="0.5"
            value={target}
            onChange={(e) => setTarget(Math.min(20, Math.max(10, parseFloat(e.target.value) || 14)))}
            className="w-16 px-2.5 py-1 text-center font-extrabold text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold max-w-md">
        <button
          onClick={() => setCalcMode('quarter')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            calcMode === 'quarter'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Falta no Trimestre (P1, P2, MAC)</span>
        </button>
        <button
          onClick={() => setCalcMode('annual')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            calcMode === 'annual'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Falta no Ano (T1, T2, T3)</span>
        </button>
      </div>

      {/* MODE 1: QUARTER PREDICTION */}
      {calcMode === 'quarter' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inputs Column */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  Avaliações do Trimestre
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Inserir Notas Realizadas
                </h2>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Deixe em branco as notas pendentes
              </span>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* P1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1ª Prova (P1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Vazio"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* P2 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  2ª Prova (P2)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Vazio"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* MAC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Av. Contínua (MAC)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Vazio"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                Exemplos rápidos:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setP1('12'); setP2(''); setMac(''); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  ⚡ Apenas P1 feita (2 em branco)
                </button>
                <button
                  type="button"
                  onClick={() => { setP1('14'); setP2('15'); setMac(''); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  ⚡ P1 e P2 feitas (1 em branco)
                </button>
                <button
                  type="button"
                  onClick={() => { setP1(''); setP2(''); setMac(''); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  🧹 Limpar Tudo
                </button>
              </div>
            </div>
          </div>

          {/* Quarter Calculation Result Card */}
          <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between transition-colors">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Resultado da Previsão
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Meta: {target.toFixed(1)} / 20
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-heading">
                Diagnóstico de Notas Necessárias
              </h2>
            </div>

            {/* Result Content */}
            <div className="my-5">
              
              {/* CASE: 2 GRADES BLANK */}
              {quarterResult.type === 'two_missing' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-3xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Nas <strong>2 avaliações restantes</strong> você precisa tirar em média:
                    </span>
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-cyan-300 my-1 font-heading">
                      {quarterResult.neededEachTarget <= 0 ? '0.0' : quarterResult.neededEachTarget.toFixed(1)}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 block">
                      em cada uma das duas notas para atingir média trimestral de <strong>{target.toFixed(1)}</strong>
                    </span>
                    <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>Média mínima para aprovação (10.0):</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{quarterResult.neededEachPass.toFixed(1)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE: 1 GRADE BLANK */}
              {quarterResult.type === 'one_missing' && (
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                    Para atingir a meta em <strong>{quarterResult.missingField}</strong>:
                  </span>
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-cyan-300 font-heading">
                    {quarterResult.neededForTarget <= 0 ? '0.0' : quarterResult.neededForTarget.toFixed(1)}
                  </div>
                  <div>
                    {quarterResult.neededForTarget > 20 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Meta inalcançável no trimestre (precisaria &gt; 20.0)
                      </span>
                    ) : quarterResult.neededForTarget <= 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Meta já garantida! Mesmo com 0 você atinge a meta.
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                        Tirando {quarterResult.neededForTarget.toFixed(1)}, sua média trimestral será {target.toFixed(1)}.
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                    Média mínima para aprovação (10.0): <strong className="text-emerald-600 dark:text-emerald-400">{quarterResult.neededForPass.toFixed(1)}</strong>
                  </div>
                </div>
              )}

              {/* CASE: ALL FILLED */}
              {quarterResult.type === 'all_filled' && (
                <div className="p-6 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Média Trimestral Obtida:</span>
                  <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                    {quarterResult.average.toFixed(1)}
                  </div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{quarterResult.message}</p>
                </div>
              )}

              {/* CASE: ALL EMPTY */}
              {quarterResult.type === 'all_empty' && (
                <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
                  <Calculator className="w-8 h-8 mx-auto text-slate-400" />
                  <p>Insira pelo menos 1 nota para ver o cálculo exato.</p>
                </div>
              )}

            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Cálculo baseado no sistema pedagógico de 3 avaliações trimestrais.
            </div>
          </div>

        </div>
      ) : (
        /* MODE 2: ANNUAL T3 PREDICTION */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 transition-colors">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-1">
                Médias Trimestrais
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Projeção Anual de Disciplina
              </h2>
            </div>

            {subjects.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vincular a uma disciplina (opcional)
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const sub = subjects.find(s => s.id === e.target.value);
                    if (sub) {
                      const t1Avg = calculateQuarterAverage(sub.t1);
                      const t2Avg = calculateQuarterAverage(sub.t2);
                      const t3Avg = calculateQuarterAverage(sub.t3);
                      if (t1Avg !== null) setManualMt1(t1Avg.toString());
                      if (t2Avg !== null) setManualMt2(t2Avg.toString());
                      if (t3Avg !== null) setManualMt3(t3Avg.toString());
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Entrada manual livre --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1º Trim. (MT1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Vazio"
                  value={manualMt1}
                  onChange={(e) => setManualMt1(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  2º Trim. (MT2)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Vazio"
                  value={manualMt2}
                  onChange={(e) => setManualMt2(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  3º Trim. (MT3)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="Vazio"
                  value={manualMt3}
                  onChange={(e) => setManualMt3(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between transition-colors">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-1">
                Planeamento da Média Final Anual (MFD)
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Projeção para Conclusão do Ano Letivo
              </h2>
            </div>

            {annualResult.mode === 'two_missing' && (
              <div className="space-y-3 my-4">
                <div className="p-5 rounded-3xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-center">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Nos 2 trimestres restantes você precisa em média de:
                  </span>
                  <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400 font-heading">
                    {annualResult.neededEachTarget.toFixed(1)}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block mt-1">
                    em cada trimestre para fechar o ano com <strong>{target.toFixed(1)}</strong>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Média mínima em cada um para aprovação anual (10.0): <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{annualResult.neededEachPass.toFixed(1)}</strong>
                  </span>
                </div>
              </div>
            )}

            {annualResult.mode === 'one_missing' && (
              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Para Aprovação (10.0)</span>
                  <span className={`text-3xl font-black ${
                    !annualResult.isPassPossible ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {annualResult.isPassPossible ? annualResult.neededPass.toFixed(1) : '> 20.0'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">no trimestre faltante</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Para a Meta ({target.toFixed(1)})</span>
                  <span className={`text-3xl font-black ${
                    !annualResult.isTargetPossible ? 'text-rose-600 dark:text-rose-400' : 'text-cyan-600 dark:text-cyan-400'
                  }`}>
                    {annualResult.isTargetPossible ? annualResult.neededTarget.toFixed(1) : '> 20.0'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">no trimestre faltante</span>
                </div>
              </div>
            )}

            {annualResult.mode === 'all_filled' && (
              <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center my-4">
                <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Média Final da Disciplina (MFD)</span>
                <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                  {annualResult.mfd.toFixed(1)}
                </div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-2">
                  {annualResult.isApproved ? 'Aprovado na Disciplina!' : 'Disciplina em Risco / Não Aprovado'}
                </p>
              </div>
            )}

            {annualResult.mode === 'all_empty' && (
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs my-4">
                Preencha pelo menos um trimestre para ver a projeção.
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Previsão calculada com base na média ponderada dos três trimestres.
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
