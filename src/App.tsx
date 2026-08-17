import React, { useState, useEffect } from 'react';
import { 
  StudentProfile, 
  Subject, 
  ActiveTab, 
  PautaLink, 
  PautaSummary, 
  SupportedLanguage,
  AppSecuritySettings 
} from './types';
import { 
  generatePautaSummary 
} from './utils/gradeCalculations';
import { 
  getStoredSecuritySettings, 
  saveSecuritySettings 
} from './utils/security';
import { 
  syncStudentDataToCloud, 
  fetchStudentDataFromCloud,
  deleteStudentAccountPermanently 
} from './utils/cloudSync';
import { getApiUrl } from './utils/api';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeDashboard } from './components/HomeDashboard';
import { DisciplinesManagementView } from './components/DisciplinesManagementView';
import { PautaReportView } from './components/PautaReportView';
import { PerformanceCharts } from './components/PerformanceCharts';
import { MissingGradeCalculator } from './components/MissingGradeCalculator';
import { PautaNetView } from './components/PautaNetView';
import { StudentAuthScreen } from './components/StudentAuthScreen';
import { RegistrationModal } from './components/RegistrationModal';
import { ProfileModal } from './components/ProfileModal';
import { SubjectDetailModal } from './components/SubjectDetailModal';
import { AddSubjectModal } from './components/AddSubjectModal';
import { QuickCalculatorModal } from './components/QuickCalculatorModal';
import { SettingsModal } from './components/SettingsModal';
import { ClassScheduleModal } from './components/ClassScheduleModal';
import { AppLockScreen } from './components/AppLockScreen';

const STORAGE_KEYS = {
  ACTIVE_STUDENT: 'calfex_active_student_v2',
  LINKS: 'calfex_links_v2',
  TARGET: 'calfex_target_v2',
  LANG: 'calfex_lang_v2',
};

export default function App() {
  // Load active student profile from localStorage
  const [student, setStudent] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.name.trim() !== '') {
          return parsed;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // App Security Settings (Livre, Senha/PIN, Impressão Digital)
  const [securitySettings, setSecuritySettings] = useState<AppSecuritySettings>(() => {
    return getStoredSecuritySettings();
  });

  // App Lock status: if student is already logged in and security mode is not 'none', start locked
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT);
    const sec = getStoredSecuritySettings();
    return !!(saved && sec.mode !== 'none');
  });

  // Load subjects for the current active student (starts with EMPTY array [] for new students)
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const activeStudentStr = localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT);
    if (activeStudentStr) {
      try {
        const activeStudent = JSON.parse(activeStudentStr);
        if (activeStudent && activeStudent.id) {
          const userSubjects = localStorage.getItem(`calfex_subjects_${activeStudent.id}`);
          if (userSubjects) {
            return JSON.parse(userSubjects);
          }
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [pautaLinks, setPautaLinks] = useState<PautaLink[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LINKS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'link-1',
        title: 'Portal Oficial de Notas Escolar',
        url: 'https://escola.gov.ao',
        dateAdded: new Date().toLocaleDateString('pt-PT'),
      }
    ];
  });

  const [targetGrade, setTargetGrade] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET);
    return saved ? parseFloat(saved) : 14.0;
  });

  const [lang, setLang] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG) as SupportedLanguage;
    return saved || 'pt';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Modals state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isQuickCalcOpen, setIsQuickCalcOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Enforce permanent Dark Mode throughout the app
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.className = 'bg-slate-950 text-slate-100 antialiased min-h-screen';
  }, []);

  // Hydrate student data from cloud on startup if available
  useEffect(() => {
    if (student && student.id) {
      fetchStudentDataFromCloud(student.id).then((cloudData) => {
        if (cloudData && cloudData.success) {
          if (cloudData.subjects && Array.isArray(cloudData.subjects)) {
            setSubjects(cloudData.subjects);
            localStorage.setItem(`calfex_subjects_${student.id}`, JSON.stringify(cloudData.subjects));
          }
          if (cloudData.student) {
            setStudent(cloudData.student);
          }
          if (cloudData.targetGrade) {
            setTargetGrade(cloudData.targetGrade);
          }
        }
      });
    }
  }, [student?.id]);

  // When student changes (login/switch account), load their specific subjects
  const handleLoginSuccess = (profile: StudentProfile) => {
    setStudent(profile);
    if (profile.targetGrade) {
      setTargetGrade(profile.targetGrade);
    }
    const savedSubjects = localStorage.getItem(`calfex_subjects_${profile.id}`);
    if (savedSubjects) {
      try {
        setSubjects(JSON.parse(savedSubjects));
      } catch {
        setSubjects([]);
      }
    } else {
      setSubjects([]);
      localStorage.setItem(`calfex_subjects_${profile.id}`, JSON.stringify([]));
    }
    setIsAppLocked(false);
    setActiveTab('home');
  };

  // Sync active student to localStorage
  useEffect(() => {
    if (student) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT, JSON.stringify(student));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT);
    }
  }, [student]);

  // Sync subjects per active student & push to cloud
  useEffect(() => {
    if (student && student.id) {
      localStorage.setItem(`calfex_subjects_${student.id}`, JSON.stringify(subjects));
      // Background sync to cloud database (multi-device)
      syncStudentDataToCloud(student.id, {
        profile: student,
        subjects,
        targetGrade,
        securitySettings,
        pautaLinks,
      });
    }
  }, [subjects, student, targetGrade, securitySettings, pautaLinks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(pautaLinks));
  }, [pautaLinks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TARGET, targetGrade.toString());
  }, [targetGrade]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  }, [lang]);

  const handleUpdateSecuritySettings = (newSettings: AppSecuritySettings) => {
    setSecuritySettings(newSettings);
    saveSecuritySettings(newSettings);
  };

  // Overall Summary calculation
  const pautaSummary: PautaSummary = generatePautaSummary(
    student || {
      id: 'placeholder',
      name: '',
      email: '',
      orderNumber: '',
      gender: 'masculino',
      classRoom: '',
      course: '',
      schoolName: '',
      academicYear: '2025/2026',
      targetGrade: 14,
    }, 
    subjects
  );

  // Handlers
  const handleSaveProfile = (newProfile: StudentProfile) => {
    setStudent(newProfile);
    if (newProfile.targetGrade) {
      setTargetGrade(newProfile.targetGrade);
    }
    // Update also in registered accounts
    try {
      const savedAccounts = localStorage.getItem('calfex_registered_students_v2');
      if (savedAccounts) {
        const accounts: StudentProfile[] = JSON.parse(savedAccounts);
        const updated = accounts.map(a => a.id === newProfile.id ? newProfile : a);
        localStorage.setItem('calfex_registered_students_v2', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }
    setIsRegModalOpen(false);
  };

  const handleUpdateAvatar = (avatarUrl: string | undefined) => {
    if (!student) return;
    const updated = {
      ...student,
      avatarUrl,
    };
    handleSaveProfile(updated);
  };

  const handleQuickPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    setStudent(null);
    setSubjects([]);
    setIsAppLocked(false);
    setActiveTab('home');
  };

  const handleDeleteAccount = async (studentId: string) => {
    try {
      const email = student?.email;
      // 1. Permanently delete from Server, Supabase, and blacklist locally
      await deleteStudentAccountPermanently(studentId, email);

      // 2. Remove all student specific data from localStorage
      localStorage.removeItem(`calfex_subjects_${studentId}`);
      localStorage.removeItem(`calfex_security_${studentId}`);
      localStorage.removeItem(`calfex_pauta_links_${studentId}`);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT);
      localStorage.removeItem('calfex_active_student');
      localStorage.removeItem('calfex_ai_chat_history');
      localStorage.removeItem('calfex_ai_chat_sessions_v2');
      localStorage.removeItem('calfex_ai_active_session_id_v2');

      // 3. Remove student from registered accounts list
      try {
        const savedAccounts = localStorage.getItem('calfex_registered_students_v2');
        if (savedAccounts) {
          const accounts: StudentProfile[] = JSON.parse(savedAccounts);
          const filtered = accounts.filter(a => a.id !== studentId && (!email || (a.email && a.email.toLowerCase() !== email.toLowerCase())));
          localStorage.setItem('calfex_registered_students_v2', JSON.stringify(filtered));
        }
      } catch (e) {
        console.warn('Error filtering registered accounts', e);
      }

      // 4. Reset local React states
      setStudent(null);
      setSubjects([]);
      setIsAppLocked(false);
      setActiveTab('home');
    } catch (e) {
      console.error('Account deletion error:', e);
      // Fallback local cleanup
      setStudent(null);
      setSubjects([]);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT);
      localStorage.removeItem('calfex_active_student');
    }
  };

  const handleAddSubject = (newSubject: Subject) => {
    setSubjects(prev => [newSubject, ...prev]);
  };

  const handleSaveSubject = (updated: Subject) => {
    setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleSubjectVisibility = (id: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, hiddenInPauta: !s.hiddenInPauta } : s));
  };

  const handleAddLink = (newLink: PautaLink) => {
    setPautaLinks(prev => [newLink, ...prev]);
  };

  const handleDeleteLink = (id: string) => {
    setPautaLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleRestoreData = (data: { student: StudentProfile; subjects: Subject[] }) => {
    setStudent(data.student);
    setSubjects(data.subjects);
    if (data.student.targetGrade) {
      setTargetGrade(data.student.targetGrade);
    }
  };

  // 1. Mandatory Authentication Screen: If no student logged in
  if (!student) {
    return (
      <StudentAuthScreen
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
      />
    );
  }

  // 2. Lock Screen: If security mode is configured ('pin' or 'biometric') and app is locked
  if (isAppLocked && securitySettings.mode !== 'none') {
    return (
      <AppLockScreen
        student={student}
        securitySettings={securitySettings}
        onUnlock={() => setIsAppLocked(false)}
        onUpdateSecuritySettings={(newSec) => {
          setSecuritySettings(newSec);
          saveSecuritySettings(newSec);
        }}
        onLogout={() => {
          setStudent(null);
          setIsAppLocked(false);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT);
        }}
      />
    );
  }

  // 3. Main Dashboard in Dark Theme
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors duration-200">
      
      {/* Top Application Header */}
      <Header
        student={student}
        generalAverage={pautaSummary.generalAverage}
        targetGrade={targetGrade}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenEditProfile={() => setIsRegModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onQuickPhotoUpload={handleQuickPhotoUpload}
        lang={lang}
        onSelectLanguage={setLang}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        
        {/* Home Tab */}
        {activeTab === 'home' && (
          <HomeDashboard
            student={student}
            subjects={subjects}
            onOpenAddSubject={() => setIsAddSubjectOpen(true)}
            onOpenSubjectDetail={(sub) => setEditingSubject(sub)}
            onOpenQuickCalc={() => setIsQuickCalcOpen(true)}
            onSelectTab={setActiveTab}
            targetGrade={targetGrade}
            lang={lang}
          />
        )}

        {/* Disciplinas Tab (Full Management & Visibility control) */}
        {activeTab === 'disciplinas' && (
          <DisciplinesManagementView
            subjects={subjects}
            subjectsCalculated={pautaSummary.subjects}
            onOpenAddSubject={() => setIsAddSubjectOpen(true)}
            onOpenSubjectDetail={(sub) => setEditingSubject(sub)}
            onDeleteSubject={handleDeleteSubject}
            onToggleVisibility={handleToggleSubjectVisibility}
            onOpenSchedule={() => setIsScheduleModalOpen(true)}
            targetGrade={targetGrade}
            lang={lang}
          />
        )}

        {/* Pauta Official Report Tab */}
        {activeTab === 'pauta' && (
          <PautaReportView
            student={student}
            subjects={subjects}
            onOpenSubjectEdit={(sub) => setEditingSubject(sub)}
            onOpenPautaNet={() => setActiveTab('pautanet')}
            targetGrade={targetGrade}
            lang={lang}
          />
        )}

        {/* Statistics & Performance Tab */}
        {activeTab === 'desempenho' && (
          <PerformanceCharts
            student={student}
            subjects={subjects}
            targetGrade={targetGrade}
          />
        )}

        {/* Missing Grade Calculator Tab */}
        {activeTab === 'falta' && (
          <MissingGradeCalculator
            subjects={subjects}
            defaultTarget={targetGrade}
            lang={lang}
          />
        )}

        {/* External Portals Tab */}
        {activeTab === 'pautanet' && (
          <PautaNetView
            links={pautaLinks}
            onAddLink={handleAddLink}
            onDeleteLink={handleDeleteLink}
          />
        )}
      </main>

      {/* Bottom Floating Navigation (Mobile & Tablet) */}
      <BottomNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lang={lang}
      />

      {/* Registration / Profile Edit Modal */}
      <RegistrationModal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        onSave={handleSaveProfile}
        initialProfile={student}
        isFirstTime={!student}
        lang={lang}
      />

      {/* Profile Viewer Modal */}
      {student && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          student={student}
          pautaSummary={pautaSummary}
          onEdit={() => setIsRegModalOpen(true)}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onUpdateAvatar={handleUpdateAvatar}
          onOpenPauta={() => {
            setIsProfileModalOpen(false);
            setActiveTab('pauta');
          }}
          lang={lang}
        />
      )}

      {/* Subject Grades & Simulation Modal */}
      <SubjectDetailModal
        isOpen={editingSubject !== null}
        onClose={() => setEditingSubject(null)}
        subject={editingSubject}
        onSave={handleSaveSubject}
        onDelete={handleDeleteSubject}
        targetGrade={targetGrade}
      />

      {/* Add New Subject Modal */}
      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        onAdd={handleAddSubject}
      />

      {/* Fast 0-20 Average Calculator Modal */}
      <QuickCalculatorModal
        isOpen={isQuickCalcOpen}
        onClose={() => setIsQuickCalcOpen(false)}
      />

      {/* Settings, Backup, Security, Language and Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        student={student}
        subjects={subjects}
        onRestoreData={handleRestoreData}
        targetGrade={targetGrade}
        onUpdateTargetGrade={setTargetGrade}
        lang={lang}
        onSelectLanguage={setLang}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        securitySettings={securitySettings}
        onUpdateSecuritySettings={handleUpdateSecuritySettings}
        onLockApp={() => setIsAppLocked(true)}
      />

      {/* Class Schedule & Notification Timetable Modal */}
      {student && (
        <ClassScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          student={student}
          subjects={subjects}
        />
      )}

    </div>
  );
}
