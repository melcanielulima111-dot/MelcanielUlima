import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  Check, 
  AlertCircle, 
  Delete, 
  Unlock
} from 'lucide-react';
import { StudentProfile, AppSecuritySettings } from '../types';
import { playSecuritySound } from '../utils/security';
import { CalFexLogo } from './CalFexLogo';

interface AppLockScreenProps {
  student: StudentProfile | null;
  securitySettings: AppSecuritySettings;
  onUnlock: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  student,
  securitySettings,
  onUnlock,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 8) {
      playSecuritySound('key');
      const next = pinInput + val;
      setPinInput(next);
      setErrorMsg(null);

      // Auto-unlock if matching PIN code
      if (securitySettings.pinCode && next === securitySettings.pinCode) {
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

    // Check if matches PIN or master recovery (orderNumber or student email)
    if (
      (securitySettings.pinCode && pinInput === securitySettings.pinCode) ||
      (student && (pinInput === student.orderNumber || pinInput === student.email))
    ) {
      playSecuritySound('success');
      setScanSuccess(true);
      setTimeout(() => {
        onUnlock();
      }, 250);
    } else {
      playSecuritySound('error');
      setErrorMsg('Senha / PIN incorreto. Tente novamente.');
      setPinInput('');
    }
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

        {/* PIN Entry Section */}
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
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[280px] pt-2">
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
            className="w-full max-w-[280px] mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Unlock className="w-4 h-4" />
            <span>Desbloquear App</span>
          </button>

        </div>

      </div>

    </div>
  );
};
