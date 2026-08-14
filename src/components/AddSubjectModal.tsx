import React, { useState } from 'react';
import { X, Plus, BookOpen, User, Sparkles } from 'lucide-react';
import { Subject } from '../types';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newSubject: Subject) => void;
}

const COMMON_SUBJECT_SUGGESTIONS = [
  'Matemática',
  'Língua Portuguesa',
  'Física',
  'Química',
  'Biologia',
  'História',
  'Geografia',
  'Inglês',
  'Francês',
  'Filosofia',
  'Informática / TIC',
  'Educação Física',
  'Educação Visual / DGD',
  'Economia',
  'Sociologia',
  'Direito / Legislação',
];

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [category, setCategory] = useState<Subject['category']>('Ciências');
  const [weight, setWeight] = useState(1);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome da disciplina.');
      return;
    }

    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      name: name.trim(),
      teacher: teacher.trim() || undefined,
      category,
      weight: Number(weight) || 1,
      t1: { p1: null, p2: null, mac: null },
      t2: { p1: null, p2: null, mac: null },
      t3: { p1: null, p2: null, mac: null },
    };

    onAdd(newSub);
    setName('');
    setTeacher('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        <div className="p-6 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                Adicionar Nova Disciplina
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre a disciplina para calcular trimestres e pautas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Nome da Disciplina *</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ex: Matemática"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Suggestions chips */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
              Sugestões Rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {COMMON_SUBJECT_SUGGESTIONS.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setName(sug)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 text-[11px] border border-slate-800 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Professor(a)</span>
              </label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="Ex: Prof. Silva"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Área / Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Subject['category'])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Ciências">Ciências</option>
                <option value="Humanas">Humanas</option>
                <option value="Línguas">Línguas</option>
                <option value="Técnica">Técnica</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Disciplina</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
