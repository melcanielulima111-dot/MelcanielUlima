import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Hash, 
  School, 
  BookOpen, 
  Sparkles, 
  Camera, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  GraduationCap,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { StudentProfile, Gender, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';
import { TermsPolicyModal } from './TermsPolicyModal';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: StudentProfile) => void;
  initialProfile?: StudentProfile | null;
  isFirstTime?: boolean;
  lang?: SupportedLanguage;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProfile,
  isFirstTime = false,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [gender, setGender] = useState<Gender>('masculino');
  const [classRoom, setClassRoom] = useState('');
  const [course, setCourse] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025 / 2026');
  const [targetGrade, setTargetGrade] = useState<number>(14.0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || '');
      setEmail(initialProfile.email || '');
      setOrderNumber(initialProfile.orderNumber || '');
      setGender(initialProfile.gender || 'masculino');
      setClassRoom(initialProfile.classRoom || '');
      setCourse(initialProfile.course || '');
      setSchoolName(initialProfile.schoolName || '');
      setAcademicYear(initialProfile.academicYear || '2025 / 2026');
      setTargetGrade(initialProfile.targetGrade ?? 14.0);
      setAvatarUrl(initialProfile.avatarUrl);
    } else {
      setName('');
      setEmail('');
      setOrderNumber('');
      setGender('masculino');
      setClassRoom('11ª Classe - Turma A');
      setCourse('Ciências Físicas e Biológicas');
      setSchoolName('Complexo Escolar CalFéx');
      setAcademicYear('2025 / 2026');
      setTargetGrade(14.0);
      setAvatarUrl(undefined);
    }
    setAcceptedTerms(true);
    setError(null);
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!orderNumber.trim()) {
      setError('Por favor, informe o seu número de ordem na turma.');
      return;
    }
    if (isFirstTime && !acceptedTerms) {
      setError('É necessário aceitar os Termos de Uso e Políticas de Privacidade para prosseguir.');
      return;
    }

    const updatedProfile: StudentProfile = {
      id: initialProfile?.id || `student-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      orderNumber: orderNumber.trim(),
      gender,
      classRoom: classRoom.trim() || 'Turma A',
      course: course.trim() || 'Geral',
      schoolName: schoolName.trim() || 'Escola Secundária',
      academicYear: academicYear.trim() || '2025/2026',
      avatarUrl,
      targetGrade: Number(targetGrade) || 14.0,
      registeredAt: initialProfile?.registeredAt || new Date().toISOString(),
    };

    onSave(updatedProfile);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-xl my-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-colors">
          
          {/* Modal Header */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
            {!isFirstTime && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                  {isFirstTime ? t.registrationTitle : t.editProfile}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.registrationSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Photo & Avatar Section */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/50 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                    {name ? name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 block mb-1">
                  {t.profilePhoto}
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Aparecerá no cabeçalho e na sua pauta escolar emitida.
                </p>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{avatarUrl ? 'Alterar Imagem' : t.uploadPhoto}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(undefined)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Essential Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.fullName} *</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Melcaniel Ulima"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.email} *</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>

              {/* Número de Ordem */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.orderNumber} *</span>
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Ex: 14"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>

              {/* Género */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.gender} *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['masculino', 'feminino', 'outro'] as Gender[]).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-2 px-2 text-xs font-medium rounded-xl border capitalize transition-all ${
                        gender === g
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20 font-bold'
                          : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {g === 'masculino' ? t.genderMale : g === 'feminino' ? t.genderFemale : t.genderOther}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turma / Classe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t.classRoom}</span>
                </label>
                <input
                  type="text"
                  value={classRoom}
                  onChange={(e) => setClassRoom(e.target.value)}
                  placeholder="Ex: 11ª Classe - Turma A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Curso / Especialidade */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.course}
                </label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Ex: Ciências Físicas e Biológicas"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Escola / Instituição */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t.schoolName}</span>
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Ex: Liceu Nacional CalFéx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Ano Lectivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t.academicYear}</span>
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025 / 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Meta Pessoal (0-20) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.targetGoal} (0 - 20)</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="20"
                  step="0.5"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(parseFloat(e.target.value) || 14.0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Padrão: 14.0 (Dispensa/Bom) ou 10.0 (Aprovação mínima)
                </p>
              </div>

            </div>

            {/* Terms and Policies acceptance */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                />
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-none">
                  <span>Concordo com os </span>
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(true)}
                    className="text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-500"
                  >
                    Termos de Uso e Políticas de Privacidade
                  </button>
                  <span> da CalFéx Pro.</span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              {!isFirstTime && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {t.cancel}
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isFirstTime ? 'Concluir Cadastro & Entrar' : t.saveChanges}</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      <TermsPolicyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </>
  );
};

