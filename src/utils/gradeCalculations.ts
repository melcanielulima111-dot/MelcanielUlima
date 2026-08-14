import { QuarterGrades, Subject, SubjectCalculated, PautaSummary, StudentProfile } from '../types';

/**
 * Calculates the average of a quarter based on P1, P2 and MAC or a manual average.
 */
export function calculateQuarterAverage(quarter?: QuarterGrades): number | null {
  if (!quarter) return null;
  if (quarter.manualMt !== null && quarter.manualMt !== undefined && !isNaN(quarter.manualMt)) {
    return Math.max(0, Math.min(20, quarter.manualMt));
  }

  const values: number[] = [];
  if (quarter.p1 !== null && quarter.p1 !== undefined && !isNaN(quarter.p1)) values.push(quarter.p1);
  if (quarter.p2 !== null && quarter.p2 !== undefined && !isNaN(quarter.p2)) values.push(quarter.p2);
  if (quarter.mac !== null && quarter.mac !== undefined && !isNaN(quarter.mac)) values.push(quarter.mac);

  if (values.length === 0) return null;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / values.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Get qualitative appreciation from a 0-20 grade
 */
export function getQualitativeLabel(grade: number | null): string {
  if (grade === null || isNaN(grade)) return 'Sem Nota';
  if (grade >= 18) return 'Excelente';
  if (grade >= 16) return 'Muito Bom';
  if (grade >= 14) return 'Bom';
  if (grade >= 10) return 'Suficiente';
  if (grade >= 7) return 'Insuficiente (Recurso)';
  return 'Mau (Reprovado)';
}

/**
 * Calculates full stats for a subject
 */
export function calculateSubject(subject: Subject): SubjectCalculated {
  const mt1 = calculateQuarterAverage(subject.t1);
  const mt2 = calculateQuarterAverage(subject.t2);
  const mt3 = calculateQuarterAverage(subject.t3);

  const activeTrimestres: number[] = [];
  if (mt1 !== null) activeTrimestres.push(mt1);
  if (mt2 !== null) activeTrimestres.push(mt2);
  if (mt3 !== null) activeTrimestres.push(mt3);

  let mfd: number | null = null;
  if (activeTrimestres.length > 0) {
    const sum = activeTrimestres.reduce((acc, curr) => acc + curr, 0);
    mfd = Math.round((sum / activeTrimestres.length) * 10) / 10;
  }

  let status: SubjectCalculated['status'] = 'Pendente';
  if (mfd !== null) {
    if (mfd >= 14) status = 'Aprovado';
    else if (mfd >= 10) status = 'Suficiente';
    else if (mfd >= 7) status = 'Em Risco';
    else status = 'Reprovado';
  }

  return {
    id: subject.id,
    name: subject.name,
    teacher: subject.teacher,
    category: subject.category,
    weight: subject.weight || 1,
    mt1,
    t1HasData: mt1 !== null,
    t1P1: subject.t1?.p1 ?? null,
    t1P2: subject.t1?.p2 ?? null,
    t1Mac: subject.t1?.mac ?? null,
    mt2,
    t2HasData: mt2 !== null,
    t2P1: subject.t2?.p1 ?? null,
    t2P2: subject.t2?.p2 ?? null,
    t2Mac: subject.t2?.mac ?? null,
    mt3,
    t3HasData: mt3 !== null,
    t3P1: subject.t3?.p1 ?? null,
    t3P2: subject.t3?.p2 ?? null,
    t3Mac: subject.t3?.mac ?? null,
    mfd,
    status,
    qualitative: getQualitativeLabel(mfd),
  };
}

/**
 * Generate full pauta summary for the student
 */
export function generatePautaSummary(student: StudentProfile, subjects: Subject[]): PautaSummary {
  const calculated = subjects.map(calculateSubject);

  const validMfds = calculated.filter(s => s.mfd !== null);
  const generalAvg = validMfds.length > 0
    ? Math.round((validMfds.reduce((acc, s) => acc + (s.mfd! * s.weight), 0) / validMfds.reduce((acc, s) => acc + s.weight, 0)) * 10) / 10
    : null;

  const validT1 = calculated.filter(s => s.mt1 !== null);
  const avgT1 = validT1.length > 0
    ? Math.round((validT1.reduce((acc, s) => acc + s.mt1!, 0) / validT1.length) * 10) / 10
    : null;

  const validT2 = calculated.filter(s => s.mt2 !== null);
  const avgT2 = validT2.length > 0
    ? Math.round((validT2.reduce((acc, s) => acc + s.mt2!, 0) / validT2.length) * 10) / 10
    : null;

  const validT3 = calculated.filter(s => s.mt3 !== null);
  const avgT3 = validT3.length > 0
    ? Math.round((validT3.reduce((acc, s) => acc + s.mt3!, 0) / validT3.length) * 10) / 10
    : null;

  let approvedCount = 0;
  let warningCount = 0;
  let failedCount = 0;
  let bestSubject: { name: string; grade: number } | null = null;
  let worstSubject: { name: string; grade: number } | null = null;

  validMfds.forEach(s => {
    if (s.mfd! >= 10) approvedCount++;
    else if (s.mfd! >= 7) warningCount++;
    else failedCount++;

    if (!bestSubject || s.mfd! > bestSubject.grade) {
      bestSubject = { name: s.name, grade: s.mfd! };
    }
    if (!worstSubject || s.mfd! < worstSubject.grade) {
      worstSubject = { name: s.name, grade: s.mfd! };
    }
  });

  let finalAcademicStatus: PautaSummary['finalAcademicStatus'] = 'Em Andamento';
  if (calculated.length > 0 && validMfds.length === calculated.length) {
    if (failedCount === 0 && warningCount === 0) {
      if (generalAvg !== null && generalAvg >= 16) {
        finalAcademicStatus = 'Aprovado com Distinção';
      } else {
        finalAcademicStatus = 'Transita (Aprovado)';
      }
    } else if (failedCount <= 2 && warningCount <= 2) {
      finalAcademicStatus = 'Admitido a Exame';
    } else {
      finalAcademicStatus = 'Não Transita';
    }
  }

  return {
    student,
    subjects: calculated,
    generalAverage: generalAvg,
    generalAverageT1: avgT1,
    generalAverageT2: avgT2,
    generalAverageT3: avgT3,
    totalSubjects: subjects.length,
    approvedCount,
    warningCount,
    failedCount,
    bestSubject,
    worstSubject,
    finalAcademicStatus,
  };
}

/**
 * Default sample subjects for new students
 */
export const DEFAULT_SAMPLE_SUBJECTS: Subject[] = [
  {
    id: 'sub-mat',
    name: 'Matemática',
    teacher: 'Prof. António Manuel',
    category: 'Ciências',
    weight: 2,
    t1: { p1: 14.5, p2: 13.0, mac: 15.0 },
    t2: { p1: 15.0, p2: 14.0, mac: 16.0 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-port',
    name: 'Língua Portuguesa',
    teacher: 'Prof.ª Teresa Silva',
    category: 'Línguas',
    weight: 2,
    t1: { p1: 16.0, p2: 15.5, mac: 16.5 },
    t2: { p1: 16.0, p2: 17.0, mac: 16.0 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-fis',
    name: 'Física',
    teacher: 'Prof. Carlos Domingos',
    category: 'Ciências',
    weight: 2,
    t1: { p1: 12.0, p2: 11.5, mac: 13.0 },
    t2: { p1: 13.5, p2: 14.0, mac: 14.5 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-qui',
    name: 'Química',
    teacher: 'Prof.ª Maria Esperança',
    category: 'Ciências',
    weight: 1,
    t1: { p1: 13.0, p2: 14.0, mac: 15.0 },
    t2: { p1: 14.0, p2: 13.5, mac: 15.0 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-bio',
    name: 'Biologia',
    teacher: 'Prof. Joaquim Pedro',
    category: 'Ciências',
    weight: 1,
    t1: { p1: 15.0, p2: 16.0, mac: 15.5 },
    t2: { p1: 16.5, p2: 16.0, mac: 17.0 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-ing',
    name: 'Inglês',
    teacher: 'Prof. John Smith',
    category: 'Línguas',
    weight: 1,
    t1: { p1: 17.0, p2: 16.5, mac: 18.0 },
    t2: { p1: 18.0, p2: 17.5, mac: 18.0 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-hist',
    name: 'História',
    teacher: 'Prof. Paulo Afonso',
    category: 'Humanas',
    weight: 1,
    t1: { p1: 14.0, p2: 14.5, mac: 15.0 },
    t2: { p1: 15.0, p2: 15.0, mac: 16.0 },
    t3: { p1: null, p2: null, mac: null },
  },
  {
    id: 'sub-tic',
    name: 'Informática / TIC',
    teacher: 'Prof. André Lemos',
    category: 'Técnica',
    weight: 1,
    t1: { p1: 18.0, p2: 19.0, mac: 18.5 },
    t2: { p1: 19.0, p2: 18.5, mac: 19.0 },
    t3: { p1: null, p2: null, mac: null },
  }
];

export const DEFAULT_SAMPLE_STUDENT: StudentProfile = {
  id: 'student-main',
  name: 'Melcaniel Ulima',
  email: 'melcanielulima111@gmail.com',
  orderNumber: '14',
  gender: 'masculino',
  classRoom: '11ª Classe - Turma A',
  course: 'Ciências Físicas e Biológicas',
  schoolName: 'Complexo Escolar CalFéx',
  academicYear: '2025 / 2026',
  targetGrade: 14.0,
  registeredAt: new Date().toISOString(),
};
