export type Gender = 'masculino' | 'feminino' | 'outro';

export type SecurityLockType = 'none' | 'pin';

export interface AppSecuritySettings {
  mode: SecurityLockType; // 'none' (Livre / Sem bloqueio) | 'pin' (Senha / PIN)
  pinCode?: string;
}

export type SupportedLanguage = 
  | 'pt'   // Português
  | 'en'   // English
  | 'fr'   // Français
  | 'es'   // Español
  | 'de'   // Deutsch
  | 'it'   // Italiano
  | 'umb'  // Umbundu (Angola)
  | 'kmb'  // Kimbundu (Angola)
  | 'kik'  // Kikongo (Angola)
  | 'cok'  // Cokwe (Angola)
  | 'ln'   // Lingala
  | 'zh'   // 中文
  | 'ru'   // Русский
  | 'ar'   // العربية
  | 'ja';  // 日本語

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  password?: string; // Senha da conta do estudante
  registrationCode?: string; // Código de Cadastro permanente do estudante (ex: "CFX-839201")
  orderNumber: string; // Número de ordem na turma (ex: "14")
  gender: Gender;
  classRoom: string; // Turma / Classe (ex: "11ª Classe - Sala 04")
  course: string; // Curso / Área (ex: "Ciências Físicas e Biológicas")
  schoolName: string; // Nome da Escola / Instituição
  academicYear: string; // Ano Lectivo (ex: "2025/2026")
  avatarUrl?: string; // Foto de perfil (Base64 ou URL)
  targetGrade: number; // Meta pessoal (ex: 14.0)
  registeredAt: string;
}

export interface QuarterGrades {
  p1?: number | null; // Prova 1
  p2?: number | null; // Prova 2
  mac?: number | null; // Média de Avaliação Contínua
  manualMt?: number | null; // Média trimestral inserida manualmente se preferir
  notes?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  teacher?: string;
  category?: 'Ciências' | 'Humanas' | 'Línguas' | 'Técnica' | 'Outra';
  weight?: number; // Coeficiente (padrão 1)
  hiddenInPauta?: boolean; // Se está visível na pauta escolar
  t1: QuarterGrades;
  t2: QuarterGrades;
  t3: QuarterGrades;
  exam?: number | null; // Exame de Recurso/Final se aplicável
  target?: number;
}

export interface SubjectCalculated {
  id: string;
  name: string;
  teacher?: string;
  category?: string;
  weight: number;
  hiddenInPauta?: boolean;
  // Trimestre 1
  mt1: number | null;
  t1HasData: boolean;
  t1P1: number | null;
  t1P2: number | null;
  t1Mac: number | null;
  // Trimestre 2
  mt2: number | null;
  t2HasData: boolean;
  t2P1: number | null;
  t2P2: number | null;
  t2Mac: number | null;
  // Trimestre 3
  mt3: number | null;
  t3HasData: boolean;
  t3P1: number | null;
  t3P2: number | null;
  t3Mac: number | null;
  // Média Final
  mfd: number | null; // Média Final da Disciplina
  status: 'Aprovado' | 'Suficiente' | 'Em Risco' | 'Reprovado' | 'Pendente';
  qualitative: string;
}

export interface PautaSummary {
  student: StudentProfile;
  subjects: SubjectCalculated[];
  generalAverage: number | null;
  generalAverageT1: number | null;
  generalAverageT2: number | null;
  generalAverageT3: number | null;
  totalSubjects: number;
  approvedCount: number;
  warningCount: number;
  failedCount: number;
  bestSubject: { name: string; grade: number } | null;
  worstSubject: { name: string; grade: number } | null;
  finalAcademicStatus: 'Transita (Aprovado)' | 'Aprovado com Distinção' | 'Admitido a Exame' | 'Não Transita' | 'Em Andamento';
}

export type ActiveTab = 'home' | 'disciplinas' | 'pauta' | 'desempenho' | 'falta' | 'pautanet';

export interface PautaLink {
  id: string;
  title: string;
  url: string;
  dateAdded: string;
}

export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado';

export interface ClassScheduleItem {
  id: string;
  subjectId: string;
  subjectName: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // e.g. "07:30"
  endTime: string;   // e.g. "09:00"
  room?: string;     // e.g. "Sala 12"
  teacher?: string;
  color?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  topic?: 'study' | 'app' | 'creator' | 'general' | 'life';
  isAudioMessage?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  audioFileName?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

