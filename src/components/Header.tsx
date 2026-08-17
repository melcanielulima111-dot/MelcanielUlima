import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Edit3, 
  Camera, 
  FileText, 
  Settings, 
  Globe, 
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { StudentProfile, ActiveTab, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';
import { CalFexLogo } from './CalFexLogo';

interface HeaderProps {
  student: StudentProfile | null;
  generalAverage: number | null;
  targetGrade: number;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onQuickPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lang: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export const Header: React.FC<HeaderProps> = ({
  student,
  generalAverage,
  targetGrade,
  activeTab,
  onSelectTab,
  onOpenProfile,
  onOpenEditProfile,
  onOpenSettings,
  onLogout,
  onQuickPhotoUpload,
  lang,
}) => {
  const t = getTranslation(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/95 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 w-full">
        
        {/* Left: Brand / Official CalFéx Logo */}
        <div 
          onClick={() => onSelectTab('home')}
          className="cursor-pointer group select-none transition-transform hover:opacity-95 shrink-0"
        >
          <CalFexLogo size="md" />
        </div>

        {/* Right: Top Controls (Configurações, Círculo da Conta) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* 1. Botão Configurações */}
          <button
            onClick={onOpenSettings}
            title={t.navSettings}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 2. Círculo da Conta (Totalmente redondo, 100% visível e nunca cortado pela metade) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 p-0.5 sm:px-2 sm:py-1 rounded-full sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 transition-all focus:outline-none shadow-sm cursor-pointer shrink-0"
              title="Conta do Estudante"
              aria-label="Conta do Estudante"
            >
              {/* Círculo Perfeito com foto ou iniciais do estudante */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-blue-500/60 shadow-sm flex items-center justify-center bg-slate-900">
                {student?.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xs">
                    {getInitials(student?.name)}
                  </div>
                )}
                {/* Online indicator dot */}
                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white dark:ring-slate-900 pointer-events-none" />
              </div>

              <div className="hidden md:flex flex-col text-left pr-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">
                  {student?.name?.split(' ')[0] || 'Conta'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Nº {student?.orderNumber || '0'}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 transition-colors">
                
                {/* Profile Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  {student?.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt={student.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-blue-500/30 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                      {getInitials(student?.name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {student?.name || 'Estudante'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {student?.email || 'Sem email cadastrado'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                        Nº {student?.orderNumber || '0'}
                      </span>
                      {student?.gender && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                          • {student.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Quick Overview in Menu */}
                {student && (
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/80 text-xs flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Turma / Sala</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[140px] inline-block">
                        {student.classRoom || 'Não informada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Média Geral</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {generalAverage !== null ? `${generalAverage.toFixed(1)} / 20` : '--'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Menu Actions */}
                <div className="p-2 space-y-1">
                  
                  {/* View Full Profile */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-blue-500" />
                    <span>Ver Perfil Completo do Aluno</span>
                  </button>

                  {/* Edit Profile */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenEditProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-500" />
                    <span>Editar Dados (Nome, Turma, Escola)</span>
                  </button>

                  {/* Add / Change Photo */}
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <Camera className="w-4 h-4 text-purple-500" />
                    <span>{student?.avatarUrl ? 'Alterar Foto de Perfil' : 'Adicionar Foto de Perfil'}</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      onQuickPhotoUpload(e);
                      setMenuOpen(false);
                    }}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Open Pauta Report */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSelectTab('pauta');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>Abrir Pauta Escolar Oficial</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800/80"></div>

                  {/* Logout / Switch Account */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da Conta / Entrar noutra</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
