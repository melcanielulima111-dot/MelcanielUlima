import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Calendar, 
  Clock, 
  Bell, 
  BellRing, 
  Trash2, 
  BookOpen, 
  Check, 
  AlertCircle,
  Sparkles,
  MapPin,
  User,
  Image as ImageIcon,
  Upload,
  Camera,
  Maximize2,
  Download,
  FileEdit,
  RotateCw
} from 'lucide-react';
import { Subject, ClassScheduleItem, DayOfWeek, StudentProfile } from '../types';

interface ClassScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  subjects: Subject[];
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const COLOR_PALETTE = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/30',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
  'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30',
];

export const ClassScheduleModal: React.FC<ClassScheduleModalProps> = ({
  isOpen,
  onClose,
  student,
  subjects,
}) => {
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'photo'>('manual');
  
  // Manual schedule state
  const [schedule, setSchedule] = useState<ClassScheduleItem[]>(() => {
    if (!student?.id) return [];
    const saved = localStorage.getItem(`calfex_schedule_${student.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Photo schedule state
  const [schedulePhoto, setSchedulePhoto] = useState<string | null>(() => {
    if (!student?.id) return null;
    return localStorage.getItem(`calfex_schedule_photo_${student.id}`) || null;
  });
  const [scheduleNotes, setScheduleNotes] = useState<string>(() => {
    if (!student?.id) return '';
    return localStorage.getItem(`calfex_schedule_notes_${student.id}`) || '';
  });
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (dayIndex === 1) return 'Segunda';
    if (dayIndex === 2) return 'Terça';
    if (dayIndex === 3) return 'Quarta';
    if (dayIndex === 4) return 'Quinta';
    if (dayIndex === 5) return 'Sexta';
    if (dayIndex === 6) return 'Sábado';
    return 'Segunda';
  });

  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [formDay, setFormDay] = useState<DayOfWeek>('Segunda');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [room, setRoom] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('calfex_notifications_enabled') === 'true';
  });
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to localStorage
  useEffect(() => {
    if (student?.id) {
      localStorage.setItem(`calfex_schedule_${student.id}`, JSON.stringify(schedule));
    }
  }, [schedule, student?.id]);

  useEffect(() => {
    if (student?.id) {
      if (schedulePhoto) {
        localStorage.setItem(`calfex_schedule_photo_${student.id}`, schedulePhoto);
      } else {
        localStorage.removeItem(`calfex_schedule_photo_${student.id}`);
      }
      localStorage.setItem(`calfex_schedule_notes_${student.id}`, scheduleNotes);
    }
  }, [schedulePhoto, scheduleNotes, student?.id]);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  if (!isOpen) return null;

  const handleAddScheduleItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    const sub = subjects.find(s => s.id === selectedSubjectId);
    if (!sub) return;

    const newItem: ClassScheduleItem = {
      id: `sch-${Date.now()}`,
      subjectId: sub.id,
      subjectName: sub.name,
      dayOfWeek: formDay,
      startTime,
      endTime,
      room: room.trim() || undefined,
      teacher: sub.teacher,
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
    };

    setSchedule(prev => [...prev, newItem]);
    setRoom('');
  };

  const handleDeleteItem = (id: string) => {
    setSchedule(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('Seu navegador não suporta notificações de sistema.');
      setTimeout(() => setNotificationStatus(null), 4000);
      return;
    }

    if (!notificationsEnabled) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('calfex_notifications_enabled', 'true');
          setNotificationStatus('Notificações de horário ativadas com sucesso!');
          new Notification('Calféx • Horário Ativado 🔔', {
            body: `Você receberá lembretes automáticos sobre suas disciplinas no dia certo.`,
            icon: '/favicon.ico',
          });
        } else {
          setNotificationStatus('Permissão negada pelo navegador. Ative nas permissões do site.');
        }
      } catch (err) {
        setNotificationsEnabled(true);
        localStorage.setItem('calfex_notifications_enabled', 'true');
        setNotificationStatus('Lembretes em aplicativo ativados!');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('calfex_notifications_enabled', 'false');
      setNotificationStatus('Notificações desativadas.');
    }
    setTimeout(() => setNotificationStatus(null), 3500);
  };

  const handleTestNotification = () => {
    const todayItems = schedule.filter(s => s.dayOfWeek === activeDay);
    const text = todayItems.length > 0
      ? `Hoje (${activeDay}): Você tem ${todayItems.map(i => `${i.subjectName} às ${i.startTime}`).join(', ')}.`
      : `Hoje (${activeDay}): Nenhuma disciplina agendada no horário.`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Calféx • Lembrete de Aula', {
        body: text,
      });
    } else {
      alert(`🔔 Lembrete de Disciplinas:\n${text}`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    // Limit to 6MB
    if (file.size > 6 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 6MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSchedulePhoto(dataUrl);
      setNotificationStatus('Foto do horário carregada com sucesso!');
      setTimeout(() => setNotificationStatus(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (window.confirm('Tem certeza que deseja remover a imagem do horário?')) {
      setSchedulePhoto(null);
    }
  };

  const currentDayItems = schedule
    .filter(item => item.dayOfWeek === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Horário Escolar & Aulas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione a imagem do seu horário ou preencha manualmente por dias da semana.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Mode Selector Switch (Image vs Manual) */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex rounded-2xl bg-slate-200/80 dark:bg-slate-950 p-1 border border-slate-300 dark:border-slate-800 text-xs w-full sm:w-auto">
            <button
              onClick={() => setScheduleMode('manual')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                scheduleMode === 'manual'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Horário Manual</span>
              {schedule.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  scheduleMode === 'manual' ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {schedule.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setScheduleMode('photo')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                scheduleMode === 'photo'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Foto / Imagem do Horário</span>
              {schedulePhoto && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </div>

          <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {scheduleMode === 'photo' ? 'Upload de foto oficial' : 'Aulas por dias e horas'}
          </span>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {notificationStatus && (
            <div className="p-3 rounded-xl bg-blue-100/70 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800">
              {notificationStatus}
            </div>
          )}

          {/* MODE 1: PHOTO / IMAGE UPLOAD */}
          {scheduleMode === 'photo' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />

              {!schedulePhoto ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 sm:p-12 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-3xl bg-slate-50/50 dark:bg-slate-950/40 text-center cursor-pointer transition-all hover:scale-[1.005] group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-md">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    Carregar Imagem ou Foto do Horário
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                    Tire uma foto ou anexe o ficheiro do horário escolar impresso pela escola (PNG, JPG, WEBP).
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Selecionar Imagem do Horário</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Photo Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Imagem do Horário Salva
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsFullscreenImage(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm"
                        title="Ver em tamanho original"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Expandir</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Trocar Imagem</span>
                      </button>
                      <button
                        onClick={handleRemovePhoto}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Preview Container */}
                  <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 flex items-center justify-center max-h-[50vh] shadow-inner group">
                    <img 
                      src={schedulePhoto} 
                      alt="Horário Escolar" 
                      className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-[1.01]"
                      onClick={() => setIsFullscreenImage(true)}
                    />
                    <div 
                      onClick={() => setIsFullscreenImage(true)}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-black/90 shadow-lg"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Clique para ver ampliado</span>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-500" />
                      <span>Anotações do Horário (Turma, Turno, Salas)</span>
                    </label>
                    <input
                      type="text"
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      placeholder="Ex: 12ª Classe - Turma B - Turno da Manhã (07:30 às 13:00)"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: MANUAL TIMETABLE */}
          {scheduleMode === 'manual' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Notification bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${notificationsEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    {notificationsEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {notificationsEnabled ? 'Lembretes de Aulas Ativados' : 'Ativar Notificações de Aulas'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Receba avisos automáticos nos dias em que tem aulas de cada disciplina.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleToggleNotifications}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      notificationsEnabled
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                    }`}
                  >
                    {notificationsEnabled ? 'Desativar' : 'Ativar Alertas'}
                  </button>
                  {notificationsEnabled && (
                    <button
                      onClick={handleTestNotification}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      title="Testar alerta"
                    >
                      Testar Alerta
                    </button>
                  )}
                </div>
              </div>

              {/* Add schedule form */}
              {subjects.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cadastre suas disciplinas primeiro para adicioná-las ao horário.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddScheduleItem} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    + Inserir Disciplina no Horário
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Disciplina
                      </label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Dia da Semana
                      </label>
                      <select
                        value={formDay}
                        onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Início
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Fim
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center"
                        />
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Sala / Bloco
                        </label>
                        <input
                          type="text"
                          value={room}
                          onChange={(e) => setRoom(e.target.value)}
                          placeholder="Ex: Sala 04"
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 shrink-0 h-[34px] flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </form>
              )}

              {/* Days Tabs selector */}
              <div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {DAYS_OF_WEEK.map((day) => {
                    const count = schedule.filter(s => s.dayOfWeek === day).length;
                    const isSelected = activeDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{day}</span>
                        {count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* List for the selected day */}
                <div className="mt-3 space-y-2">
                  {currentDayItems.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800">
                      <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Nenhuma aula agendada para <strong>{activeDay}</strong>. Adicione uma no formulário acima.
                      </p>
                    </div>
                  ) : (
                    currentDayItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex flex-col items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.subjectName}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {item.startTime} - {item.endTime}
                              </span>
                              {item.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {item.room}
                                </span>
                              )}
                              {item.teacher && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {item.teacher}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remover do horário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Concluir
          </button>
        </div>

      </div>

      {/* Fullscreen Photo Lightbox */}
      {isFullscreenImage && schedulePhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white text-sm font-bold">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              <span>Horário Escolar • Visualização Completa</span>
            </div>
            <button
              onClick={() => setIsFullscreenImage(false)}
              className="p-2 text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
            <img 
              src={schedulePhoto} 
              alt="Horário Escolar em Tela Toda" 
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}

    </div>
  );
};
