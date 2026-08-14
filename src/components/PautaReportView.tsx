import React, { useState } from 'react';
import { 
  Printer, 
  FileText, 
  Maximize2, 
  Minimize2, 
  Edit2,
  Globe,
  Download,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { StudentProfile, Subject, PautaSummary, SupportedLanguage } from '../types';
import { generatePautaSummary } from '../utils/gradeCalculations';
import { getTranslation } from '../utils/i18n';
import { CalFexLogo } from './CalFexLogo';
import { exportPautaToPdf } from '../utils/pdfExport';
import confetti from 'canvas-confetti';

interface PautaReportViewProps {
  student: StudentProfile;
  subjects: Subject[];
  onOpenSubjectEdit: (subject: Subject) => void;
  onOpenPautaNet?: () => void;
  targetGrade?: number;
  lang?: SupportedLanguage;
}

export const PautaReportView: React.FC<PautaReportViewProps> = ({
  student,
  subjects,
  onOpenSubjectEdit,
  onOpenPautaNet,
  targetGrade = 14,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [quarterFilter, setQuarterFilter] = useState<'all' | 't1' | 't2' | 't3'>('all');
  const [isWideMode, setIsWideMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Visible subjects for official pauta
  const visibleSubjects = subjects.filter((s) => !s.hiddenInPauta);
  const summary: PautaSummary = generatePautaSummary(student, visibleSubjects);

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      if (summary.generalAverage !== null && summary.generalAverage >= 14) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      // Generate and save PDF document directly
      const success = exportPautaToPdf(student, visibleSubjects, targetGrade);
      
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (summary.generalAverage !== null && summary.generalAverage >= 14) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
      case 'Suficiente':
        return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
      case 'Em Risco':
        return 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
      case 'Reprovado':
        return 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  // Reusable Table Component containing purely the subjects & marks
  const renderGradesTable = (isWide: boolean = false) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <table className="w-full text-xs text-left border-collapse min-w-[720px]">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
            <th className="py-3 px-3 text-center w-10">Nº</th>
            <th className="py-3 px-4">Disciplina</th>

            {/* 1º Trimestre Header */}
            {(quarterFilter === 'all' || quarterFilter === 't1') && (
              <th className="py-3 px-2 text-center bg-blue-50/80 dark:bg-blue-950/40 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-300" colSpan={viewMode === 'detailed' ? 4 : 1}>
                1º Trimestre (T1)
              </th>
            )}

            {/* 2º Trimestre Header */}
            {(quarterFilter === 'all' || quarterFilter === 't2') && (
              <th className="py-3 px-2 text-center bg-indigo-50/80 dark:bg-indigo-950/40 border-r border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300" colSpan={viewMode === 'detailed' ? 4 : 1}>
                2º Trimestre (T2)
              </th>
            )}

            {/* 3º Trimestre Header */}
            {(quarterFilter === 'all' || quarterFilter === 't3') && (
              <th className="py-3 px-2 text-center bg-cyan-50/80 dark:bg-cyan-950/40 border-r border-slate-200 dark:border-slate-800 text-cyan-700 dark:text-cyan-300" colSpan={viewMode === 'detailed' ? 4 : 1}>
                3º Trimestre (T3)
              </th>
            )}

            {quarterFilter === 'all' && (
              <>
                <th className="py-3 px-3 text-center bg-blue-600/10 text-blue-700 dark:text-blue-300 border-r border-slate-200 dark:border-slate-800">
                  MFD
                </th>
                <th className="py-3 px-3 text-center">Classificação</th>
                <th className="py-3 px-3 text-center">Situação</th>
              </>
            )}
            
            <th className="py-3 px-2 text-center no-print w-10">Ação</th>
          </tr>

          {/* Sub-header for detailed partials (P1, P2, MAC, MT) */}
          {viewMode === 'detailed' && (
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-center font-medium">
              <th></th>
              <th></th>
              
              {/* T1 partials */}
              {(quarterFilter === 'all' || quarterFilter === 't1') && (
                <>
                  <th className="py-1 px-1 border-l border-slate-200 dark:border-slate-800">P1</th>
                  <th className="py-1 px-1">P2</th>
                  <th className="py-1 px-1">MAC</th>
                  <th className="py-1 px-2 font-bold text-slate-800 dark:text-slate-200 bg-blue-100/50 dark:bg-blue-900/20 border-r border-slate-200 dark:border-slate-800">MT1</th>
                </>
              )}

              {/* T2 partials */}
              {(quarterFilter === 'all' || quarterFilter === 't2') && (
                <>
                  <th className="py-1 px-1">P1</th>
                  <th className="py-1 px-1">P2</th>
                  <th className="py-1 px-1">MAC</th>
                  <th className="py-1 px-2 font-bold text-slate-800 dark:text-slate-200 bg-indigo-100/50 dark:bg-indigo-900/20 border-r border-slate-200 dark:border-slate-800">MT2</th>
                </>
              )}

              {/* T3 partials */}
              {(quarterFilter === 'all' || quarterFilter === 't3') && (
                <>
                  <th className="py-1 px-1">P1</th>
                  <th className="py-1 px-1">P2</th>
                  <th className="py-1 px-1">MAC</th>
                  <th className="py-1 px-2 font-bold text-slate-800 dark:text-slate-200 bg-cyan-100/50 dark:bg-cyan-900/20 border-r border-slate-200 dark:border-slate-800">MT3</th>
                </>
              )}

              {quarterFilter === 'all' && (
                <>
                  <th className="border-r border-slate-200 dark:border-slate-800"></th>
                  <th></th>
                  <th></th>
                </>
              )}
              <th className="no-print"></th>
            </tr>
          )}
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {summary.subjects.length === 0 ? (
            <tr>
              <td colSpan={15} className="py-12 text-center text-slate-500 dark:text-slate-400">
                Nenhuma disciplina cadastrada. Adicione disciplinas no menu Disciplinas para visualizar suas notas.
              </td>
            </tr>
          ) : (
            summary.subjects.map((sub, idx) => {
              const originalSub = subjects.find(s => s.id === sub.id) || subjects[idx];
              return (
                <tr 
                  key={sub.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
                >
                  {/* Row number */}
                  <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono font-medium">
                    {idx + 1}
                  </td>

                  {/* Subject Name */}
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center justify-between">
                      <span>{sub.name}</span>
                      {sub.weight > 1 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ml-1">
                          peso {sub.weight}
                        </span>
                      )}
                    </div>
                    {sub.teacher && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">
                        {sub.teacher}
                      </span>
                    )}
                  </td>

                  {/* T1 columns */}
                  {(quarterFilter === 'all' || quarterFilter === 't1') && (
                    <>
                      {viewMode === 'detailed' && (
                        <>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800">
                            {sub.t1P1 !== null ? sub.t1P1.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t1P2 !== null ? sub.t1P2.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t1Mac !== null ? sub.t1Mac.toFixed(1) : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-2 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 border-r border-slate-200 dark:border-slate-800">
                        {sub.mt1 !== null ? sub.mt1.toFixed(1) : '-'}
                      </td>
                    </>
                  )}

                  {/* T2 columns */}
                  {(quarterFilter === 'all' || quarterFilter === 't2') && (
                    <>
                      {viewMode === 'detailed' && (
                        <>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t2P1 !== null ? sub.t2P1.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t2P2 !== null ? sub.t2P2.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t2Mac !== null ? sub.t2Mac.toFixed(1) : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-800">
                        {sub.mt2 !== null ? sub.mt2.toFixed(1) : '-'}
                      </td>
                    </>
                  )}

                  {/* T3 columns */}
                  {(quarterFilter === 'all' || quarterFilter === 't3') && (
                    <>
                      {viewMode === 'detailed' && (
                        <>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t3P1 !== null ? sub.t3P1.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t3P2 !== null ? sub.t3P2.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-700 dark:text-slate-300">
                            {sub.t3Mac !== null ? sub.t3Mac.toFixed(1) : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-2 text-center font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50/40 dark:bg-cyan-950/20 border-r border-slate-200 dark:border-slate-800">
                        {sub.mt3 !== null ? sub.mt3.toFixed(1) : '-'}
                      </td>
                    </>
                  )}

                  {/* Annual MFD & Results */}
                  {quarterFilter === 'all' && (
                    <>
                      <td className="py-3 px-3 text-center font-extrabold text-sm text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-900/30 border-r border-slate-200 dark:border-slate-800">
                        {sub.mfd !== null ? sub.mfd.toFixed(1) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                        {sub.qualitative}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Action edit */}
                  <td className="py-3 px-2 text-center no-print">
                    <button
                      onClick={() => originalSub && onOpenSubjectEdit(originalSub)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Editar notas desta disciplina"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 transition-all duration-300">
      
      {/* Top Toolbar (Clean: Vista Ampla, Formato, Filtro, Imprimir) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-heading">
              {t.pautaOfficialTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pauta oficial com todas as notas de P1, P2, MAC, Médias Trimestrais e MFD.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Wide View Mode Toggle Button */}
          <button
            onClick={() => setIsWideMode(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all shadow-sm"
            title="Expandir para tela toda apenas com a pauta de notas"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Vista Ampla</span>
          </button>

          {/* Detailed vs Compact */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === 'detailed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completa (P1,P2,MAC)
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === 'compact' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Resumida (MT1,2,3)
            </button>
          </div>

          {/* Quarter filter */}
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="all">Pauta Anual (Todos Trimestres)</option>
            <option value="t1">1º Trimestre (T1)</option>
            <option value="t2">2º Trimestre (T2)</option>
            <option value="t3">3º Trimestre (T3)</option>
          </select>

          {/* Botão 1: PautaNet (No lugar de imprimir pauta) */}
          {onOpenPautaNet && (
            <button
              onClick={onOpenPautaNet}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              title="Aceder ao Portal PautaNet de Pautas Online"
            >
              <Globe className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>PautaNet</span>
            </button>
          )}

          {/* Botão 2: Descarregar em PDF (Ao lado) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold border shadow-md transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30 scale-[1.02]'
                : isDownloading
                ? 'bg-slate-800 border-slate-700 opacity-80 cursor-wait'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-700 dark:border-slate-700'
            }`}
            title="Gerar e Descarregar Pauta Oficial em PDF"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                <span>A gerar PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>PDF Descarregado!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Descarregar em PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Pauta Oficial em formato PDF gerada e descarregada com sucesso!</span>
          </div>
          <button
            onClick={handlePrint}
            className="text-[11px] underline font-bold hover:text-emerald-900 dark:hover:text-white"
          >
            Imprimir versão física
          </button>
        </div>
      )}

      {/* The Printable Pauta Sheet Document */}
      <div className="pauta-printable bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative transition-colors">
        
        {/* Document Official Header */}
        <div className="border-b-2 border-blue-600/30 dark:border-blue-500/40 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
            
            <div className="flex items-center gap-4">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-500/40 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 block mb-0.5">
                  Boletim Escolar Oficial
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                  {student.name}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-white">Nº {student.orderNumber}</span>
                  <span>•</span>
                  <span>{student.classRoom || 'Ensino Secundário'}</span>
                  <span>•</span>
                  <span>{student.course || 'Ciências e Letras'}</span>
                </div>
              </div>
            </div>

            {/* School Info */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right gap-1">
              <CalFexLogo size="sm" showText={false} />
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                {student.schoolName || 'Complexo Escolar CalFéx'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Ano Lectivo: <strong className="text-slate-700 dark:text-slate-300">{student.academicYear || '2025/2026'}</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                Data de Emissão: {new Date().toLocaleDateString('pt-PT')}
              </div>
            </div>

          </div>
        </div>

        {/* Academic Stats Pill Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Média Geral</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-blue-700 dark:text-blue-300 font-heading">
                {summary.generalAverage !== null ? summary.generalAverage.toFixed(1) : '--'}
              </span>
              <span className="text-xs font-semibold text-blue-500">/ 20</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Disciplinas Aprovadas</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-heading mt-0.5">
              {summary.approvedCount} <span className="text-xs font-semibold text-emerald-600">de {summary.totalSubjects}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Em Risco / Deficientes</span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-heading mt-0.5">
              {summary.warningCount + summary.failedCount}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Situação Final</span>
            <div className="text-sm font-extrabold text-purple-700 dark:text-purple-300 mt-1 truncate">
              {summary.finalAcademicStatus}
            </div>
          </div>
        </div>

        {/* Master Pauta Table */}
        {renderGradesTable(false)}

        {/* Official Signatures Section (Visible in Print & Pauta) */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs text-slate-600 dark:text-slate-400">
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 w-36 mx-auto mb-2"></div>
            <span>Assinatura do Aluno(a)</span>
          </div>
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 w-36 mx-auto mb-2"></div>
            <span>Encarregado de Educação</span>
          </div>
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 w-36 mx-auto mb-2"></div>
            <span>A Direcção Pedagógica</span>
          </div>
        </div>

      </div>

      {/* FULLSCREEN WIDE VIEW MODAL: Shows ONLY the pauta table on the entire screen */}
      {isWideMode && (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-md p-4 sm:p-6 flex flex-col animate-in fade-in duration-150 overflow-hidden">
          
          {/* Top Bar for Wide Mode */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Pauta Geral • {student.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Nº {student.orderNumber} • {student.classRoom || 'Ensino Secundário'} • {student.academicYear || '2025/2026'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-75"
                title="Descarregar em PDF"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-300" />
                )}
                <span className="hidden sm:inline">{isDownloading ? 'A gerar...' : 'Descarregar em PDF'}</span>
              </button>
              <button
                onClick={() => setIsWideMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Fechar Vista Ampla</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Table Content */}
          <div className="flex-1 overflow-auto py-4">
            {renderGradesTable(true)}
          </div>
        </div>
      )}

    </div>
  );
};
