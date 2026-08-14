import React, { useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  BookOpen, 
  BarChart3, 
  CheckCircle2,
  LineChart,
  PieChart,
  Layers,
  Activity,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { Subject, StudentProfile, PautaSummary } from '../types';
import { generatePautaSummary } from '../utils/gradeCalculations';

interface PerformanceChartsProps {
  student: StudentProfile;
  subjects: Subject[];
  targetGrade: number;
}

type ChartDisplayType = 'bars' | 'trend' | 'distribution';

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  student,
  subjects,
  targetGrade,
}) => {
  const [selectedTrimestre, setSelectedTrimestre] = useState<'mfd' | 't1' | 't2' | 't3'>('mfd');
  const [chartType, setChartType] = useState<ChartDisplayType>('bars');
  
  const summary: PautaSummary = generatePautaSummary(student, subjects);

  const t1Avg = summary.generalAverageT1 ?? 0;
  const t2Avg = summary.generalAverageT2 ?? 0;
  const t3Avg = summary.generalAverageT3 ?? 0;
  const mfdAvg = summary.generalAverage ?? 0;

  // Max 20 scale for graph height
  const getBarHeightPercent = (val: number | null) => {
    if (val === null || isNaN(val)) return 0;
    return Math.min(100, Math.max(8, (val / 20) * 100));
  };

  const getBarColor = (val: number | null) => {
    if (val === null) return 'bg-slate-700';
    if (val >= 14) return 'bg-gradient-to-t from-emerald-600 to-emerald-400';
    if (val >= 10) return 'bg-gradient-to-t from-blue-600 to-cyan-400';
    if (val >= 7) return 'bg-gradient-to-t from-amber-600 to-amber-400';
    return 'bg-gradient-to-t from-rose-600 to-rose-400';
  };

  // Grade classification distribution calculations
  const totalSubCount = summary.subjects.length || 1;
  const excellentCount = summary.subjects.filter(s => (s.mfd ?? 0) >= 14).length;
  const approvedCount = summary.subjects.filter(s => (s.mfd ?? 0) >= 10 && (s.mfd ?? 0) < 14).length;
  const warningCount = summary.subjects.filter(s => (s.mfd ?? 0) >= 7 && (s.mfd ?? 0) < 10).length;
  const criticalCount = summary.subjects.filter(s => (s.mfd !== null && s.mfd < 7)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Performance Header with 3 Chart Type Selectors */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-heading">
              Análise de Desempenho Escolar
            </h1>
            <p className="text-xs text-slate-400">
              Evolução trimestral e métricas do aluno {student.name}.
            </p>
          </div>
        </div>

        {/* 3 Chart Type Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Seletor de Tipo de Gráfico (3 Tipos: Barras, Linhas/Tendência, Distribuição) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setChartType('bars')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                chartType === 'bars' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="1. Gráfico de Barras Comparativo"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>

            <button
              onClick={() => setChartType('trend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                chartType === 'trend' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="2. Gráfico de Linha e Tendência"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Linhas / Tendência</span>
            </button>

            <button
              onClick={() => setChartType('distribution')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                chartType === 'distribution' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3. Gráfico de Distribuição e Níveis"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Distribuição</span>
            </button>
          </div>

          {/* Seletor de Trimestre (MFD, T1, T2, T3) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedTrimestre('mfd')}
              className={`px-2.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedTrimestre === 'mfd' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              MFD
            </button>
            <button
              onClick={() => setSelectedTrimestre('t1')}
              className={`px-2 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedTrimestre === 't1' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              T1
            </button>
            <button
              onClick={() => setSelectedTrimestre('t2')}
              className={`px-2 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedTrimestre === 't2' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              T2
            </button>
            <button
              onClick={() => setSelectedTrimestre('t3')}
              className={`px-2 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedTrimestre === 't3' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              T3
            </button>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* TIPO DE GRÁFICO 1: GRÁFICO DE BARRAS (PADRÃO / COLUNAS)      */}
      {/* ============================================================ */}
      {chartType === 'bars' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Quarterly Evolution Bars */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Evolução Trimestral Geral
                </span>
                <span className="text-xs font-bold text-blue-400">Escala 0-20</span>
              </div>
              <p className="text-xs text-slate-400">
                Comparativo de colunas das médias do 1º ao 3º Trimestre.
              </p>
            </div>

            {/* Graphical Bars Display */}
            <div className="my-8 h-48 flex items-end justify-around gap-4 px-2 pt-6 pb-2 bg-slate-950/80 rounded-2xl border border-slate-800/80 relative">
              
              {/* Target line indicator */}
              <div 
                className="absolute left-0 right-0 border-b border-dashed border-amber-500/50 flex items-center justify-end pr-2 pointer-events-none"
                style={{ bottom: `${(targetGrade / 20) * 100}%` }}
              >
                <span className="text-[10px] text-amber-400 font-bold bg-slate-950 px-1 rounded">
                  Meta {targetGrade.toFixed(1)}
                </span>
              </div>

              {/* 1º Trimestre Bar */}
              <div className="flex flex-col items-center gap-2 h-full justify-end w-16">
                <span className="text-xs font-bold text-white">
                  {t1Avg > 0 ? t1Avg.toFixed(1) : '--'}
                </span>
                <div 
                  className={`w-full rounded-t-xl transition-all duration-700 ${getBarColor(t1Avg > 0 ? t1Avg : null)}`}
                  style={{ height: `${getBarHeightPercent(t1Avg > 0 ? t1Avg : null)}%` }}
                ></div>
                <span className="text-xs font-bold text-slate-400">T1</span>
              </div>

              {/* 2º Trimestre Bar */}
              <div className="flex flex-col items-center gap-2 h-full justify-end w-16">
                <span className="text-xs font-bold text-white">
                  {t2Avg > 0 ? t2Avg.toFixed(1) : '--'}
                </span>
                <div 
                  className={`w-full rounded-t-xl transition-all duration-700 ${getBarColor(t2Avg > 0 ? t2Avg : null)}`}
                  style={{ height: `${getBarHeightPercent(t2Avg > 0 ? t2Avg : null)}%` }}
                ></div>
                <span className="text-xs font-bold text-slate-400">T2</span>
              </div>

              {/* 3º Trimestre Bar */}
              <div className="flex flex-col items-center gap-2 h-full justify-end w-16">
                <span className="text-xs font-bold text-white">
                  {t3Avg > 0 ? t3Avg.toFixed(1) : '--'}
                </span>
                <div 
                  className={`w-full rounded-t-xl transition-all duration-700 ${getBarColor(t3Avg > 0 ? t3Avg : null)}`}
                  style={{ height: `${getBarHeightPercent(t3Avg > 0 ? t3Avg : null)}%` }}
                ></div>
                <span className="text-xs font-bold text-slate-400">T3</span>
              </div>

              {/* Final Average Bar */}
              <div className="flex flex-col items-center gap-2 h-full justify-end w-16">
                <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  {mfdAvg > 0 ? mfdAvg.toFixed(1) : '--'}
                </span>
                <div 
                  className={`w-full rounded-t-xl transition-all duration-700 bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400`}
                  style={{ height: `${getBarHeightPercent(mfdAvg > 0 ? mfdAvg : null)}%` }}
                ></div>
                <span className="text-xs font-bold text-blue-400">MFD</span>
              </div>

            </div>

            {/* Quick takeaway */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
              <span>Tendência de Rendimento:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {t2Avg >= t1Avg ? 'Evolução Positiva (+)' : 'Requer Atenção (-)'}
              </span>
            </div>
          </div>

          {/* Subject-by-Subject Comparative Bar Chart */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white font-heading">
                  Barras por Disciplina ({selectedTrimestre.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-400">
                  Aproveitamento visual e status em cada matéria.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                {(summary?.subjects || []).length} Disciplinas
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {(summary?.subjects || []).map((s) => {
                const grade = 
                  selectedTrimestre === 'mfd' ? s.mfd :
                  selectedTrimestre === 't1' ? s.mt1 :
                  selectedTrimestre === 't2' ? s.mt2 : s.mt3;

                return (
                  <div key={s.id} className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{s.qualitative}</span>
                        <span className={`font-extrabold text-sm ${
                          grade === null ? 'text-slate-500' :
                          grade >= 14 ? 'text-emerald-400' :
                          grade >= 10 ? 'text-blue-400' : 'text-rose-400'
                        }`}>
                          {grade !== null ? grade.toFixed(1) : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Visual progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getBarColor(grade)}`}
                        style={{ width: `${getBarHeightPercent(grade)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TIPO DE GRÁFICO 2: GRÁFICO DE LINHAS / TENDÊNCIA CONTÍNUA    */}
      {/* ============================================================ */}
      {chartType === 'trend' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white font-heading">
                  Curva de Evolução e Tendência Acadêmica
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Visualização vetorial do progresso contínuo de notas comparado à meta ({targetGrade.toFixed(1)} valores).
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <span className="w-3 h-1 rounded-full bg-blue-500 inline-block" /> Sua Média Real
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-3 h-1 rounded-full bg-amber-400 border-b border-dashed inline-block" /> Meta Alvo
              </span>
            </div>
          </div>

          {/* SVG Vector Line Chart Canvas */}
          <div className="h-64 sm:h-72 w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-4 relative flex flex-col justify-between">
            
            {/* Background Grid Lines & Scale Markers */}
            <div className="absolute inset-x-4 inset-y-6 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-slate-600 flex justify-between text-[10px] text-slate-400"><span>20.0</span><span>Excelente</span></div>
              <div className="border-b border-slate-600 flex justify-between text-[10px] text-slate-400"><span>15.0</span><span>Bom</span></div>
              <div className="border-b border-slate-600 flex justify-between text-[10px] text-slate-400"><span>10.0</span><span>Mínimo</span></div>
              <div className="border-b border-slate-600 flex justify-between text-[10px] text-slate-400"><span>5.0</span><span>Crítico</span></div>
              <div className="border-b border-slate-600 flex justify-between text-[10px] text-slate-400"><span>0.0</span><span>Zero</span></div>
            </div>

            {/* Interactive SVG Polyline Chart */}
            <div className="relative w-full h-full pt-4 pb-6">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Target Grade Dashed Line */}
                {(() => {
                  const targetY = 160 - (targetGrade / 20) * 160;
                  return (
                    <line
                      x1="0"
                      y1={targetY}
                      x2="400"
                      y2={targetY}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="opacity-75"
                    />
                  );
                })()}

                {/* Performance Curve Area & Polyline */}
                {(() => {
                  const p1Y = 160 - (t1Avg / 20) * 160;
                  const p2Y = 160 - (t2Avg / 20) * 160;
                  const p3Y = 160 - (t3Avg / 20) * 160;
                  const pmfdY = 160 - (mfdAvg / 20) * 160;

                  const points = `40,${p1Y} 150,${p2Y} 260,${p3Y} 360,${pmfdY}`;
                  const areaPoints = `40,${p1Y} 150,${p2Y} 260,${p3Y} 360,${pmfdY} 360,160 40,160`;

                  return (
                    <>
                      {/* Gradient Fill under the line */}
                      <polygon points={areaPoints} fill="url(#trendGradient)" />
                      {/* Main Stroke Line */}
                      <polyline
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </>
                  );
                })()}
              </svg>

              {/* Data Point Dots and Labels */}
              <div className="absolute inset-0 flex justify-between items-end px-6 sm:px-12 pointer-events-none">
                
                {/* T1 Point */}
                <div className="flex flex-col items-center gap-1 -translate-x-1/2" style={{ marginBottom: `${(t1Avg / 20) * 75}%` }}>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-md">
                    {t1Avg > 0 ? t1Avg.toFixed(1) : '--'}
                  </span>
                  <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-600 shadow-md"></div>
                </div>

                {/* T2 Point */}
                <div className="flex flex-col items-center gap-1 -translate-x-1/2" style={{ marginBottom: `${(t2Avg / 20) * 75}%` }}>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-md">
                    {t2Avg > 0 ? t2Avg.toFixed(1) : '--'}
                  </span>
                  <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-md"></div>
                </div>

                {/* T3 Point */}
                <div className="flex flex-col items-center gap-1 -translate-x-1/2" style={{ marginBottom: `${(t3Avg / 20) * 75}%` }}>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-md">
                    {t3Avg > 0 ? t3Avg.toFixed(1) : '--'}
                  </span>
                  <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-purple-600 shadow-md"></div>
                </div>

                {/* MFD Point */}
                <div className="flex flex-col items-center gap-1 -translate-x-1/2" style={{ marginBottom: `${(mfdAvg / 20) * 75}%` }}>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-md">
                    {mfdAvg > 0 ? mfdAvg.toFixed(1) : '--'}
                  </span>
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-emerald-500 shadow-lg"></div>
                </div>

              </div>

            </div>

            {/* Bottom Axis Labels */}
            <div className="flex justify-between items-center px-4 sm:px-10 text-xs font-bold text-slate-400 border-t border-slate-800/80 pt-2">
              <span>1º Trimestre (T1)</span>
              <span>2º Trimestre (T2)</span>
              <span>3º Trimestre (T3)</span>
              <span className="text-emerald-400 font-extrabold">Média Final (MFD)</span>
            </div>

          </div>

          {/* Analytical Takeaways */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Variação T1 ➔ T2</span>
              <p className={`text-sm font-bold mt-1 ${t2Avg >= t1Avg ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t2Avg > 0 && t1Avg > 0 ? `${(t2Avg - t1Avg >= 0 ? '+' : '')}${(t2Avg - t1Avg).toFixed(1)} valores` : 'Dados pendentes'}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Distância da Meta</span>
              <p className={`text-sm font-bold mt-1 ${mfdAvg >= targetGrade ? 'text-emerald-400' : 'text-amber-400'}`}>
                {mfdAvg > 0 ? `${(mfdAvg - targetGrade >= 0 ? '+' : '')}${(mfdAvg - targetGrade).toFixed(1)} valores` : '--'}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Projeção Final</span>
              <p className="text-sm font-bold text-blue-400 mt-1">
                {summary.finalAcademicStatus}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TIPO DE GRÁFICO 3: DISTRIBUIÇÃO E NÍVEIS DE DESEMPENHO       */}
      {/* ============================================================ */}
      {chartType === 'distribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Distribution Proportions Card */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white font-heading">
                  Distribuição por Faixas de Nota
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Percentual de disciplinas em cada categoria de rendimento.
              </p>
            </div>

            {/* Segmented Distribution Progress Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded-full bg-slate-950 overflow-hidden flex shadow-inner border border-slate-800">
                <div 
                  style={{ width: `${(excellentCount / totalSubCount) * 100}%` }} 
                  className="bg-emerald-500 h-full transition-all"
                  title={`Excelente: ${excellentCount}`}
                />
                <div 
                  style={{ width: `${(approvedCount / totalSubCount) * 100}%` }} 
                  className="bg-blue-500 h-full transition-all"
                  title={`Aprovado: ${approvedCount}`}
                />
                <div 
                  style={{ width: `${(warningCount / totalSubCount) * 100}%` }} 
                  className="bg-amber-500 h-full transition-all"
                  title={`Em Risco: ${warningCount}`}
                />
                <div 
                  style={{ width: `${(criticalCount / totalSubCount) * 100}%` }} 
                  className="bg-rose-500 h-full transition-all"
                  title={`Crítico: ${criticalCount}`}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                <span>0%</span>
                <span>Total: {summary.subjects.length} Disciplinas</span>
                <span>100%</span>
              </div>
            </div>

            {/* Faixas Detalhadas */}
            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-white block">Excelente (≥ 14 valores)</span>
                    <span className="text-[10px] text-slate-400">Dispensa ou Mérito Acadêmico</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-400">{excellentCount}</span>
                  <span className="text-[10px] text-slate-500 block">{Math.round((excellentCount / totalSubCount) * 100)}%</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <span className="text-xs font-bold text-white block">Aprovado (10.0 a 13.9)</span>
                    <span className="text-[10px] text-slate-400">Rendimento satisfatório</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-blue-400">{approvedCount}</span>
                  <span className="text-[10px] text-slate-500 block">{Math.round((approvedCount / totalSubCount) * 100)}%</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-white block">Em Risco (7.0 a 9.9)</span>
                    <span className="text-[10px] text-slate-400">Requer Exame / Atenção</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-amber-400">{warningCount}</span>
                  <span className="text-[10px] text-slate-500 block">{Math.round((warningCount / totalSubCount) * 100)}%</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div>
                    <span className="text-xs font-bold text-white block">Crítico (&lt; 7.0 valores)</span>
                    <span className="text-[10px] text-slate-400">Reprovação direta</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-rose-400">{criticalCount}</span>
                  <span className="text-[10px] text-slate-500 block">{Math.round((criticalCount / totalSubCount) * 100)}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* Grouped Subjects by Category */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Disciplinas por Nível de Aproveitamento
                </h3>
                <p className="text-xs text-slate-400">
                  Classificação baseada na Média Final da Disciplina (MFD).
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {summary.subjects.map((sub) => {
                const grade = sub.mfd;
                const statusColor = 
                  grade === null ? 'border-slate-800 text-slate-400' :
                  grade >= 14 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' :
                  grade >= 10 ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' :
                  grade >= 7 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' :
                  'border-rose-500/40 bg-rose-500/10 text-rose-300';

                return (
                  <div 
                    key={sub.id} 
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${statusColor}`}
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{sub.name}</h4>
                      <p className="text-[10px] opacity-80 mt-0.5">
                        T1: {sub.mt1?.toFixed(1) ?? '--'} | T2: {sub.mt2?.toFixed(1) ?? '--'} | T3: {sub.mt3?.toFixed(1) ?? '--'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-white">
                        {grade !== null ? grade.toFixed(1) : '--'}
                      </span>
                      <span className="text-[10px] block font-semibold opacity-90">
                        {sub.qualitative}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* Highlights: Best Subject & Focus Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Ponto Mais Forte</span>
            <h3 className="text-base font-bold text-white">
              {summary.bestSubject ? `${summary.bestSubject.name} (${summary.bestSubject.grade.toFixed(1)})` : 'Nenhuma nota lançada'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Excelente rendimento escolar mantido nesta disciplina.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Atenção Especial / Foco</span>
            <h3 className="text-base font-bold text-white">
              {summary.worstSubject ? `${summary.worstSubject.name} (${summary.worstSubject.grade.toFixed(1)})` : 'Nenhuma disciplina crítica'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Priorize reforço e estudo focado no próximo trimestre.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
