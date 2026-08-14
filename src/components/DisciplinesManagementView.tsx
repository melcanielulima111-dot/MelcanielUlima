import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  Award, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  User, 
  Sparkles,
  HelpCircle,
  Calendar,
  Clock,
  Bell
} from 'lucide-react';
import { Subject, SubjectCalculated, SupportedLanguage } from '../types';
import { calculateSubject } from '../utils/gradeCalculations';
import { getTranslation } from '../utils/i18n';

interface DisciplinesManagementViewProps {
  subjects: Subject[];
  subjectsCalculated?: SubjectCalculated[];
  onAddSubject?: () => void;
  onOpenAddSubject?: () => void;
  onEditSubjectGrades?: (subjectId: string) => void;
  onEditSubjectInfo?: (subject: Subject) => void;
  onOpenSubjectDetail?: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  onToggleVisibility: (subjectId: string) => void;
  onQuickUpdateQuarterGrade?: (subjectId: string, quarter: 't1' | 't2' | 't3', field: 'p1' | 'p2' | 'mac', value: number | null) => void;
  onOpenSchedule?: () => void;
  targetGrade?: number;
  lang?: SupportedLanguage;
}

export const DisciplinesManagementView: React.FC<DisciplinesManagementViewProps> = ({
  subjects = [],
  subjectsCalculated,
  onAddSubject,
  onOpenAddSubject,
  onEditSubjectGrades,
  onEditSubjectInfo,
  onOpenSubjectDetail,
  onDeleteSubject,
  onToggleVisibility,
  onQuickUpdateQuarterGrade,
  onOpenSchedule,
  targetGrade = 14,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quickEditId, setQuickEditId] = useState<string | null>(null);

  const categories = ['all', 'Ciências', 'Humanas', 'Línguas', 'Técnica', 'Outra'];

  // Map subjects with calculation safely
  const calculatedList = subjectsCalculated && Array.isArray(subjectsCalculated) && subjectsCalculated.length > 0
    ? subjectsCalculated
    : (subjects || []).map(calculateSubject);

  const calculatedMap = new Map<string, SubjectCalculated>();
  calculatedList.forEach((s) => {
    if (s && s.id) {
      calculatedMap.set(s.id, s);
    }
  });

  const handleAddClick = () => {
    if (onOpenAddSubject) onOpenAddSubject();
    else if (onAddSubject) onAddSubject();
  };

  const handleEditClick = (subject: Subject) => {
    if (onOpenSubjectDetail) {
      onOpenSubjectDetail(subject);
    } else if (onEditSubjectGrades) {
      onEditSubjectGrades(subject.id);
    } else if (onEditSubjectInfo) {
      onEditSubjectInfo(subject);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.teacher && s.teacher.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const visibleCount = subjects.filter((s) => !s.hiddenInPauta).length;
  const hiddenCount = subjects.filter((s) => s.hiddenInPauta).length;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Suficiente':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Em Risco':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Reprovado':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getGradeColor = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'text-slate-400 dark:text-slate-500';
    if (val >= 14) return 'text-emerald-600 dark:text-emerald-400 font-bold';
    if (val >= 10) return 'text-blue-600 dark:text-blue-400 font-semibold';
    if (val >= 7) return 'text-amber-600 dark:text-amber-400 font-semibold';
    return 'text-rose-600 dark:text-rose-400 font-bold';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-cyan-900/40 dark:from-blue-950/80 dark:via-indigo-950/60 dark:to-cyan-950/80 border border-blue-200 dark:border-blue-800/60 shadow-lg shadow-blue-500/5 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
                {t.disciplinesTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {t.disciplinesSubtitle}
            </p>
          </div>

          {/* Action Buttons: Schedule & Add */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenSchedule && (
              <button
                onClick={onOpenSchedule}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
              >
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Horário & Notificações</span>
              </button>
            )}
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addDiscipline}</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-blue-200/60 dark:border-blue-800/40">
          <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total de Disciplinas</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">{subjects.length}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{t.visibleInPauta}</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{visibleCount}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{t.hiddenInPauta}</span>
            <span className="text-base font-extrabold text-slate-600 dark:text-slate-400">{hiddenCount}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Escala de Notas</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">0 - 20 V</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar disciplina ou professor..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cat === 'all' ? t.allCategories : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Disciplines Cards Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhuma disciplina encontrada</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'Tente alterar os termos da busca.' : 'Adicione suas disciplinas curriculares para começar a lançar notas do T1, T2 e T3.'}
          </p>
          <button
            onClick={handleAddClick}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Disciplina</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSubjects.map((subject) => {
            const calc = calculatedMap.get(subject.id);
            const isVisible = !subject.hiddenInPauta;
            const isEditing = quickEditId === subject.id;

            return (
              <div
                key={subject.id}
                className={`rounded-2xl p-4 sm:p-5 transition-all border ${
                  isVisible
                    ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md dark:hover:border-slate-700'
                    : 'bg-slate-50/80 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800/80 opacity-75'
                }`}
              >
                {/* Header of card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                      isVisible 
                        ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {subject.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {subject.name}
                        </h3>
                        {subject.category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {subject.category}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                          Peso: {subject.weight || 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3" />
                        <span>Prof: {subject.teacher || 'Não atribuído'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions & Visibility Switch */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    
                    {/* Toggle Visibility Button */}
                    <button
                      onClick={() => onToggleVisibility(subject.id)}
                      title={isVisible ? "Ocultar da Pauta Escolar" : "Mostrar na Pauta Escolar"}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                        isVisible
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isVisible ? t.visibleInPauta : t.hiddenInPauta}</span>
                    </button>

                    {/* Edit Grades Modal Button */}
                    <button
                      onClick={() => handleEditClick(subject)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/20 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t.edit} Notas</span>
                    </button>

                    {/* Edit Info Button */}
                    <button
                      onClick={() => handleEditClick(subject)}
                      title="Editar Dados da Disciplina"
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteSubject(subject.id)}
                      title={t.deleteDiscipline}
                      className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grade breakdown for 3 Quarters & Final */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3.5">
                  
                  {/* Trimestre 1 */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">1º Trimestre</span>
                      <span className={`text-xs ${getGradeColor(calc?.mt1)}`}>
                        MT1: {calc?.mt1 !== null ? calc?.mt1.toFixed(1) : '--'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-slate-500 dark:text-slate-400">
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">P1</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t1.p1 ?? '--'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">P2</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t1.p2 ?? '--'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">MAC</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t1.mac ?? '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trimestre 2 */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">2º Trimestre</span>
                      <span className={`text-xs ${getGradeColor(calc?.mt2)}`}>
                        MT2: {calc?.mt2 !== null ? calc?.mt2.toFixed(1) : '--'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-slate-500 dark:text-slate-400">
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">P1</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t2.p1 ?? '--'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">P2</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t2.p2 ?? '--'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">MAC</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t2.mac ?? '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trimestre 3 */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">3º Trimestre</span>
                      <span className={`text-xs ${getGradeColor(calc?.mt3)}`}>
                        MT3: {calc?.mt3 !== null ? calc?.mt3.toFixed(1) : '--'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-slate-500 dark:text-slate-400">
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">P1</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t3.p1 ?? '--'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">P2</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t3.p2 ?? '--'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                        <span className="block text-[9px] text-slate-400">MAC</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{subject.t3.mac ?? '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Média Final da Disciplina (MFD) & Status */}
                  <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200">Média Final</span>
                      <span className={`text-sm font-extrabold ${getGradeColor(calc?.mfd)}`}>
                        {calc?.mfd !== null ? `${calc?.mfd.toFixed(1)}/20` : '--'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(calc?.status)}`}>
                        {calc?.status || 'Pendente'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {calc?.qualitative || ''}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
