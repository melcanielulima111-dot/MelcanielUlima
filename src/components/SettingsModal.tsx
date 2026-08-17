import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Download, 
  Upload, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Globe, 
  Heart, 
  Layers, 
  LogOut, 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  KeyRound, 
  Unlock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  Trash2, 
  AlertTriangle,
  Cloud,
  RefreshCw,
  Copy
} from 'lucide-react';
import { StudentProfile, Subject, SupportedLanguage, AppSecuritySettings, SecurityLockType } from '../types';
import { SUPPORTED_LANGUAGES, getTranslation } from '../utils/i18n';
import { TermsPolicyModal } from './TermsPolicyModal';
import { getApiUrl } from '../utils/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  subjects: Subject[];
  onRestoreData: (data: { student: StudentProfile; subjects: Subject[] }) => void;
  targetGrade: number;
  onUpdateTargetGrade: (target: number) => void;
  lang: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onLogout: () => void;
  onDeleteAccount?: (studentId: string) => void;
  securitySettings: AppSecuritySettings;
  onUpdateSecuritySettings: (settings: AppSecuritySettings) => void;
  onLockApp?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  student,
  subjects,
  onRestoreData,
  targetGrade,
  onUpdateTargetGrade,
  lang,
  onSelectLanguage,
  onLogout,
  onDeleteAccount,
  securitySettings,
  onUpdateSecuritySettings,
  onLockApp,
}) => {
  const t = getTranslation(lang);
  const [isLanguageListOpen, setIsLanguageListOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase status local state
  const [supabaseInfo, setSupabaseInfo] = useState<{
    connected: boolean;
    tableExists: boolean;
    message?: string;
    sqlSetupScript?: string;
  } | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Security config local state
  const [selectedSecurityMode, setSelectedSecurityMode] = useState<SecurityLockType>(
    securitySettings?.mode === 'pin' ? 'pin' : 'none'
  );
  const [newPin, setNewPin] = useState(securitySettings?.pinCode || '');
  const [confirmPin, setConfirmPin] = useState(securitySettings?.pinCode || '');
  const [showPinText, setShowPinText] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checkSupabaseStatus = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch(getApiUrl('/api/supabase/status'));
      const data = await res.json();
      setSupabaseInfo(data);
    } catch (e) {
      console.warn('Error fetching Supabase status in modal:', e);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkSupabaseStatus();
    }
  }, [isOpen]);

  const handleCopySupabaseSql = () => {
    const sql = supabaseInfo?.sqlSetupScript || `
CREATE TABLE IF NOT EXISTS public.calfex_students (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  order_number TEXT,
  class_room TEXT,
  course TEXT,
  school_name TEXT,
  academic_year TEXT,
  gender TEXT,
  password_hash TEXT,
  profile JSONB,
  subjects JSONB,
  security_settings JSONB,
  target_grade NUMERIC,
  schedule JSONB,
  pauta_links JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calfex_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to calfex_students" ON public.calfex_students;
CREATE POLICY "Allow all access to calfex_students" ON public.calfex_students FOR ALL USING (true) WITH CHECK (true);
`.trim();

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 4000);
  };

  if (!isOpen) return null;

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const handleExportBackup = () => {
    const data = {
      app: 'Calféx',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      student,
      subjects,
      security: {
        mode: securitySettings.mode,
      }
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calfex_backup_${student?.name ? student.name.replace(/\s+/g, '_') : 'estudante'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.student && parsed.subjects) {
          onRestoreData({ student: parsed.student, subjects: parsed.subjects });
          alert('Dados restaurados com sucesso!');
          onClose();
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSecurity = () => {
    setSecurityMessage(null);

    if (!newPin || newPin.trim().length < 4) {
      setSecurityMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 4 caracteres.' });
      return;
    }
    if (newPin !== confirmPin) {
      setSecurityMessage({ type: 'error', text: 'As senhas digitadas não coincidem. Digite novamente para confirmar.' });
      return;
    }

    const updated: AppSecuritySettings = {
      mode: 'pin',
      pinCode: newPin.trim(),
    };
    onUpdateSecuritySettings(updated);

    // Also update student profile password in cloud & local storage if student is active
    if (student) {
      const updatedStudent: StudentProfile = {
        ...student,
        password: newPin.trim(),
      };
      onRestoreData({ student: updatedStudent, subjects });
    }

    setSecurityMessage({ type: 'success', text: 'Senha alterada com sucesso! Utilize esta nova senha para aceder.' });
    setNewPin('');
    setConfirmPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-colors text-slate-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                {t.settingsTitle}
              </h2>
              <p className="text-xs text-slate-400">
                Segurança, Idiomas, Metas e Gestão de Dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          
          {/* SECÇÃO 1: ALTERAR SENHA DA CONTA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Alterar Senha da Conta
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Atualize a senha de acesso da sua conta CalFéx
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPinText ? 'Ocultar' : 'Ver dígitos'}</span>
              </button>
            </div>

            {/* Feedback Message */}
            {securityMessage && (
              <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                securityMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}>
                {securityMessage.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{securityMessage.text}</span>
              </div>
            )}

            {/* Password Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Nova Senha (mínimo 4 caracteres)
                </label>
                <input
                  type={showPinText ? 'text' : 'password'}
                  maxLength={16}
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    if (securityMessage) setSecurityMessage(null);
                  }}
                  placeholder="Nova senha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPinText ? 'text' : 'password'}
                  maxLength={16}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    if (securityMessage) setSecurityMessage(null);
                  }}
                  placeholder="Confirmar senha"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-white text-sm font-mono tracking-widest focus:outline-none ${
                    confirmPin && newPin === confirmPin
                      ? 'border-emerald-500'
                      : confirmPin && newPin !== confirmPin
                      ? 'border-rose-500'
                      : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {newPin && confirmPin && (
              <div className="text-[11px] flex items-center gap-1.5">
                {newPin === confirmPin ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> As senhas coincidem perfeitamente!
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> As senhas ainda não são iguais.
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveSecurity}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Nova Senha</span>
              </button>

              {onLockApp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockApp();
                  }}
                  className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1.5 font-semibold py-1.5 px-2.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Tela</span>
                </button>
              )}
            </div>

          </div>

          {/* Language Selector (Expandable List with Downward Chevron Arrow) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white">
                  {t.languageSelect}
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">
                15 Idiomas Disponíveis
              </span>
            </div>

            {/* Language Box with Chevron Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLanguageListOpen(!isLanguageListOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold hover:border-blue-500 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentLangObj.flag}</span>
                  <span>{currentLangObj.nativeName} ({currentLangObj.name})</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px]">Alterar</span>
                  {isLanguageListOpen ? (
                    <ChevronUp className="w-4 h-4 text-blue-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Expandable Languages Menu */}
              {isLanguageListOpen && (
                <div className="mt-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 max-h-60 overflow-y-auto space-y-1 z-20 shadow-xl animate-in fade-in slide-in-from-top-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Línguas Nacionais de Angola & Globais
                  </div>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setIsLanguageListOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        lang === l.code
                          ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{l.flag}</span>
                        <span>{l.nativeName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({l.name})</span>
                      </div>
                      {lang === l.code && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Target Grade Adjustment */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">
                {t.targetGoal || 'Meta de Média'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
                {targetGrade.toFixed(1)} / 20 Valores
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="20"
              step="0.5"
              value={targetGrade}
              onChange={(e) => onUpdateTargetGrade(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10.0 (Mínimo de Aprovação)</span>
              <span>14.0 (Bom)</span>
              <span>20.0 (Excelente)</span>
            </div>
          </div>

          {/* Supabase Cloud Database Status & 1-Click Setup */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white">
                  Base de Dados Supabase (Nuvem)
                </h4>
              </div>
              <button
                type="button"
                onClick={checkSupabaseStatus}
                disabled={isCheckingSupabase}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingSupabase ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {supabaseInfo && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Estado da Conexão:</span>
                  {supabaseInfo.connected ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Conectado ao Supabase
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> Desconectado
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Tabela `calfex_students`:</span>
                  {supabaseInfo.tableExists ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Criada & Operacional
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pendente de Criação
                    </span>
                  )}
                </div>

                {!supabaseInfo.tableExists && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Como ativar a gravação na nuvem no Supabase:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                      <li>Acesse o seu painel em <b>supabase.com</b></li>
                      <li>Clique em <b>SQL Editor</b> no menu lateral esquerdo</li>
                      <li>Clique no botão abaixo para copiar o comando SQL</li>
                      <li>Cole no editor do Supabase e clique em <b>Run</b></li>
                    </ol>
                    <button
                      type="button"
                      onClick={handleCopySupabaseSql}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-900" />
                          <span>Código SQL Copiado com Sucesso!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Código SQL para o Supabase</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {supabaseInfo.tableExists && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Todas as contas e disciplinas estão a ser salvas automaticamente na nuvem Supabase!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Backup & Restore Data */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white">
              Cópia de Segurança & Restauração
            </h4>
            <p className="text-[11px] text-slate-400">
              Exporte seus dados em JSON para guardar no seu dispositivo ou restaure dados anteriores.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.exportBackup || 'Exportar Backup'}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.restoreBackup || 'Restaurar'}</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Termos de Uso e Políticas de Privacidade Link */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Privacidade & Termos Legais</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              className="text-blue-400 hover:text-blue-300 font-bold underline"
            >
              Consultar Documento
            </button>
          </div>

          {/* System Info & Credits */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-center text-xs text-slate-400">
            <div className="flex items-center justify-center gap-1 font-bold text-white">
              <span>Calféx</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">v2.5</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Sistema de Gestão de Notas & Pautas Escolares
            </p>
            <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px]">
              <p className="text-slate-300 font-semibold">
                Criador: <span className="text-white font-bold">Melcaniel Ulima</span>
              </p>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <p>Filiação: Inocêncio Ulima e Ana Paula Ulima</p>
                <p className="text-slate-300 font-medium">Paula Fernanda Ulima</p>
              </div>
              <p className="text-[10px] text-slate-500">
                Angola 🇦🇴
              </p>
            </div>
          </div>

          {/* ZONA DE PERIGO: LOGOUT E ELIMINAR CONTA */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-3 pt-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Gestão de Sessão e Conta
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Logout button */}
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-bold border border-slate-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>{t.logout || 'Encerrar Sessão'}</span>
              </button>

              {/* Delete Account button */}
              {onDeleteAccount && student && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 hover:text-white transition-colors text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Eliminar Conta</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-colors"
          >
            {t.close}
          </button>
        </div>

      </div>

      {/* Modal de Confirmação Segura de Eliminação de Conta */}
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

      <TermsPolicyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </div>
  );
};
