import { StudentProfile, Subject, AppSecuritySettings, PautaLink } from '../types';

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

/**
 * Fetch all registered accounts stored in the cloud
 */
export async function fetchCloudAccounts(): Promise<StudentProfile[]> {
  try {
    const res = await fetch('/api/accounts');
    if (!res.ok) throw new Error('Falha ao contactar a nuvem');
    const data = await res.json();
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch (err) {
    console.warn('Could not fetch cloud accounts (offline or network limit):', err);
    return [];
  }
}

/**
 * Log into cloud account via email, order number, or name + password
 */
export async function loginWithCloud(identifier: string, password?: string): Promise<CloudSyncResponse | null> {
  try {
    const res = await fetch('/api/accounts/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.message || 'Erro ao entrar na conta da nuvem' };
    }
    const data: CloudSyncResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('Cloud login network error:', err);
    return null;
  }
}

/**
 * Register or update account in the cloud
 */
export async function registerWithCloud(payload: CloudStudentPayload): Promise<CloudSyncResponse | null> {
  try {
    const res = await fetch('/api/accounts/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.message || 'Erro ao registrar na nuvem' };
    }
    return await res.json();
  } catch (err) {
    console.warn('Cloud registration network error:', err);
    return null;
  }
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
    try {
      await fetch(`/api/students/${encodeURIComponent(studentId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Cloud background sync warning:', err);
    }
  }, 400);
}

/**
 * Request password reset code sent to email
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
  try {
    const res = await fetch('/api/accounts/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Request password reset error:', err);
    return { success: false, message: 'Erro de conexão com o servidor. Verifique a sua rede.' };
  }
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
    const res = await fetch('/api/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Send email verification code error:', err);
    return { success: false, message: 'Erro de conexão com o servidor de e-mail.' };
  }
}

/**
 * Verify 6-digit password reset code
 */
export async function verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/accounts/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Verify reset code error:', err);
    return { success: false, message: 'Erro ao validar código. Verifique a sua rede.' };
  }
}

/**
 * Reset and update password
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string; student?: StudentProfile }> {
  try {
    const res = await fetch('/api/accounts/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Reset password error:', err);
    return { success: false, message: 'Erro ao redefinir a senha. Tente novamente.' };
  }
}

/**
 * Fetch complete data for student from cloud
 */
export async function fetchStudentDataFromCloud(studentId: string): Promise<CloudSyncResponse | null> {
  try {
    const res = await fetch(`/api/students/${encodeURIComponent(studentId)}/data`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch student data from cloud:', err);
    return null;
  }
}
