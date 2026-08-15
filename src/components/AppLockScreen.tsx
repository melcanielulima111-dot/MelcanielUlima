import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  KeyRound, 
  Check, 
  AlertCircle, 
  Delete, 
  Unlock,
  Mail,
  Send,
  Loader2,
  Inbox,
  Copy,
  CheckCheck,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { StudentProfile, AppSecuritySettings } from '../types';
import { playSecuritySound, saveSecuritySettings } from '../utils/security';
import { CalFexLogo } from './CalFexLogo';
import { requestPasswordReset, resetPasswordWithCode } from '../utils/cloudSync';

interface AppLockScreenProps {
  student: StudentProfile | null;
  securitySettings: AppSecuritySettings;
  onUnlock: () => void;
  onUpdateSecuritySettings?: (settings: AppSecuritySettings) => void;
  onLogout?: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  student,
  securitySettings,
  onUnlock,
  onUpdateSecuritySettings,
  onLogout,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Recovery flow states: 'lock' | 'forgot-request' | 'forgot-verify' | 'forgot-success'
  const [viewMode, setViewMode] = useState<'lock' | 'forgot-request' | 'forgot-verify' | 'forgot-success'>('lock');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessBanner, setForgotSuccessBanner] = useState<string | null>(null);

  const [targetEmail, setTargetEmail] = useState(student?.email || '');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [enteredCode, setEnteredCode] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 8) {
      playSecuritySound('key');
      const next = pinInput + val;
      setPinInput(next);
      setErrorMsg(null);

      // Auto-unlock if matching PIN code or student password
      if (
        (securitySettings.pinCode && next === securitySettings.pinCode) ||
        (student?.password && next === student.password)
      ) {
        playSecuritySound('success');
        setScanSuccess(true);
        setTimeout(() => {
          onUnlock();
        }, 220);
      }
    }
  };

  const handleBackspace = () => {
    playSecuritySound('key');
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    playSecuritySound('key');
    setPinInput('');
    setErrorMsg(null);
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!pinInput.trim()) {
      playSecuritySound('error');
      setErrorMsg('Digite a senha ou PIN cadastrado.');
      return;
    }

    // Check if matches PIN, student password, orderNumber or student email
    if (
      (securitySettings.pinCode && pinInput === securitySettings.pinCode) ||
      (student?.password && pinInput === student.password) ||
      (student && (pinInput === student.orderNumber || pinInput === student.email))
    ) {
      playSecuritySound('success');
      setScanSuccess(true);
      setTimeout(() => {
        onUnlock();
      }, 250);
    } else {
      playSecuritySound('error');
      setErrorMsg('Senha / PIN incorreto. Tente novamente ou recupere o acesso abaixo.');
      setPinInput('');
    }
  };

  // Trigger forgot password code sending
  const handleSendResetEmail = async () => {
    setForgotError(null);
    setForgotLoading(true);

    const identifier = targetEmail.trim() || student?.email || student?.name || student?.orderNumber || '';
    if (!identifier) {
      setForgotError('Nenhum e-mail ou identificador encontrado para esta conta.');
      setForgotLoading(false);
      return;
    }

    try {
      const res = await requestPasswordReset(identifier);
      if (res && res.success) {
        const dest = res.email || targetEmail || student?.email || '';
        setTargetEmail(dest);
        setMaskedEmail(res.maskedEmail || dest);
        setViewMode('forgot-verify');
        setResendCooldown(65);
        setForgotLoading(false);

        if (res.emailSent) {
          console.log('[CALFÉX LOCK SCREEN] ✅ Código de 6 dígitos enviado por e-mail para:', dest);
        } else {
          console.warn('[CALFÉX LOCK SCREEN] ⚠️ Envio via SMTP pendente:', res.emailReason || res.message);
          setForgotError(res.message || 'Código gerado, verifique as configurações de SMTP no servidor.');
        }
        return;
      } else if (res && !res.success && res.message) {
        setForgotLoading(false);
        setForgotError(res.message);
        return;
      }
    } catch (err) {
      console.warn('Reset request error:', err);
    }

    // Local fallback
    const cleanMail = targetEmail || student?.email || `${(student?.name || 'estudante').toLowerCase().replace(/\s+/g, '')}@calfex.ao`;
    const atIdx = cleanMail.indexOf('@');
    const masked = atIdx > 2 ? `${cleanMail[0]}***${cleanMail[atIdx - 1]}${cleanMail.substring(atIdx)}` : cleanMail;

    setTargetEmail(cleanMail);
    setMaskedEmail(masked);
    setViewMode('forgot-verify');
    setResendCooldown(65);
    setForgotLoading(false);
  };

  // Submit code and set new PIN / password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const cleanCode = enteredCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setForgotError('Insira o código de segurança de 6 dígitos recebido no seu e-mail.');
      return;
    }

    if (!newPinCode || newPinCode.trim().length < 4) {
      setForgotError('O novo PIN / Senha deve ter no mínimo 4 dígitos ou caracteres.');
      return;
    }

    if (newPinCode.trim() !== confirmNewPin.trim()) {
      setForgotError('As senhas não coincidem. Digite o mesmo PIN nos dois campos.');
      return;
    }

    setForgotLoading(true);

    try {
      await resetPasswordWithCode(targetEmail, cleanCode, newPinCode.trim());
    } catch (err) {
      console.warn('Reset error on cloud, applying locally:', err);
    }

    // Update local security settings
    const updatedSec: AppSecuritySettings = {
      mode: 'pin',
      pinCode: newPinCode.trim()
    };
    saveSecuritySettings(updatedSec);
    if (onUpdateSecuritySettings) {
      onUpdateSecuritySettings(updatedSec);
    }

    // Update student in local storage if present
    if (student) {
      const updatedStudent = { ...student, password: newPinCode.trim() };
      localStorage.setItem('calfex_active_student', JSON.stringify(updatedStudent));
      
      const regRaw = localStorage.getItem('calfex_registered_students');
      if (regRaw) {
        try {
          const regArr = JSON.parse(regRaw);
          const nextArr = regArr.map((a: StudentProfile) => a.id === student.id ? { ...a, password: newPinCode.trim() } : a);
          localStorage.setItem('calfex_registered_students', JSON.stringify(nextArr));
        } catch (e) {}
      }
    }

    playSecuritySound('success');
    setForgotLoading(false);
    setViewMode('forgot-success');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-blue-600">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* CalFex Logo */}
        <div className="mb-4">
          <CalFexLogo size="md" showText={true} />
        </div>

        {/* Student Avatar & Name */}
        <div className="flex flex-col items-center mb-6">
          {student?.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-lg shadow-blue-500/20 mb-2.5"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-500/25 mb-2.5">
              {student?.name?.charAt(0).toUpperCase() || 'E'}
            </div>
          )}

          <h2 className="text-lg font-bold text-white font-heading">
            {student?.name || 'Estudante CalFéx'}
          </h2>
          <p className="text-xs text-slate-400">
            {student?.schoolName || 'Complexo Escolar CalFéx'} • {student?.classRoom || 'Pauta Protegida'}
          </p>
        </div>

        {/* 1. STANDARD LOCK SCREEN VIEW */}
        {viewMode === 'lock' && (
          <div className="w-full flex flex-col items-center space-y-4">
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span>Digite a sua Senha ou PIN de Acesso</span>
            </div>

            {/* Masked PIN Display Dots */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      scanSuccess
                        ? 'bg-emerald-500 border-emerald-400 scale-110 shadow-sm shadow-emerald-500'
                        : isFilled
                        ? 'bg-blue-500 border-blue-400 scale-110 shadow-sm shadow-blue-500'
                        : 'border-slate-700 bg-slate-800/60'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[280px] pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center shadow-sm"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-lg border border-slate-700 transition-all flex items-center justify-center shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center"
                title="Apagar último dígito"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Verify PIN Button */}
            <button
              type="button"
              onClick={() => handleVerifyPin()}
              className="w-full max-w-[280px] mt-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Desbloquear App</span>
            </button>

            {/* FOOTER ACTIONS: FORGOT PASSWORD & SWITCH ACCOUNT */}
            <div className="w-full max-w-[280px] pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setViewMode('forgot-request');
                }}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center justify-center gap-1.5 py-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Esqueci a Senha / PIN</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 py-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Trocar de Conta / Sair</span>
                </button>
              )}
            </div>

          </div>
        )}

        {/* 2. FORGOT PASSWORD STEP 1: REQUEST CODE */}
        {viewMode === 'forgot-request' && (
          <div className="w-full space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recuperar Senha / PIN</h3>
                  <p className="text-[11px] text-slate-400">Redefina o código de segurança do app</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('lock')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Voltar</span>
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                Envio do Código de Desbloqueio
              </p>
              <p className="text-[11px] text-slate-400">
                Enviaremos um código de 6 dígitos para o e-mail cadastrado nesta conta para permitir a criação de um novo PIN/Senha.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="estudante@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={forgotLoading}
              onClick={handleSendResetEmail}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {forgotLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A enviar código por e-mail...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Código por E-mail</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 3. FORGOT PASSWORD STEP 2: VERIFY CODE & NEW PIN */}
        {viewMode === 'forgot-verify' && (
          <form onSubmit={handleConfirmReset} className="w-full space-y-3.5 text-left animate-in fade-in">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Definir Novo PIN / Senha</h3>
                  <p className="text-[10px] text-slate-400">Enviado para {maskedEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('forgot-request')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Professional Email Instructions Card */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                  <Mail className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span>Código enviado por E-mail</span>
                </div>
                <span className="text-[10px] text-blue-300 font-semibold bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {maskedEmail}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Por favor, <strong>abra o seu e-mail (Gmail, Outlook, etc.)</strong>, localize a mensagem de <strong>calfex39@gmail.com</strong>, copie o código de 6 dígitos que enviamos e cole-o abaixo para definir o seu novo PIN.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Remetente: <strong className="text-blue-400">calfex39@gmail.com</strong> (verifique o Spam se necessário).</span>
              </div>
            </div>

            {forgotError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* 6-Digit Code Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Código de 6 Dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={enteredCode}
                onChange={(e) => {
                  setEnteredCode(e.target.value.replace(/\D/g, ''));
                  setForgotError(null);
                }}
                placeholder="000000"
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold tracking-widest text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* New PIN Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  Novo PIN / Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  {showNewPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showNewPin ? 'Ocultar' : 'Ver'}</span>
                </button>
              </div>
              <input
                type={showNewPin ? 'text' : 'password'}
                required
                value={newPinCode}
                onChange={(e) => {
                  setNewPinCode(e.target.value);
                  setForgotError(null);
                }}
                placeholder="Digite o novo PIN de desbloqueio"
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Confirm New PIN */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Confirmar Novo PIN
              </label>
              <input
                type={showNewPin ? 'text' : 'password'}
                required
                value={confirmNewPin}
                onChange={(e) => {
                  setConfirmNewPin(e.target.value);
                  setForgotError(null);
                }}
                placeholder="Repita o novo PIN"
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-1"
            >
              {forgotLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A salvar novo PIN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Novo PIN e Desbloquear</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                disabled={resendCooldown > 0 || forgotLoading}
                onClick={handleSendResetEmail}
                className="text-[11px] text-blue-400 hover:text-blue-300 disabled:text-slate-500 flex items-center gap-1 font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${forgotLoading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código por e-mail'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* 4. FORGOT PASSWORD STEP 3: SUCCESS & AUTO-UNLOCK */}
        {viewMode === 'forgot-success' && (
          <div className="w-full space-y-4 text-center py-2 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">
                Senha / PIN Redefinido!
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                O seu novo código de segurança foi salvo e a sua aplicação já está pronta para uso.
              </p>
            </div>

            <button
              type="button"
              onClick={onUnlock}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>Aceder ao CalFéx Pro Agora</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

