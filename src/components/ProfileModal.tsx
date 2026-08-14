import React, { useRef, useState } from 'react';
import { 
  User, 
  Mail, 
  Hash, 
  School, 
  BookOpen, 
  Calendar, 
  Sparkles, 
  Camera, 
  Edit3, 
  LogOut, 
  X, 
  Award,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { StudentProfile, PautaSummary, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  pautaSummary: PautaSummary;
  onEdit: () => void;
  onLogout: () => void;
  onDeleteAccount?: (studentId: string) => void;
  onUpdateAvatar: (avatarUrl: string | undefined) => void;
  onOpenPauta: () => void;
  lang?: SupportedLanguage;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  pautaSummary,
  onEdit,
  onLogout,
  onDeleteAccount,
  onUpdateAvatar,
  onOpenPauta,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-colors">
        
        {/* Banner Top */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 relative p-4 flex justify-between items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-white border border-white/20">
            {t.individualStudent}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/30 text-white/80 hover:text-white hover:bg-black/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar & Main Info */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative">
          
          {/* Avatar Floating Circle */}
          <div className="flex justify-between items-end -mt-14 mb-4">
            <div className="relative group">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center text-white font-extrabold text-3xl">
                  {getInitials(student.name)}
                </div>
              )}

              {/* Quick photo upload button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title={t.uploadPhoto}
                className="absolute bottom-0 right-0 p-2 rounded-xl bg-blue-600 text-white border-2 border-white dark:border-slate-900 shadow-lg hover:bg-blue-500 transition-transform group-hover:scale-110"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Edit Profile Button */}
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t.editProfile}</span>
            </button>
          </div>

          {/* Student Name & Academic Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                {student.name}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-500/30">
                Nº {student.orderNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{student.email}</span>
              <span>•</span>
              <span className="capitalize">{student.gender}</span>
            </p>
          </div>

          {/* Academic Overview Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <School className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                {t.schoolName}
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-200 mt-1 truncate">
                {student.schoolName || 'Escola Secundária'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                {t.classRoom}
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-200 mt-1 truncate">
                {student.classRoom || 'Não informada'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                {t.course}
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-200 mt-1 truncate">
                {student.course || 'Ensino Geral'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                {t.academicYear}
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-200 mt-1">
                {student.academicYear || '2025/2026'}
              </p>
            </div>
          </div>

          {/* Academic Performance Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {t.overallStatus}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                Meta: {student.targetGrade.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Média Atual</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                  {pautaSummary.generalAverage !== null ? pautaSummary.generalAverage.toFixed(1) : '--'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Aprovadas</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {pautaSummary.approvedCount} / {pautaSummary.totalSubjects}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Em Risco</span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                  {pautaSummary.warningCount + pautaSummary.failedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenPauta();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>{t.viewPauta}</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja sair da conta deste aluno? Seus dados permanecerão salvos localmente.')) {
                    onClose();
                    onLogout();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>

              {onDeleteAccount && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar Conta</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modal de Confirmação Segura de Exclusão de Conta */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-600/70 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Eliminar Conta Permanentemente?
                </h3>
                <p className="text-xs text-rose-300 font-semibold">
                  Ação irreversível de exclusão de dados
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Tem certeza que deseja apagar a conta do aluno <strong className="text-white">{student?.name}</strong>?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Todas as disciplinas e notas dos 3 trimestres serão removidas.</li>
                <li>A pauta escolar e estatísticas de rendimento serão excluídas.</li>
                <li>O histórico de conversas com a IA será limpo.</li>
                <li>Os dados salvos na nuvem e no dispositivo serão apagados.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!student || !onDeleteAccount) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteAccount(student.id);
                    setIsDeleteConfirmOpen(false);
                    onClose();
                  } catch (e) {
                    alert('Erro ao eliminar conta. Tente novamente.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'A eliminar...' : 'Sim, Eliminar Definitivamente'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
