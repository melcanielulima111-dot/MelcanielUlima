import React, { useState } from 'react';
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
  ArrowRight,
  GraduationCap,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Award
} from 'lucide-react';
import { StudentProfile, Gender, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';

interface StudentRegistrationScreenProps {
  onCompleteRegistration: (profile: StudentProfile) => void;
  lang?: SupportedLanguage;
}

export const StudentRegistrationScreen: React.FC<StudentRegistrationScreenProps> = ({
  onCompleteRegistration,
  lang = 'pt',
}) => {
  const t = getTranslation(lang);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [gender, setGender] = useState<Gender>('masculino');
  const [classRoom, setClassRoom] = useState('11ª Classe - Turma A');
  const [course, setCourse] = useState('Ciências Físicas e Biológicas');
  const [schoolName, setSchoolName] = useState('Complexo Escolar CalFéx');
  const [academicYear, setAcademicYear] = useState('2025 / 2026');
  const [targetGrade, setTargetGrade] = useState<number>(14.0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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

  const handleRemovePhoto = () => {
    setAvatarUrl(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Por favor, informe o seu Nome Completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um E-mail válido.');
      return;
    }
    if (!orderNumber.trim()) {
      setError('Por favor, informe o seu Número de Ordem na turma.');
      return;
    }
    if (!classRoom.trim()) {
      setError('Por favor, informe a sua Turma / Classe.');
      return;
    }
    if (!schoolName.trim()) {
      setError('Por favor, informe o Nome da sua Escola ou Instituição.');
      return;
    }

    const newProfile: StudentProfile = {
      id: `student-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      orderNumber: orderNumber.trim(),
      gender,
      classRoom: classRoom.trim(),
      course: course.trim() || 'Ensino Geral',
      schoolName: schoolName.trim(),
      academicYear: academicYear.trim() || '2025 / 2026',
      avatarUrl,
      targetGrade: Number(targetGrade) || 14.0,
      registeredAt: new Date().toISOString(),
    };

    onCompleteRegistration(newProfile);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl my-6 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all">
        
        {/* Banner Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 shrink-0 border border-blue-400/30">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>CalFéx Pro • Sistema Escolar 0-20</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
                Cadastro do Estudante
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
                Preencha todas as suas informações escolares para inicializar o seu perfil acadêmico e desbloquear a tela inicial.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3 animate-in fade-in duration-150">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto do Estudante"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <label
                htmlFor="reg-screen-avatar"
                className="absolute -bottom-1.5 -right-1.5 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer shadow-lg transition-transform hover:scale-110"
                title="Carregar Foto"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="reg-screen-avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <h4 className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                <span>Fotografia do Perfil</span>
                <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Adicione uma foto para personalizar o boletim e a sua pauta escolar oficial.
              </p>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover Foto
                </button>
              )}
            </div>
          </div>

          {/* Grid of Main Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nome Completo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nome Completo do Estudante <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Melcaniel Ulima"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                E-mail do Estudante <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="estudante@escola.ao"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Nº de Ordem */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nº de Ordem na Turma <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Ex: 14"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Género */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Género <span className="text-rose-400">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 shadow-inner"
              >
                <option value="masculino">Masculino (M)</option>
                <option value="feminino">Feminino (F)</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Turma / Classe */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Turma / Classe <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={classRoom}
                  onChange={(e) => setClassRoom(e.target.value)}
                  placeholder="11ª Classe - Turma A"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Curso / Especialidade */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Curso / Área de Estudos <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Ciências Físicas e Biológicas"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Escola / Instituição */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nome da Escola / Liceu <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Complexo Escolar CalFéx"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Ano Lectivo */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Ano Lectivo <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025 / 2026"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Meta Pessoal (0-20) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Meta Pessoal de Média (0 - 20)</span>
              </label>
              <input
                type="number"
                min="10"
                max="20"
                step="0.5"
                value={targetGrade}
                onChange={(e) => setTargetGrade(parseFloat(e.target.value) || 14.0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 font-bold shadow-inner"
              />
            </div>

          </div>

          {/* Action Submit Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl text-sm sm:text-base font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>Iniciar CalFéx Pro</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Os seus dados são armazenados com total segurança e privacidade.</span>
            </p>
          </div>

        </form>

      </div>
    </div>
  );
};
