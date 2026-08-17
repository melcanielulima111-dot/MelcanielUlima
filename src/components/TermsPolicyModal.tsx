import React from 'react';
import { X, ShieldCheck, FileText, Lock, Heart, CheckCircle2, Award } from 'lucide-react';
import { CalFexLogo } from './CalFexLogo';

interface TermsPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsPolicyModal: React.FC<TermsPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <span>Termos de Uso & Políticas de Privacidade</span>
              </h2>
              <p className="text-xs text-slate-400">
                Calféx • Compromisso com a Transparência e Segurança do Estudante
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          {/* Highlight Badge */}
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm mb-1">
                Privacidade e Armazenamento Seguro
              </h4>
              <p className="text-xs text-slate-400">
                Todas as suas notas, fotografias, perfis e boletins são armazenados de forma segura na nuvem e no dispositivo. A Calféx não comercializa nem transfere seus dados escolares para terceiros.
              </p>
            </div>
          </div>

          {/* Section 1: Termos de Uso */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm font-heading">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>1. Termos de Uso</span>
            </div>
            <ul className="space-y-2 list-disc list-inside text-slate-400 text-xs pl-1">
              <li>
                <strong>Finalidade Acadêmica:</strong> A aplicação Calféx foi concebida exclusivamente para auxiliar estudantes no acompanhamento, cálculo e previsão de médias escolares na escala de 0 a 20 valores do sistema de ensino de Angola.
              </li>
              <li>
                <strong>Fórmulas Oficiais:</strong> As médias trimestrais obedecem rigorosamente à regra $MT = (P1 + P2 + MAC) / 3$ e a Média Final à regra $MFD = (MT1 + MT2 + MT3) / 3$, com suporte a ponderação por pesos de disciplinas.
              </li>
              <li>
                <strong>Responsabilidade do Usuário:</strong> O estudante ou encarregado é responsável por inserir com fidelidade as notas atribuídas pelos seus respectivos professores.
              </li>
              <li>
                <strong>Gratuidade:</strong> A plataforma é livre, sem cobranças ocultas ou publicidade invasiva, criada para promover o sucesso e organização escolar.
              </li>
            </ul>
          </div>

          {/* Section 2: Políticas de Privacidade */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm font-heading">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2. Política de Privacidade e Proteção de Dados</span>
            </div>
            <ul className="space-y-2 list-disc list-inside text-slate-400 text-xs pl-1">
              <li>
                <strong>Armazenamento Seguro:</strong> Não existem servidores externos recolhendo suas informações pessoais sem o seu consentimento. Seus dados residem com segurança no seu telemóvel ou computador.
              </li>
              <li>
                <strong>Cópia de Segurança & Exportação:</strong> Você possui autonomia total para exportar um backup em ficheiro JSON e restaurar quando mudar de aparelho.
              </li>
              <li>
                <strong>Direito de Exclusão:</strong> Pode eliminar sua conta ou disciplinas a qualquer instante através do menu de configurações ou troca de conta.
              </li>
            </ul>
          </div>

          {/* Section 3: Autoria e Direitos Autorais */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Award className="w-4 h-4 text-amber-500" />
                <span>3. Propriedade Intelectual & Desenvolvimento</span>
              </div>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                Angola 🇦🇴
              </span>
            </div>
            <p className="text-xs text-slate-200 font-semibold">
              Criado e concebido por Melcaniel Ulima
            </p>
            <div className="text-[11px] text-slate-400 space-y-0.5">
              <p>Filiação: Inocêncio Ulima e Ana Paula Ulima</p>
              <p className="text-slate-300 font-medium">Paula Fernanda Ulima</p>
              <p>Todos os direitos reservados.</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Termos e Políticas Vigentes</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
          >
            Entendido e Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
