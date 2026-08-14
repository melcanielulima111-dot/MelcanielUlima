import React, { useState } from 'react';
import { X, Calculator, Sparkles } from 'lucide-react';
import { getQualitativeLabel } from '../utils/gradeCalculations';

interface QuickCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorModal: React.FC<QuickCalculatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [mac, setMac] = useState('');
  const [result, setResult] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const p1n = parseFloat(p1) || 0;
    const p2n = parseFloat(p2) || 0;
    const macn = parseFloat(mac) || 0;
    const avg = (p1n + p2n + macn) / 3;
    setResult(Math.round(avg * 10) / 10);
  };

  const handleReset = () => {
    setP1('');
    setP2('');
    setMac('');
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        <div className="p-6 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                Calculadora Rápida 0-20
              </h2>
              <p className="text-xs text-slate-400">
                Fórmula: (P1 + P2 + MAC) ÷ 3
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

        <form onSubmit={handleCalculate} className="p-6 space-y-4">
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">P1 (0-20)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                required
                placeholder="14"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-center focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">P2 (0-20)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                required
                placeholder="15"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-center focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">MAC (0-20)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                required
                placeholder="16"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-center focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              Calcular Média
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2.5 rounded-xl bg-slate-950 text-slate-400 hover:text-white text-xs border border-slate-800"
            >
              Limpar
            </button>
          </div>

          {result !== null && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center animate-in zoom-in-95 duration-150">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Média Calculada
              </span>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
                {result.toFixed(1)}
              </div>
              <span className={`inline-block mt-2 px-3 py-0.5 rounded-md text-xs font-bold ${
                result >= 14 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                result >= 10 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {getQualitativeLabel(result)}
              </span>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};
