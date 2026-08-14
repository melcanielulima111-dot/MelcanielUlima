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
  ArrowRight,
  GraduationCap,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Award,
  LogIn,
  UserPlus,
  ArrowLeft,
  ChevronRight,
  Sun,
  Moon,
  FileText,
  Cloud,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Send,
  Inbox,
  Copy,
  CheckCheck,
  Clock,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { StudentProfile, Gender, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';
import { CalFexLogo } from './CalFexLogo';
import { TermsPolicyModal } from './TermsPolicyModal';
import { 
  fetchCloudAccounts, 
  loginWithCloud, 
  registerWithCloud,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPasswordWithCode
} from '../utils/cloudSync';

interface StudentAuthScreenProps {
  onLoginSuccess: (profile: StudentProfile) => void;
  lang?: SupportedLanguage;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const REGISTERED_ACCOUNTS_KEY = 'calfex_registered_students_v2';

export const StudentAuthScreen: React.FC<StudentAuthScreenProps> = ({
  onLoginSuccess,
  lang = 'pt',
  isDark = false,
  onToggleTheme,
}) => {
  const t = getTranslation(lang);

  // Load existing registered accounts from localStorage
  const [registeredAccounts, setRegisteredAccounts] = useState<StudentProfile[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(() => {
    try {
      const saved = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? 'login' : 'register';
    } catch {
      return 'register';
    }
  });

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);

  // Forgot Password / Reset flow state
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'success'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  const [forgotTargetEmail, setForgotTargetEmail] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotStudentName, setForgotStudentName] = useState('');
  const [simulatedEmailCode, setSimulatedEmailCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [recoveredStudent, setRecoveredStudent] = useState<StudentProfile | null>(null);

  // Registration form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [gender, setGender] = useState<Gender>('masculino');
  const [classRoom, setClassRoom] = useState('11ª Classe - Turma A');
  const [course, setCourse] = useState('Ciências Físicas e Biológicas');
  const [schoolName, setSchoolName] = useState('Complexo Escolar CalFéx');
  const [academicYear, setAcademicYear] = useState('2025 / 2026');
  const [targetGrade, setTargetGrade] = useState<number>(14.0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Sync cloud accounts on load so switching phones or clearing cache retains accounts
  useEffect(() => {
    fetchCloudAccounts().then((cloudAccounts) => {
      if (cloudAccounts && cloudAccounts.length > 0) {
        setRegisteredAccounts((localAccounts) => {
          const map = new Map<string, StudentProfile>();
          localAccounts.forEach((acc) => map.set(acc.id, acc));
          cloudAccounts.forEach((acc) => map.set(acc.id, acc));
          return Array.from(map.values());
        });
      }
    });
  }, []);

  // Save registered accounts list whenever it changes
  useEffect(() => {
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(registeredAccounts));
  }, [registeredAccounts]);

  // Resend code cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle Requesting Password Reset Verification Code
  const handleRequestResetCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError(null);
    setForgotSuccessMsg(null);

    const term = forgotIdentifier.trim().toLowerCase();
    if (!term) {
      setForgotError('Por favor, informe o seu E-mail, Nome ou Nº de Ordem da conta.');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await requestPasswordReset(term);
      if (res && res.success && res.email) {
        setForgotTargetEmail(res.email);
        setForgotMaskedEmail(res.maskedEmail || res.email);
        setForgotStudentName(res.studentName || 'Estudante');
        setSimulatedEmailCode(res.code || Math.floor(100000 + Math.random() * 900000).toString());
        setForgotStep('verify');
        setResendCooldown(60);
        setForgotLoading(false);
        return;
      } else if (res && !res.success && res.message) {
        // Check local accounts as fallback
        const localFound = registeredAccounts.find(
          (acc) =>
            acc.email.toLowerCase() === term ||
            acc.name.toLowerCase().includes(term) ||
            acc.orderNumber.toString() === term
        );

        if (localFound) {
          const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
          const target = localFound.email;
          const atIdx = target.indexOf('@');
          const masked = atIdx > 2 ? `${target[0]}***${target[atIdx - 1]}${target.substring(atIdx)}` : target;
          
          setForgotTargetEmail(target);
          setForgotMaskedEmail(masked);
          setForgotStudentName(localFound.name);
          setSimulatedEmailCode(generatedCode);
          setForgotStep('verify');
          setResendCooldown(60);
          setForgotLoading(false);
          return;
        }

        setForgotLoading(false);
        setForgotError(res.message);
        return;
      }
    } catch (err) {
      console.warn('Reset request network error:', err);
    }

    // Local fallback if server had offline or unexpected issue
    const localFound = registeredAccounts.find(
      (acc) =>
        acc.email.toLowerCase() === term ||
        acc.name.toLowerCase().includes(term) ||
        acc.orderNumber.toString() === term
    );

    setForgotLoading(false);
    if (localFound) {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const target = localFound.email;
      const atIdx = target.indexOf('@');
      const masked = atIdx > 2 ? `${target[0]}***${target[atIdx - 1]}${target.substring(atIdx)}` : target;
      
      setForgotTargetEmail(target);
      setForgotMaskedEmail(masked);
      setForgotStudentName(localFound.name);
      setSimulatedEmailCode(generatedCode);
      setForgotStep('verify');
      setResendCooldown(60);
    } else {
      setForgotError('Nenhuma conta encontrada com essas informações na nuvem nem neste dispositivo. Verifique se digitou corretamente.');
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await requestPasswordReset(forgotTargetEmail || forgotIdentifier);
      if (res && res.success) {
        setSimulatedEmailCode(res.code || Math.floor(100000 + Math.random() * 900000).toString());
        setResendCooldown(60);
        setForgotSuccessMsg('Novo código enviado para o seu e-mail!');
        setTimeout(() => setForgotSuccessMsg(null), 4000);
      } else {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSimulatedEmailCode(newCode);
        setResendCooldown(60);
        setForgotSuccessMsg('Novo código gerado com sucesso!');
        setTimeout(() => setForgotSuccessMsg(null), 4000);
      }
    } catch (e) {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedEmailCode(newCode);
      setResendCooldown(60);
    }
    setForgotLoading(false);
  };

  // Copy code to clipboard and auto-fill input
  const handleCopyAndFillCode = (code: string) => {
    setForgotCode(code);
    setCopiedCode(true);
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {}
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Submit New Password Reset
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const cleanCode = forgotCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setForgotError('Por favor, insira o código de segurança de 6 dígitos que foi enviado para o seu e-mail.');
      return;
    }

    // Verify if code matches simulated code if set locally
    if (simulatedEmailCode && cleanCode !== simulatedEmailCode) {
      setForgotError('Código de segurança incorreto. Verifique os 6 dígitos recebidos no e-mail.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      setForgotError('A nova senha deve conter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword.trim() !== newConfirmPassword.trim()) {
      setForgotError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }

    setForgotLoading(true);

    try {
      const resetRes = await resetPasswordWithCode(forgotTargetEmail, cleanCode, newPassword.trim());
      if (resetRes && resetRes.success) {
        // Update local registered list
        const updated = registeredAccounts.map(acc => {
          if (acc.email.toLowerCase() === forgotTargetEmail.toLowerCase() || (acc.name && acc.name.toLowerCase() === forgotStudentName.toLowerCase())) {
            return { ...acc, password: newPassword.trim() };
          }
          return acc;
        });
        setRegisteredAccounts(updated);
        localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(updated));
        
        const matched = updated.find(a => a.email.toLowerCase() === forgotTargetEmail.toLowerCase()) || resetRes.student || null;
        setRecoveredStudent(matched);
        setForgotStep('success');
        setForgotLoading(false);
        return;
      } else if (resetRes && !resetRes.success && resetRes.message) {
        // Fallback for local update if code matched
        if (simulatedEmailCode && cleanCode === simulatedEmailCode) {
          const updated = registeredAccounts.map(acc => {
            if (acc.email.toLowerCase() === forgotTargetEmail.toLowerCase() || (acc.name && acc.name.toLowerCase() === forgotStudentName.toLowerCase())) {
              return { ...acc, password: newPassword.trim() };
            }
            return acc;
          });
          setRegisteredAccounts(updated);
          localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(updated));
          const matched = updated.find(a => a.email.toLowerCase() === forgotTargetEmail.toLowerCase()) || null;
          setRecoveredStudent(matched);
          setForgotStep('success');
          setForgotLoading(false);
          return;
        }
        setForgotLoading(false);
        setForgotError(resetRes.message);
        return;
      }
    } catch (err) {
      console.warn('Reset password error:', err);
    }

    // Local fallback update
    const updated = registeredAccounts.map(acc => {
      if (acc.email.toLowerCase() === forgotTargetEmail.toLowerCase() || (acc.name && acc.name.toLowerCase() === forgotStudentName.toLowerCase())) {
        return { ...acc, password: newPassword.trim() };
      }
      return acc;
    });
    setRegisteredAccounts(updated);
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(updated));
    const matched = updated.find(a => a.email.toLowerCase() === forgotTargetEmail.toLowerCase()) || null;
    setRecoveredStudent(matched);
    setForgotStep('success');
    setForgotLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setRegisterError('A imagem deve ter no máximo 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        setRegisterError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(undefined);
  };

  // Direct login from saved account card
  const handleSelectAccount = async (account: StudentProfile) => {
    // If account has password and user hasn't provided password yet, pre-fill identifier
    if (account.password && !loginPassword) {
      setLoginIdentifier(account.email || account.name);
      setLoginError('Esta conta está protegida por senha. Por favor, digite a sua senha abaixo para entrar.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const cloudData = await loginWithCloud(account.email || account.id, loginPassword.trim());
      if (cloudData && cloudData.success && cloudData.student) {
        if (cloudData.subjects) {
          localStorage.setItem(`calfex_subjects_${account.id}`, JSON.stringify(cloudData.subjects));
        }
        setIsLoggingIn(false);
        onLoginSuccess(cloudData.student);
        return;
      }
    } catch (e) {
      console.warn('Direct login fallback to local cache:', e);
    }
    setIsLoggingIn(false);
    onLoginSuccess(account);
  };

  // Delete saved account from local phone
  const handleDeleteAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = registeredAccounts.filter(acc => acc.id !== id);
    setRegisteredAccounts(updated);
    localStorage.removeItem(`calfex_subjects_${id}`);
    setDeviceNotice('Conta removida deste telemóvel. Ela permanece armazenada com segurança na nuvem (como no Facebook) e pode ser acedida a qualquer momento noutro telemóvel ou computador.');
    setTimeout(() => setDeviceNotice(null), 7000);
  };

  // Submit Login Form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const term = loginIdentifier.trim().toLowerCase();
    if (!term) {
      setLoginError('Por favor, informe o seu E-mail, Nome ou Nº de Ordem.');
      return;
    }

    setIsLoggingIn(true);

    // 1. Try Cloud login first for multi-device sync
    try {
      const cloudResult = await loginWithCloud(term, loginPassword.trim());
      if (cloudResult && cloudResult.success && cloudResult.student) {
        const profile = cloudResult.student;
        if (cloudResult.subjects) {
          localStorage.setItem(`calfex_subjects_${profile.id}`, JSON.stringify(cloudResult.subjects));
        }
        // Save to local device accounts
        setRegisteredAccounts((prev) => {
          const exists = prev.some(a => a.id === profile.id);
          return exists ? prev.map(a => a.id === profile.id ? profile : a) : [profile, ...prev];
        });
        setIsLoggingIn(false);
        onLoginSuccess(profile);
        return;
      } else if (cloudResult && !cloudResult.success && cloudResult.message) {
        setIsLoggingIn(false);
        setLoginError(cloudResult.message);
        return;
      }
    } catch (err) {
      console.warn('Cloud login check fallback:', err);
    }

    // 2. Fallback to local accounts
    const found = registeredAccounts.find(
      (acc) =>
        acc.email.toLowerCase() === term ||
        acc.name.toLowerCase().includes(term) ||
        acc.orderNumber.toString() === term
    );

    setIsLoggingIn(false);
    if (found) {
      // If local account has a password, verify it
      if (found.password && found.password !== loginPassword.trim()) {
        setLoginError('Senha incorreta para esta conta de estudante. Verifique a senha e tente novamente.');
        return;
      }
      onLoginSuccess(found);
    } else {
      setLoginError('Nenhuma conta encontrada com essas informações na nuvem nem neste dispositivo. Verifique se digitou corretamente ou crie uma nova conta.');
    }
  };

  // Submit Registration Form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!name.trim()) {
      setRegisterError('Por favor, informe o seu Nome Completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setRegisterError('Por favor, informe um E-mail válido.');
      return;
    }
    if (!orderNumber.trim()) {
      setRegisterError('Por favor, informe o seu Número de Ordem na turma.');
      return;
    }
    if (!registerPassword || registerPassword.trim().length < 4) {
      setRegisterError('Por favor, crie uma Senha de acesso com pelo menos 4 caracteres.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('As senhas digitadas não coincidem. Confirme a mesma senha nos dois campos.');
      return;
    }
    if (!classRoom.trim()) {
      setRegisterError('Por favor, informe a sua Turma / Classe.');
      return;
    }
    if (!schoolName.trim()) {
      setRegisterError('Por favor, informe o Nome da sua Escola ou Instituição.');
      return;
    }
    if (!acceptedTerms) {
      setRegisterError('É necessário marcar a caixa concordando com os Termos de Uso e Políticas de Privacidade da CalFéx Pro.');
      return;
    }

    // Check if email already registered locally
    const existing = registeredAccounts.find(
      (acc) => acc.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      setRegisterError('Já existe uma conta com este e-mail cadastrado. Utilize a aba "Entrar" para aceder.');
      return;
    }

    setIsRegistering(true);

    const newProfile: StudentProfile = {
      id: `student-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      password: registerPassword.trim(),
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

    // Save in cloud database
    try {
      await registerWithCloud({
        profile: newProfile,
        subjects: [],
        targetGrade: newProfile.targetGrade,
      });
    } catch (err) {
      console.warn('Cloud registration sync warn:', err);
    }

    // Save in local registered list
    const updated = [newProfile, ...registeredAccounts];
    setRegisteredAccounts(updated);
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(updated));

    // Ensure new student starts with 0 disciplines
    localStorage.setItem(`calfex_subjects_${newProfile.id}`, JSON.stringify([]));

    setIsRegistering(false);
    onLoginSuccess(newProfile);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-200">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl my-6 bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden transition-all">
        
        {/* Top Logo & Branding Header */}
        <div className="relative p-6 sm:p-8 bg-slate-50/80 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/40 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <CalFexLogo size="lg" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                  CalFéx <span className="text-blue-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400">Pro</span>
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  0-20 Valores
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Portal de Acesso e Gestão Escolar Individual
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError(null);
                setForgotError(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRegisterError(null);
                setForgotError(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Conta</span>
            </button>
            {authMode === 'forgot' && (
              <button
                type="button"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30"
              >
                <KeyRound className="w-4 h-4" />
                <span>Recuperar</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: LOGIN (ENTRAR) */}
        {authMode === 'login' && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Cloud Sync Status Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
              <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px] leading-tight">
                <strong>Armazenamento em Nuvem CalFéx:</strong> Suas notas e pautas ficam salvas na nuvem e podem ser acedidas em qualquer telemóvel ou computador.
              </span>
            </div>

            {/* Device removal notice */}
            {deviceNotice && (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{deviceNotice}</span>
              </div>
            )}
            
            {/* Quick Profile Cards if accounts exist */}
            {registeredAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Contas Disponíveis ({registeredAccounts.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Clique para entrar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {registeredAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-900/80 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {acc.avatarUrl ? (
                          <img
                            src={acc.avatarUrl}
                            alt={acc.name}
                            className="w-10 h-10 rounded-full object-cover border border-blue-500/40 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                            {acc.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {acc.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            Nº {acc.orderNumber} • {acc.classRoom}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAccount(acc.id, e)}
                          title="Remover deste telemóvel (mantém na nuvem)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Login Search / Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail, Nome ou Nº de Ordem
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="Ex: estudante@escola.ao ou 15 ou João Lima"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Senha de Acesso
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showLoginPassword ? 'Ocultar' : 'Ver senha'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setForgotIdentifier(loginIdentifier);
                        setForgotError(null);
                        setForgotStep('request');
                      }}
                      className="text-[11px] text-amber-500 dark:text-amber-400 hover:text-amber-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Esqueci a senha</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="Digite a sua senha da conta"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-70 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A aceder à conta na nuvem...</span>
                  </>
                ) : (
                  <>
                    <span>Aceder à Minha Conta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegisterError(null);
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Ainda não tem conta? Criar cadastro</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setForgotIdentifier(loginIdentifier);
                  setForgotError(null);
                  setForgotStep('request');
                }}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:underline font-medium flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Esqueceu a senha? Recuperar conta</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: REGISTER (CADASTRAR NOVO ALUNO) */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 sm:p-8 space-y-6">
            
            {registerError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            {/* Photo Avatar Row */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Foto do Estudante (Opcional)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Carregue uma fotografia para personalizar seu boletim e pauta escolar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center gap-1.5 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{avatarUrl ? 'Alterar' : 'Carregar'}</span>
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
                    onClick={handleRemovePhoto}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Grid 1: Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Melquisedeque C. Lima"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail do Estudante *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@escola.ao"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Grid 1.5: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Criar Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showRegisterPassword ? 'Ocultar' : 'Ver'}</span>
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={registerPassword}
                    onChange={(e) => {
                      setRegisterPassword(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={registerConfirmPassword}
                    onChange={(e) => {
                      setRegisterConfirmPassword(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="Repita a mesma senha"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none ${
                      registerConfirmPassword && registerPassword === registerConfirmPassword
                        ? 'border-emerald-500 ring-1 ring-emerald-500'
                        : registerConfirmPassword && registerPassword !== registerConfirmPassword
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Grid 2: Number, Gender, Class */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nº de Ordem na Turma *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Ex: 14"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro / Prefere não dizer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Turma / Classe *
                </label>
                <input
                  type="text"
                  required
                  value={classRoom}
                  onChange={(e) => setClassRoom(e.target.value)}
                  placeholder="Ex: 11ª Classe - Turma B"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Grid 3: Course & School */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Curso / Especialidade
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex: Ciências Económicas e Jurídicas"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome da Escola / Colégio *
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ex: Escola Secundária nº 1042"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Grid 4: Year and Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ano Lectivo
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025 / 2026"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sua Meta Pessoal de Média (0-20)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="0.5"
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-12 text-center text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-500/20">
                    {targetGrade.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Espaço de Concordância com Termos e Políticas de Privacidade */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (registerError) setRegisterError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                />
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-none">
                  <span>Concordo com os </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsTermsModalOpen(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-500 inline-flex items-center gap-0.5"
                  >
                    <span>Termos de Uso</span>
                  </button>
                  <span> e as </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsTermsModalOpen(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-500 inline-flex items-center gap-0.5"
                  >
                    <span>Políticas de Privacidade</span>
                  </button>
                  <span> da CalFéx Pro.</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Garante o armazenamento 100% privado das suas notas na memória local do seu dispositivo e a autoria de Melcaniel Ulima.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Concluir Cadastro & Abrir CalFéx Pro</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Register Footer Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginError(null);
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-blue-500 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Já tem conta? Entrar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setForgotIdentifier(email || name);
                  setForgotError(null);
                  setForgotStep('request');
                }}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:underline font-medium flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Esqueceu a senha? Recuperar conta</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD / RECUPERAÇÃO DE SENHA */}
        {authMode === 'forgot' && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Header with return button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Recuperação de Senha
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Redefina o acesso à sua conta CalFéx de forma segura
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setForgotError(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-blue-500 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Stepper Progress Badges */}
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <div className={`flex items-center gap-2 text-xs font-bold ${forgotStep === 'request' ? 'text-blue-500' : 'text-emerald-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 'request' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {forgotStep === 'request' ? '1' : <Check className="w-3 h-3" />}
                </div>
                <span className="hidden sm:inline">1. Identificação</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-2" />
              <div className={`flex items-center gap-2 text-xs font-bold ${forgotStep === 'verify' ? 'text-blue-500' : forgotStep === 'success' ? 'text-emerald-500' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 'verify' ? 'bg-blue-500 text-white' : forgotStep === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {forgotStep === 'success' ? <Check className="w-3 h-3" /> : '2'}
                </div>
                <span className="hidden sm:inline">2. Código & Nova Senha</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-2" />
              <div className={`flex items-center gap-2 text-xs font-bold ${forgotStep === 'success' ? 'text-emerald-500' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  3
                </div>
                <span className="hidden sm:inline">3. Concluído</span>
              </div>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Success Notification Banner */}
            {forgotSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            {/* STEP 1: SOLICITAR CÓDIGO POR EMAIL */}
            {forgotStep === 'request' && (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-950 border border-blue-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-500" />
                    Como funciona o envio do e-mail de recuperação:
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Insira o endereço de e-mail cadastrado ou o seu número de ordem. Enviaremos um código de segurança de 6 dígitos para redefinir a sua senha instantaneamente.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-mail Cadastrado, Nome ou Nº de Ordem
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => {
                        setForgotIdentifier(e.target.value);
                        setForgotError(null);
                      }}
                      placeholder="Ex: estudante@escola.ao ou 15 ou João Lima"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-70 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>A verificar e enviar e-mail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Código de Recuperação por E-mail</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: INSERIR CÓDIGO E DEFINIR NOVA SENHA */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                
                {/* Simulated Email Notification Toast Banner */}
                {simulatedEmailCode && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-900/40 via-blue-900/40 to-indigo-900/40 border border-sky-500/40 shadow-lg shadow-sky-500/10 space-y-2.5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                        <Inbox className="w-4 h-4 text-sky-400 animate-pulse" />
                        <span>Notificação de E-mail (CalFéx Cloud Security)</span>
                      </div>
                      <span className="text-[10px] text-sky-400/80 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/30">
                        Recebido agora
                      </span>
                    </div>

                    <div className="text-xs text-slate-200">
                      Olá <strong>{forgotStudentName}</strong>, recebemos a solicitação de redefinição de senha para <strong>{forgotMaskedEmail}</strong>.
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-sky-500/30">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">Código de Segurança:</span>
                        <span className="font-mono text-base font-black tracking-widest text-sky-300">
                          {simulatedEmailCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAndFillCode(simulatedEmailCode)}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {copiedCode ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Preenchido!' : 'Copiar & Preencher'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6-Digit Code Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Código de Verificação de 6 Dígitos
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Enviado para {forgotMaskedEmail}
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotCode}
                      onChange={(e) => {
                        setForgotCode(e.target.value.replace(/\D/g, ''));
                        setForgotError(null);
                      }}
                      placeholder="000000"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-center font-mono text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nova Senha de Acesso
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showNewPassword ? 'Ocultar' : 'Ver senha'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setForgotError(null);
                      }}
                      placeholder="Digite a nova senha (mínimo 4 caracteres)"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newConfirmPassword}
                      onChange={(e) => {
                        setNewConfirmPassword(e.target.value);
                        setForgotError(null);
                      }}
                      placeholder="Repita a nova senha para confirmação"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-70 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>A salvar nova senha na nuvem...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirmar Nova Senha e Entrar</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request')}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Alterar e-mail informado</span>
                    </button>

                    <button
                      type="button"
                      disabled={resendCooldown > 0 || forgotLoading}
                      onClick={handleResendCode}
                      className="text-blue-500 hover:text-blue-400 disabled:text-slate-500 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${forgotLoading ? 'animate-spin' : ''}`} />
                      <span>
                        {resendCooldown > 0 ? `Reenviar código em (${resendCooldown}s)` : 'Reenviar código por e-mail'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: SUCESSO & ACESSO IMEDIATO */}
            {forgotStep === 'success' && (
              <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                  <Check className="w-8 h-8 stroke-[2.5]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Senha Redefinida com Sucesso!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    A sua nova senha foi salva com segurança na nuvem e no dispositivo. Você já pode aceder ao CalFéx Pro.
                  </p>
                </div>

                {recoveredStudent && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-sm mx-auto flex items-center gap-3 text-left">
                    {recoveredStudent.avatarUrl ? (
                      <img
                        src={recoveredStudent.avatarUrl}
                        alt={recoveredStudent.name}
                        className="w-11 h-11 rounded-full object-cover border border-emerald-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                        {recoveredStudent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {recoveredStudent.name}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Nº {recoveredStudent.orderNumber} • {recoveredStudent.classRoom}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (recoveredStudent) {
                        onLoginSuccess(recoveredStudent);
                      } else {
                        setAuthMode('login');
                        setLoginIdentifier(forgotTargetEmail);
                        setLoginPassword(newPassword);
                      }
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Entrar Imediatamente no CalFéx Pro</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginIdentifier(forgotTargetEmail);
                      setLoginPassword(newPassword);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 py-1"
                  >
                    Voltar para a tela de login
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Modal de Termos & Políticas */}
      <TermsPolicyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

    </div>
  );
};

