import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Check, 
  Calculator, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Subject, QuarterGrades } from '../types';
import { calculateQuarterAverage, getQualitativeLabel } from '../utils/gradeCalculations';

interface SubjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSave: (updated: Subject) => void;
  onDelete: (id: string) => void;
  targetGrade: number;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  isOpen,
  onClose,
  subject,
  onSave,
  onDelete,
  targetGrade,
}) => {
  const [activeQuarterTab, setActiveQuarterTab] = useState<'t1' | 't2' | 't3'>('t1');
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [weight, setWeight] = useState(1);
  const [category, setCategory] = useState<Subject['category']>('Ciências');

  const [t1, setT1] = useState<QuarterGrades>({ p1: null, p2: null, mac: null });
  const [t2, setT2] = useState<QuarterGrades>({ p1: null, p2: null, mac: null });
  const [t3, setT3] = useState<QuarterGrades>({ p1: null, p2: null, mac: null });

  useEffect(() => {
    if (subject) {
      setName(subject.name || '');
      setTeacher(subject.teacher || '');
      setWeight(subject.weight || 1);
      setCategory(subject.category || 'Ciências');
      setT1(subject.t1 || { p1: null, p2: null, mac: null });
      setT2(subject.t2 || { p1: null, p2: null, mac: null });
      setT3(subject.t3 || { p1: null, p2: null, mac: null });
    }
  }, [subject, isOpen]);

  if (!isOpen || !subject) return null;

  const mt1 = calculateQuarterAverage(t1);
  const mt2 = calculateQuarterAverage(t2);
  const mt3 = calculateQuarterAverage(t3);

  const activeTrims = [mt1, mt2, mt3].filter((x): x is number => x !== null);
  const mfd = activeTrims.length > 0 
    ? Math.round((activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length) * 10) / 10 
    : null;

  // Calculate needed T3 for pass (10) or target
  let neededT3For10: number | null = null;
  let neededT3ForTarget: number | null = null;
  if (mt1 !== null && mt2 !== null && mt3 === null) {
    neededT3For10 = Math.max(0, Math.round((10 * 3 - (mt1 + mt2)) * 10) / 10);
    neededT3ForTarget = Math.max(0, Math.round((targetGrade * 3 - (mt1 + mt2)) * 10) / 10);
  }

  const handleQuarterChange = (
    quarter: 't1' | 't2' | 't3',
    field: 'p1' | 'p2' | 'mac' | 'manualMt',
    val: string
  ) => {
    const num = val === '' ? null : Math.min(20, Math.max(0, parseFloat(val)));
    const updater = quarter === 't1' ? setT1 : quarter === 't2' ? setT2 : setT3;

    updater(prev => ({
      ...prev,
      [field]: isNaN(num as number) ? null : num,
    }));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const updated: Subject = {
      ...subject,
      name: name.trim(),
      teacher: teacher.trim() || undefined,
      weight: Number(weight) || 1,
      category,
      t1,
      t2,
      t3,
    };
    onSave(updated);
    onClose();
  };

  const currentQuarterState = activeQuarterTab === 't1' ? t1 : activeQuarterTab === 't2' ? t2 : t3;
  const currentMt = activeQuarterTab === 't1' ? mt1 : activeQuarterTab === 't2' ? mt2 : mt3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-heading">
                Editar Disciplina & Notas
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lance as notas do 1º, 2º e 3º Trimestres (P1, P2 e MAC).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Subject Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Nome da Disciplina *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Matemática"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Professor(a)
              </label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="Ex: Prof. Silva"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Área / Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Subject['category'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Ciências">Ciências</option>
                <option value="Humanas">Humanas</option>
                <option value="Línguas">Línguas</option>
                <option value="Técnica">Técnica</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
          </div>

          {/* Quarter Switch Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Lançamento por Trimestre
              </span>
              <span className="text-xs text-slate-400">
                Fórmula padrão: (P1 + P2 + MAC) ÷ 3
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 't1', label: '1º Trimestre (T1)', grade: mt1 },
                { id: 't2', label: '2º Trimestre (T2)', grade: mt2 },
                { id: 't3', label: '3º Trimestre (T3)', grade: mt3 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveQuarterTab(tab.id as 't1' | 't2' | 't3')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    activeQuarterTab === tab.id
                      ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-300">{tab.label}</div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[10px] text-slate-400">Média:</span>
                    <span className={`text-base font-extrabold ${
                      tab.grade === null ? 'text-slate-500' :
                      tab.grade >= 14 ? 'text-emerald-400' :
                      tab.grade >= 10 ? 'text-blue-400' : 'text-rose-400'
                    }`}>
                      {tab.grade !== null ? tab.grade.toFixed(1) : '--'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Quarter Grade Inputs Box */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Notas do {activeQuarterTab.toUpperCase()} (0 a 20)
              </span>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 mr-2">Média deste Trimestre:</span>
                <span className={`font-extrabold text-lg ${
                  currentMt === null ? 'text-slate-500' :
                  currentMt >= 14 ? 'text-emerald-400' :
                  currentMt >= 10 ? 'text-blue-400' : 'text-rose-400'
                }`}>
                  {currentMt !== null ? currentMt.toFixed(1) : 'Sem notas'}
                </span>
              </div>
            </div>

            {/* Inputs: P1, P2, MAC */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1ª Prova (P1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="0.0"
                  value={currentQuarterState.p1 ?? ''}
                  onChange={(e) => handleQuarterChange(activeQuarterTab, 'p1', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-center text-base focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  2ª Prova (P2)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="0.0"
                  value={currentQuarterState.p2 ?? ''}
                  onChange={(e) => handleQuarterChange(activeQuarterTab, 'p2', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-center text-base focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Av. Contínua (MAC)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="0.0"
                  value={currentQuarterState.mac ?? ''}
                  onChange={(e) => handleQuarterChange(activeQuarterTab, 'mac', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-center text-base focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Helper / Presets for this quarter */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span>Classificação do Trimestre:</span>
              <span className="font-semibold text-slate-200">
                {getQualitativeLabel(currentMt)}
              </span>
            </div>
          </div>

          {/* MFD and Simulation Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-500/20 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-slate-400">
                Média Final da Disciplina (MFD)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  {mfd !== null ? mfd.toFixed(1) : '--'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  mfd === null ? 'bg-slate-800 text-slate-400' :
                  mfd >= 14 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  mfd >= 10 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  mfd >= 7 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {mfd !== null ? getQualitativeLabel(mfd) : 'Sem cálculo'}
                </span>
              </div>
            </div>

            {/* If T3 missing, show simulation */}
            {neededT3For10 !== null && (
              <div className="text-xs bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-slate-300 text-right">
                <div className="flex items-center gap-1.5 justify-end text-amber-400 font-semibold mb-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Meta para o 3º Trimestre:</span>
                </div>
                <p>
                  Para aprovar (10.0): <strong className={neededT3For10 > 20 ? 'text-rose-400' : 'text-white'}>
                    {neededT3For10 > 20 ? 'Impossível (>20)' : `${neededT3For10.toFixed(1)}`}
                  </strong>
                </p>
                {neededT3ForTarget !== null && (
                  <p className="text-[11px] text-slate-400">
                    Para a meta ({targetGrade}): <strong className={neededT3ForTarget > 20 ? 'text-rose-400' : 'text-blue-300'}>
                      {neededT3ForTarget > 20 ? '> 20' : `${neededT3ForTarget.toFixed(1)}`}
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Tem certeza que deseja apagar a disciplina "${subject.name}"?`)) {
                  onDelete(subject.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Apagar Disciplina</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Notas</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
