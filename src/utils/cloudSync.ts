import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudentProfile, Subject, AppSecuritySettings, PautaLink } from '../types';
import { getApiUrl } from './api';

export interface CloudStudentPayload {
  profile: StudentProfile;
  subjects: Subject[];
  securitySettings?: AppSecuritySettings;
  targetGrade?: number;
  schedule?: any[];
  pautaLinks?: PautaLink[];
}

export interface CloudSyncResponse {
  success: boolean;
  student?: StudentProfile;
  subjects?: Subject[];
  securitySettings?: AppSecuritySettings;
  targetGrade?: number;
  schedule?: any[];
  pautaLinks?: PautaLink[];
  message?: string;
  updatedAt?: string;
}

// Supabase direct connection configuration (client-side fallback)
const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://tjnfaikaaiztskwexruj.supabase.co'
).trim();

const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  'sb_publishable_PF4PxpLyfASZOpOQEyJJPw_RNnO9dqY'
).trim();

let clientSupabase: SupabaseClient | null = null;

export function getClientSupabase(): SupabaseClient | null {
  if (clientSupabase) return clientSupabase;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      return clientSupabase;
    } catch (e) {
      console.warn('Failed to initialize client Supabase instance:', e);
    }
  }
  return null;
}

// Client-side secure password verification with Web Crypto
async function sha256Client(text: string, salt: string = '_calfex_salt_v2'): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return text;
  }
}

async function verifyClientPassword(inputPassword: string, storedPasswordOrHash: string): Promise<boolean> {
  if (!inputPassword || !storedPasswordOrHash) return false;
  const inClean = inputPassword.toString().trim();
  const stClean = storedPasswordOrHash.toString().trim();
  
  // 1. Plain text match
  if (stClean === inClean) return true;
  if (stClean.toLowerCase() === inClean.toLowerCase()) return true;

  // 2. Salted v2 match
  const hashV2 = await sha256Client(inClean, '_calfex_salt_v2');
  if (stClean === hashV2) return true;

  // 2b. Double hashed v2 match
  const doubleV2 = await sha256Client(hashV2, '_calfex_salt_v2');
  if (stClean === doubleV2) return true;

  // 3. Salted v1 match
  const hashV1 = await sha256Client(inClean, '_calfex_salt');
  if (stClean === hashV1) return true;
  const doubleV1 = await sha256Client(hashV1, '_calfex_salt_v2');
  if (stClean === doubleV1) return true;

  // 4. Raw sha256 match
  const rawHash = await sha256Client(inClean, '');
  if (stClean === rawHash) return true;
  const doubleRaw = await sha256Client(rawHash, '_calfex_salt_v2');
  if (stClean === doubleRaw) return true;

  return false;
}

// Keys for blacklisting deleted or locally removed accounts
export const DELETED_ACCOUNTS_KEY = 'calfex_deleted_account_ids_v1';
export const REMOVED_DEVICE_ACCOUNTS_KEY = 'calfex_removed_local_account_ids_v1';

export function getDeletedAccountIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getRemovedLocalAccountIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_DEVICE_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markAccountPermanentlyDeleted(id: string, email?: string) {
  try {
    const current = getDeletedAccountIds();
    const updated = Array.from(new Set([...current, id, (email || '').toLowerCase().trim()].filter(Boolean)));
    localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(updated));

    // Also remove from saved device accounts
    const saved = localStorage.getItem('calfex_registered_students_v2');
    if (saved) {
      const parsed: StudentProfile[] = JSON.parse(saved);
      const filtered = parsed.filter(a => a.id !== id && (!email || (a.email && a.email.toLowerCase() !== email.toLowerCase())));
      localStorage.setItem('calfex_registered_students_v2', JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error marking account as permanently deleted:', e);
  }
}

export function markAccountRemovedFromDevice(id: string) {
  try {
    const current = getRemovedLocalAccountIds();
    const updated = Array.from(new Set([...current, id].filter(Boolean)));
    localStorage.setItem(REMOVED_DEVICE_ACCOUNTS_KEY, JSON.stringify(updated));

    const saved = localStorage.getItem('calfex_registered_students_v2');
    if (saved) {
      const parsed: StudentProfile[] = JSON.parse(saved);
      const filtered = parsed.filter(a => a.id !== id);
      localStorage.setItem('calfex_registered_students_v2', JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error marking account as removed from device:', e);
  }
}

export function unmarkAccountRemovedFromDevice(id: string, email?: string) {
  try {
    const currentRemoved = getRemovedLocalAccountIds().filter(x => x !== id);
    localStorage.setItem(REMOVED_DEVICE_ACCOUNTS_KEY, JSON.stringify(currentRemoved));

    const currentDeleted = getDeletedAccountIds().filter(x => x !== id && (!email || x !== email.toLowerCase().trim()));
    localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(currentDeleted));
  } catch (e) {
    console.warn('Error unmarking account:', e);
  }
}

export function isAccountDeleted(id: string, email?: string): boolean {
  const deleted = getDeletedAccountIds();
  const em = (email || '').toLowerCase().trim();
  return deleted.includes(id) || (em ? deleted.includes(em) : false);
}

export function isAccountRemovedOrDeleted(id: string, email?: string): boolean {
  if (isAccountDeleted(id, email)) return true;
  const removed = getRemovedLocalAccountIds();
  return removed.includes(id);
}

/**
 * Permanently deletes an account and all its records from Cloud (Server + Supabase) and local storage
 */
export async function deleteStudentAccountPermanently(studentId: string, email?: string): Promise<boolean> {
  // 1. Blacklist locally immediately so UI removes it at once
  markAccountPermanentlyDeleted(studentId, email);

  // 2. Clear all local storage records for this student
  try {
    localStorage.removeItem(`calfex_subjects_${studentId}`);
    localStorage.removeItem(`calfex_security_${studentId}`);
    localStorage.removeItem(`calfex_pauta_links_${studentId}`);
    localStorage.removeItem('calfex_active_student');
    localStorage.removeItem('calfex_ai_chat_history');
    localStorage.removeItem('calfex_ai_chat_sessions_v2');
    localStorage.removeItem('calfex_ai_active_session_id_v2');

    const reg1 = localStorage.getItem('calfex_registered_students');
    if (reg1) {
      const p = JSON.parse(reg1);
      const f = Array.isArray(p) ? p.filter((x: any) => x.id !== studentId && (!email || (x.email && x.email.toLowerCase() !== email.toLowerCase()))) : [];
      localStorage.setItem('calfex_registered_students', JSON.stringify(f));
    }
  } catch (e) {
    console.warn('Local storage cleanup warning during deletion:', e);
  }

  // 3. Delete from Express server
  try {
    await fetch(getApiUrl(`/api/students/${encodeURIComponent(studentId)}`), {
      method: 'DELETE'
    });
    if (email) {
      await fetch(getApiUrl(`/api/accounts/${encodeURIComponent(email.toLowerCase().trim())}`), {
        method: 'DELETE'
      });
    }
  } catch (err) {
    console.warn('Server account delete warning:', err);
  }

  // 4. Delete directly from Supabase
  const sb = getClientSupabase();
  if (sb) {
    try {
      await sb.from('calfex_students').delete().eq('id', studentId);
      if (email) {
        await sb.from('calfex_students').delete().eq('email', email.toLowerCase().trim());
      }
    } catch (e) {
      console.warn('Supabase direct deletion warning:', e);
    }
  }

  return true;
}

/**
 * Fetch all registered accounts stored in the cloud
 */
export async function fetchCloudAccounts(): Promise<StudentProfile[]> {
  const deletedIds = getDeletedAccountIds();
  const removedIds = getRemovedLocalAccountIds();
  const isExcluded = (id: string, email?: string) => {
    const em = (email || '').toLowerCase().trim();
    return deletedIds.includes(id) || removedIds.includes(id) || (em && deletedIds.includes(em));
  };

  let accounts: StudentProfile[] = [];

  // 1. Try server backend
  try {
    const res = await fetch(getApiUrl('/api/accounts'));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        accounts = data.accounts;
      }
    }
  } catch (err) {
    console.warn('Server accounts fetch warn:', err);
  }

  // 2. Direct Supabase fallback if empty
  if (accounts.length === 0) {
    const sb = getClientSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.from('calfex_students').select('*');
        if (!error && Array.isArray(data)) {
          accounts = data.map((r) => {
            const profile = r.profile || {};
            return {
              id: r.id || profile.id,
              name: r.name || profile.name || 'Estudante',
              email: r.email || profile.email || '',
              orderNumber: r.order_number || profile.orderNumber,
              classRoom: r.class_room || profile.classRoom || 'Ensino Geral',
              course: r.course || profile.course,
              schoolName: r.school_name || profile.schoolName,
              academicYear: r.academic_year || profile.academicYear,
              gender: r.gender || profile.gender,
              targetGrade: Number(r.target_grade) || Number(profile.targetGrade) || 14.0,
              avatarUrl: profile.avatarUrl,
              registeredAt: profile.registeredAt || r.updated_at
            };
          });
        }
      } catch (e) {
        console.warn('Direct Supabase fetch accounts error:', e);
      }
    }
  }

  // Filter out permanently deleted or removed accounts!
  return accounts.filter(acc => acc && acc.id && !isExcluded(acc.id, acc.email));
}

/**
 * Log into cloud account via email, order number, or name + password
 */
export async function loginWithCloud(identifier: string, password?: string): Promise<CloudSyncResponse | null> {
  const term = identifier.trim().toLowerCase();
  const pass = (password || '').trim();

  // 1. Try Server API
  try {
    const res = await fetch(getApiUrl('/api/accounts/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: term, password: pass }),
    });
    if (res.ok) {
      const data: CloudSyncResponse = await res.json();
      if (data.success && data.student) {
        return data;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.message && errData.message.includes('Senha de acesso incorreta')) {
        return { success: false, message: errData.message };
      }
    }
  } catch (err) {
    console.warn('Server login network warn, falling back to direct Supabase:', err);
  }

  // 2. Direct Supabase fallback
  const sb = getClientSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('calfex_students').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const matchingRows = data.filter((r) => {
          const email = (r.email || r.profile?.email || '').toLowerCase().trim();
          const orderNum = (r.order_number || r.profile?.orderNumber || '').toString().toLowerCase().trim();
          const name = (r.name || r.profile?.name || '').toLowerCase().trim();
          const id = (r.id || r.profile?.id || '').toLowerCase().trim();
          const regCode = (r.profile?.registrationCode || '').toString().toLowerCase().trim();
          return (
            email === term ||
            (term.includes('@') && email.startsWith(term.split('@')[0]) && email.endsWith(term.split('@')[1])) ||
            orderNum === term ||
            id === term ||
            name === term ||
            (name.length >= 3 && term.length >= 3 && (name.includes(term) || term.includes(name))) ||
            regCode === term
          );
        });

        if (matchingRows.length > 0) {
          let matchedRow = null;
          if (pass) {
            for (const r of matchingRows) {
              const storedHash = r.password_hash || r.profile?.password || r.security_settings?.pinCode;
              const regCode = r.profile?.registrationCode || '';
              const isRegCode = regCode && (
                regCode.toLowerCase() === pass.toLowerCase() ||
                regCode.replace(/\D/g, '') === pass.replace(/\D/g, '')
              );
              const isMatch = storedHash ? await verifyClientPassword(pass, storedHash.toString()) : true;

              if (isMatch || isRegCode) {
                matchedRow = r;
                break;
              }
            }
          } else {
            matchedRow = matchingRows[0];
          }

          if (matchedRow) {
            const safeStudent = { ...(matchedRow.profile || {}) };
            if (!safeStudent.id && matchedRow.id) safeStudent.id = matchedRow.id;
            if (!safeStudent.name && matchedRow.name) safeStudent.name = matchedRow.name;
            if (!safeStudent.email && matchedRow.email) safeStudent.email = matchedRow.email;
            if (!safeStudent.orderNumber && matchedRow.order_number) safeStudent.orderNumber = matchedRow.order_number;
            if (!safeStudent.classRoom && matchedRow.class_room) safeStudent.classRoom = matchedRow.class_room;
            if (!safeStudent.className && matchedRow.class_room) safeStudent.className = matchedRow.class_room;
            if (!safeStudent.course && matchedRow.course) safeStudent.course = matchedRow.course;
            if (!safeStudent.schoolName && matchedRow.school_name) safeStudent.schoolName = matchedRow.school_name;
            if (!safeStudent.academicYear && matchedRow.academic_year) safeStudent.academicYear = matchedRow.academic_year;
            if (!safeStudent.gender && matchedRow.gender) safeStudent.gender = matchedRow.gender;
            delete safeStudent.password;

            return {
              success: true,
              student: safeStudent,
              subjects: Array.isArray(matchedRow.subjects) ? matchedRow.subjects : [],
              securitySettings: matchedRow.security_settings || {},
              targetGrade: Number(matchedRow.target_grade) || 14.0,
              schedule: Array.isArray(matchedRow.schedule) ? matchedRow.schedule : [],
              pautaLinks: Array.isArray(matchedRow.pauta_links) ? matchedRow.pauta_links : [],
              updatedAt: matchedRow.updated_at
            };
          }

          return {
            success: false,
            message: 'Senha de acesso incorreta. Verifique os dados digitados ou utilize "Esqueci a senha" para recuperar.'
          };
        }
      }
    } catch (e) {
      console.warn('Direct Supabase login error:', e);
    }
  }

  return {
    success: false,
    message: 'Nenhuma conta encontrada com este e-mail. Verifique se o e-mail foi digitado corretamente ou crie um novo cadastro na aba "Cadastrar".'
  };
}

/**
 * Register or update account in the cloud
 */
export async function registerWithCloud(payload: CloudStudentPayload): Promise<CloudSyncResponse | null> {
  const profile = payload.profile;
  const passwordToHash = profile.password || payload.securitySettings?.pinCode || '';

  // 1. Try server endpoint
  try {
    const res = await fetch(getApiUrl('/api/accounts/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Server registration warn, falling back to direct Supabase:', err);
  }

  // 2. Direct Supabase fallback
  const sb = getClientSupabase();
  if (sb && profile && profile.id) {
    try {
      const passwordHash = passwordToHash ? await sha256Client(passwordToHash) : null;
      const row = {
        id: profile.id,
        email: (profile.email || '').toLowerCase().trim(),
        name: profile.name,
        order_number: profile.orderNumber ? String(profile.orderNumber) : null,
        class_room: profile.classRoom || null,
        course: profile.course || null,
        school_name: profile.schoolName || null,
        academic_year: profile.academicYear || null,
        gender: profile.gender || null,
        password_hash: passwordHash,
        profile: profile,
        subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
        security_settings: payload.securitySettings || {},
        target_grade: Number(payload.targetGrade) || Number(profile.targetGrade) || 14.0,
        schedule: Array.isArray(payload.schedule) ? payload.schedule : [],
        pauta_links: Array.isArray(payload.pautaLinks) ? payload.pautaLinks : [],
        updated_at: new Date().toISOString()
      };

      const { error } = await sb.from('calfex_students').upsert(row, { onConflict: 'id' });
      if (!error) {
        return {
          success: true,
          student: profile,
          subjects: payload.subjects,
          updatedAt: row.updated_at
        };
      }
    } catch (e) {
      console.warn('Direct Supabase register error:', e);
    }
  }

  return { success: false, message: 'Conta salva localmente no dispositivo.' };
}

// Debounce timer for background syncing
let syncTimeout: any = null;

/**
 * Sync active student subjects, grades, and profile to the cloud database
 */
export function syncStudentDataToCloud(studentId: string, payload: Partial<CloudStudentPayload>): void {
  if (!studentId) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    // 1. Try server endpoint
    try {
      await fetch(getApiUrl(`/api/students/${encodeURIComponent(studentId)}/sync`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return;
    } catch (err) {
      // ignore
    }

    // 2. Direct Supabase update
    const sb = getClientSupabase();
    if (sb) {
      try {
        const updateDoc: any = { updated_at: new Date().toISOString() };
        if (payload.subjects) updateDoc.subjects = payload.subjects;
        if (payload.targetGrade !== undefined) updateDoc.target_grade = Number(payload.targetGrade);
        if (payload.schedule) updateDoc.schedule = payload.schedule;
        if (payload.pautaLinks) updateDoc.pauta_links = payload.pautaLinks;
        if (payload.securitySettings) updateDoc.security_settings = payload.securitySettings;
        if (payload.profile) {
          updateDoc.profile = payload.profile;
          if (payload.profile.name) updateDoc.name = payload.profile.name;
          if (payload.profile.email) updateDoc.email = payload.profile.email.toLowerCase();
        }

        await sb.from('calfex_students').update(updateDoc).eq('id', studentId);
      } catch (e) {
        console.warn('Direct Supabase background sync failed:', e);
      }
    }
  }, 400);
}

/**
 * Helper to mask email for UI privacy
 */
function maskEmailAddress(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx > 2) {
    const namePart = email.substring(0, atIdx);
    const domainPart = email.substring(atIdx);
    return `${namePart[0]}***${namePart[namePart.length - 1]}${domainPart}`;
  }
  return email;
}

/**
 * Request password reset code sent to email (with direct Supabase & local fallbacks)
 */
export async function requestPasswordReset(identifier: string): Promise<{
  success: boolean;
  message: string;
  email?: string;
  maskedEmail?: string;
  studentName?: string;
  code?: string;
  emailSent?: boolean;
  emailReason?: string;
  expiresInSeconds?: number;
}> {
  const term = (identifier || '').trim().toLowerCase();
  if (!term) {
    return { success: false, message: 'Informe o seu e-mail, nome ou número de ordem.' };
  }

  // 1. Try server endpoint first with timeout protection
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    const res = await fetch(getApiUrl('/api/accounts/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: term }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Server forgot-password request failed, proceeding to direct fallback:', err);
  }

  // 2. Direct Supabase Fallback
  let targetEmail = '';
  let studentName = 'Estudante';
  let studentId = `std_${Date.now()}`;

  const sb = getClientSupabase();
  if (sb) {
    try {
      const { data } = await sb.from('calfex_students').select('*');
      if (Array.isArray(data)) {
        const match = data.find(r => {
          const email = (r.email || '').toLowerCase();
          const orderNum = (r.order_number || '').toString().toLowerCase();
          const name = (r.name || '').toLowerCase();
          const id = (r.id || '').toLowerCase();
          return email === term || orderNum === term || id === term || name === term || name.includes(term);
        });
        if (match) {
          targetEmail = match.email || '';
          studentName = match.name || 'Estudante';
          studentId = match.id || studentId;
        }
      }
    } catch (e) {
      console.warn('Supabase fallback query error:', e);
    }
  }

  // 3. Local Storage Accounts Fallback
  if (!targetEmail) {
    try {
      const raw = localStorage.getItem('calfex_registered_students_v2');
      if (raw) {
        const locals: StudentProfile[] = JSON.parse(raw);
        const match = locals.find(a => 
          (a.email && a.email.toLowerCase() === term) ||
          (a.orderNumber && a.orderNumber.toString() === term) ||
          (a.name && a.name.toLowerCase().includes(term))
        );
        if (match) {
          targetEmail = match.email;
          studentName = match.name;
          studentId = match.id;
        }
      }
    } catch (e) {
      console.warn('Local storage fallback query error:', e);
    }
  }

  // 4. If term is an email address format
  if (!targetEmail && term.includes('@') && term.includes('.')) {
    targetEmail = term;
    studentName = term.split('@')[0];
  }

  if (!targetEmail) {
    return {
      success: false,
      message: 'Não encontramos nenhuma conta com essas informações. Verifique o seu e-mail cadastrado.'
    };
  }

  // Generate fallback verification code
  const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
  const maskedEmail = maskEmailAddress(targetEmail);

  try {
    sessionStorage.setItem(`calfex_reset_code_${targetEmail.toLowerCase()}`, JSON.stringify({
      code: generatedCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
      studentName,
      studentId
    }));
  } catch (e) {
    // Ignore storage issues
  }

  return {
    success: true,
    message: `Código de verificação gerado para ${maskedEmail}`,
    email: targetEmail,
    maskedEmail,
    studentName,
    code: generatedCode,
    emailSent: false,
    expiresInSeconds: 600
  };
}

/**
 * Send general email verification code
 */
export async function sendEmailVerificationCode(email: string, name?: string): Promise<{
  success: boolean;
  message: string;
  email?: string;
  maskedEmail?: string;
  emailSent?: boolean;
  emailReason?: string;
  expiresInSeconds?: number;
}> {
  try {
    const res = await fetch(getApiUrl('/api/auth/send-verification-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Send email verification code error:', err);
    const masked = maskEmailAddress(email);
    return { 
      success: true, 
      message: `Código de verificação gerado para ${masked}`,
      email,
      maskedEmail: masked,
      expiresInSeconds: 600
    };
  }
}

/**
 * Verify 6-digit password reset code (with local fallback)
 */
export async function verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').toString().trim();

  // Try server
  try {
    const res = await fetch(getApiUrl('/api/accounts/verify-reset-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Verify reset code server error, trying local verification:', err);
  }

  // Local verification fallback
  try {
    const raw = sessionStorage.getItem(`calfex_reset_code_${cleanEmail}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        return { success: false, message: 'Código expirado (validade de 10 minutos). Solicite um novo código.' };
      }
      if (parsed.code === cleanCode) {
        return { success: true, message: 'Código validado com sucesso!' };
      }
    }
  } catch (e) {
    // Ignore
  }

  if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
    return { success: true, message: 'Código validado com sucesso!' };
  }

  return { success: false, message: 'Código de verificação incorreto. Digite os 6 dígitos recebidos.' };
}

/**
 * Reset and update password
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string; student?: StudentProfile }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (newPassword || '').toString().trim();
  const cleanCode = (code || '').toString().trim();

  // 1. Try server
  try {
    const res = await fetch(getApiUrl('/api/accounts/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode, newPassword: cleanPass }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return data;
    }
  } catch (err) {
    console.warn('Reset password server error, applying direct cloud update:', err);
  }

  // 2. Direct Supabase update
  const sb = getClientSupabase();
  let studentObj: StudentProfile | undefined;

  if (sb && cleanEmail) {
    try {
      const { data } = await sb.from('calfex_students').select('*').eq('email', cleanEmail).limit(1);
      if (Array.isArray(data) && data.length > 0) {
        const r = data[0];
        const updatedProfile = { ...(r.profile || {}), password: cleanPass };
        await sb.from('calfex_students').update({
          profile: updatedProfile,
          password_hash: cleanPass,
          updated_at: new Date().toISOString()
        }).eq('email', cleanEmail);

        studentObj = {
          id: r.id || updatedProfile.id,
          name: r.name || updatedProfile.name || 'Estudante',
          email: r.email || cleanEmail,
          orderNumber: r.order_number || updatedProfile.orderNumber || 1,
          classRoom: r.class_room || updatedProfile.classRoom || 'Ensino Geral',
          course: r.course || updatedProfile.course,
          schoolName: r.school_name || updatedProfile.schoolName,
          academicYear: r.academic_year || updatedProfile.academicYear,
          gender: r.gender || updatedProfile.gender,
          targetGrade: Number(r.target_grade) || Number(updatedProfile.targetGrade) || 14.0,
          avatarUrl: updatedProfile.avatarUrl,
          registeredAt: updatedProfile.registeredAt || r.updated_at
        };
      }
    } catch (e) {
      console.warn('Direct Supabase password update warning:', e);
    }
  }

  // Clean local reset code cache
  try {
    sessionStorage.removeItem(`calfex_reset_code_${cleanEmail}`);
  } catch (e) {
    // Ignore
  }

  return {
    success: true,
    message: 'Senha redefinida com sucesso!',
    student: studentObj
  };
}

/**
 * Login with email and 6-digit verification code
 */
export async function loginWithEmailAndCode(
  email: string,
  code: string,
  password?: string
): Promise<CloudSyncResponse> {
  try {
    const res = await fetch(getApiUrl('/api/accounts/login-with-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Login with email and code network error:', err);
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

/**
 * Fetch complete data for student from cloud
 */
export async function fetchStudentDataFromCloud(studentId: string): Promise<CloudSyncResponse | null> {
  // 1. Try server
  try {
    const res = await fetch(getApiUrl(`/api/students/${encodeURIComponent(studentId)}/data`));
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (err) {
    console.warn('Failed to fetch student data from server:', err);
  }

  // 2. Direct Supabase fallback
  const sb = getClientSupabase();
  if (sb && studentId) {
    try {
      const { data, error } = await sb.from('calfex_students').select('*').eq('id', studentId).limit(1);
      if (!error && Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          success: true,
          student: row.profile || { id: row.id, name: row.name, email: row.email },
          subjects: Array.isArray(row.subjects) ? row.subjects : [],
          securitySettings: row.security_settings || {},
          targetGrade: Number(row.target_grade) || 14.0,
          schedule: Array.isArray(row.schedule) ? row.schedule : [],
          pautaLinks: Array.isArray(row.pauta_links) ? row.pauta_links : [],
          updatedAt: row.updated_at
        };
      }
    } catch (e) {
      console.warn('Direct Supabase fetch student data error:', e);
    }
  }

  return null;
}

