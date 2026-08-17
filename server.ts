import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

// ==========================================
// SUPABASE CLOUD DATABASE CLIENT & HELPERS
// ==========================================
let supabaseClient: SupabaseClient | null = null;
let supabaseChecked = false;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = (
    process.env.SUPABASE_URL || 
    process.env.VITE_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.REACT_APP_SUPABASE_URL || 
    ''
  ).trim();
  
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.REACT_APP_SUPABASE_ANON_KEY || 
    ''
  ).trim();

  if (url && key) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      if (!supabaseChecked) {
        supabaseChecked = true;
        console.log(`[CALFÉX SUPABASE] ✅ Conectado ao banco de dados Supabase na nuvem: ${url}`);
        // Auto migrate local records to Supabase if any
        setTimeout(() => {
          migrateLocalDataToSupabase();
        }, 1000);
      }
      return supabaseClient;
    } catch (err) {
      console.error('[CALFÉX SUPABASE] Erro ao instanciar cliente Supabase:', err);
    }
  }
  return null;
}

// Adaptive upsert to Supabase supporting multiple table schemas and columns
async function upsertStudentToSupabase(sb: SupabaseClient, row: any): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try full schema on calfex_students
    const { error: err1 } = await sb.from('calfex_students').upsert(row, { onConflict: 'id' });
    if (!err1) return { success: true };

    console.warn('[CALFÉX SUPABASE UPSERT (FULL SCHEMA) FAILED, TENTANDO ADAPTATIVO]:', err1.message);

    // 2. Try adaptive core columns
    const adaptiveRow: any = {
      id: row.id,
      email: row.email,
      name: row.name,
      profile: row.profile,
      subjects: row.subjects || [],
      updated_at: row.updated_at
    };
    if (row.password_hash) adaptiveRow.password_hash = row.password_hash;
    if (row.order_number) adaptiveRow.order_number = row.order_number;
    if (row.class_room) adaptiveRow.class_room = row.class_room;
    if (row.target_grade) adaptiveRow.target_grade = row.target_grade;

    const { error: err2 } = await sb.from('calfex_students').upsert(adaptiveRow, { onConflict: 'id' });
    if (!err2) return { success: true };

    // 3. Try minimal document payload
    const minimalRow = {
      id: row.id,
      email: row.email,
      profile: row.profile,
      updated_at: row.updated_at
    };
    const { error: err3 } = await sb.from('calfex_students').upsert(minimalRow, { onConflict: 'id' });
    if (!err3) return { success: true };

    // 4. Try fallback table name 'students'
    const { error: err4 } = await sb.from('students').upsert(row, { onConflict: 'id' });
    if (!err4) return { success: true };

    return { success: false, error: err1.message };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

// Fetch all students from Supabase (supports calfex_students and fallback students)
async function fetchAllStudentsFromSupabase(sb: SupabaseClient): Promise<any[]> {
  try {
    const { data, error } = await sb.from('calfex_students').select('*');
    if (!error && Array.isArray(data)) return data;

    const { data: data2, error: err2 } = await sb.from('students').select('*');
    if (!err2 && Array.isArray(data2)) return data2;
  } catch (err) {
    console.warn('[CALFÉX SUPABASE FETCH ALL ERROR]:', err);
  }
  return [];
}

// Fetch single student by id or email
async function fetchStudentByIdOrEmailFromSupabase(sb: SupabaseClient, idOrEmail: string): Promise<any | null> {
  const term = idOrEmail.trim().toLowerCase();
  try {
    const { data, error } = await sb
      .from('calfex_students')
      .select('*')
      .or(`id.eq.${idOrEmail},email.eq.${term}`)
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    const { data: d2, error: e2 } = await sb
      .from('students')
      .select('*')
      .or(`id.eq.${idOrEmail},email.eq.${term}`)
      .limit(1);

    if (!e2 && Array.isArray(d2) && d2.length > 0) {
      return d2[0];
    }
  } catch (err) {
    console.warn('[CALFÉX SUPABASE FETCH SINGLE ERROR]:', err);
  }
  return null;
}

// Middleware for parsing JSON and URL-encoded bodies with high limits for audio payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware allowing cross-origin requests for external hosting environments (Netlify, VPS, etc.)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// URL Normalizer for Netlify Serverless Functions and standalone servers
app.use((req, res, next) => {
  // Strip Netlify Functions function prefix if present
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  }
  // Ensure the /api prefix is present for all backend routes
  if (!req.url.startsWith('/api') && (
    req.url.startsWith('/accounts') ||
    req.url.startsWith('/students') ||
    req.url.startsWith('/auth') ||
    req.url.startsWith('/ai') ||
    req.url.startsWith('/gemini') ||
    req.url.startsWith('/send-test-email') ||
    req.url.startsWith('/health')
  )) {
    req.url = `/api${req.url}`;
  }
  next();
});

// Secure password hashing and verification
function hashPassword(password: string): string {
  if (!password) return '';
  const clean = password.toString().trim();
  // Prevent double-hashing if it's already a 64-character SHA256 hex string
  if (/^[a-f0-9]{64}$/i.test(clean)) {
    return clean;
  }
  return crypto.createHash('sha256').update(clean + '_calfex_salt_v2').digest('hex');
}

function verifyPassword(inputPassword: string, storedPasswordOrHash: string): boolean {
  if (!inputPassword || !storedPasswordOrHash) return false;
  const inputClean = inputPassword.toString().trim();
  const storedClean = storedPasswordOrHash.toString().trim();

  // 1. Plain-text exact match
  if (storedClean === inputClean) return true;

  // 2. Salted v2 SHA256 match
  const hashV2 = hashPassword(inputClean);
  if (storedClean === hashV2) return true;

  // 2b. Double salted v2 match (handles legacy double hashing)
  if (storedClean === hashPassword(hashV2)) return true;

  // 3. Legacy salt v1 SHA256 match
  const legacySalt1 = crypto.createHash('sha256').update(inputClean + '_calfex_salt').digest('hex');
  if (storedClean === legacySalt1) return true;
  if (storedClean === hashPassword(legacySalt1)) return true;

  // 4. Raw SHA256 match
  const rawSha = crypto.createHash('sha256').update(inputClean).digest('hex');
  if (storedClean === rawSha) return true;
  if (storedClean === hashPassword(rawSha)) return true;

  // 5. Case-insensitive plain text match
  if (storedClean.toLowerCase() === inputClean.toLowerCase()) return true;

  return false;
}

// Official CalFéx Sender Email
const rawSender = process.env.CALFEX_SENDER_EMAIL;
const CALFEX_SENDER_EMAIL = (typeof rawSender === 'string' && rawSender.includes('@')) 
  ? rawSender.trim() 
  : 'calfex39@gmail.com';

// Setup email transporter options for real sending with fallback
function getCleanEmailPassword(): string | null {
  const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.CALFEX_EMAIL_PASSWORD || 'nsey fvmg vgdu stzd';
  if (!rawPass || typeof rawPass !== 'string' || rawPass.trim() === '') {
    return null;
  }
  // Sanitize password by stripping quotes (" or ') and all spaces/newlines
  const clean = rawPass.replace(/["']/g, '').replace(/\s+/g, '').trim();
  return clean || null;
}

// Send real verification email with custom Calféx branding and connection fallbacks
async function sendCalfexVerificationEmail(toEmail: string, studentName: string, code: string): Promise<{ sent: boolean; reason?: string }> {
  const cleanPass = getCleanEmailPassword();

  if (!cleanPass) {
    console.warn(`[CALFÉX SENDER: ${CALFEX_SENDER_EMAIL}] ✉️ GMAIL_APP_PASSWORD não configurada no servidor. Código de 6 dígitos gerado para ${toEmail}: ${code}`);
    return { sent: false, reason: 'GMAIL_APP_PASSWORD_MISSING' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificação Calféx</title>
      <style>
        body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
        .container { max-width: 540px; margin: 30px auto; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%); padding: 32px 24px; text-align: center; }
        .logo-title { color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
        .logo-sub { color: #bfdbfe; font-size: 13px; font-weight: 600; margin-top: 4px; letter-spacing: 0.5px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-top: 0; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0; }
        .code-box { background: #0f172a; border: 2px dashed #3b82f6; border-radius: 16px; padding: 22px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 13px; font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .code-number { font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 10px; font-family: monospace; }
        .notice { font-size: 12px; color: #cbd5e1; background: rgba(59, 130, 246, 0.12); border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; }
        .footer { border-top: 1px solid #334155; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-title">Calféx</h1>
          <div class="logo-sub">SISTEMA DE GESTÃO ACADÊMICA & SEGURANÇA</div>
        </div>
        <div class="content">
          <h2 class="greeting">Olá, ${studentName}!</h2>
          <p class="text">
            Este é o seu código de verificação de segurança no aplicativo <strong>Calféx</strong>:
          </p>
          
          <div class="code-box">
            <div class="code-label">Seu Código de Verificação</div>
            <div class="code-number">${code}</div>
          </div>
          
          <div class="notice">
            ⏳ <strong>Validade:</strong> Este código expira em <strong>10 minutos</strong>. Insira os 6 dígitos no aplicativo para concluir a verificação da sua conta.
          </div>
          
          <p class="text" style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            Mensagem enviada pelo e-mail oficial <strong>${CALFEX_SENDER_EMAIL}</strong> para <strong>${toEmail}</strong>.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Calféx. Todos os direitos reservados.<br>
          Remetente oficial: ${CALFEX_SENDER_EMAIL}
        </div>
      </div>
    </body>
    </html>
  `;

  // Try multiple configurations (Gmail service first for highest deliverability, then direct SSL 465, then STARTTLS 587)
  const configurations = [
    {
      service: 'gmail',
      auth: { user: CALFEX_SENDER_EMAIL, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 3500,
      greetingTimeout: 3500
    },
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: CALFEX_SENDER_EMAIL, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 3500,
      greetingTimeout: 3500
    },
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: CALFEX_SENDER_EMAIL, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 3500,
      greetingTimeout: 3500
    }
  ];

  let lastError: any = null;

  for (const config of configurations) {
    try {
      const transporter = nodemailer.createTransport(config as any);
      const info = await transporter.sendMail({
        from: `"Calféx" <${CALFEX_SENDER_EMAIL}>`,
        to: toEmail,
        subject: `Este é o seu código de verificação: ${code} - Calféx`,
        text: `Olá ${studentName},\n\nEste é o seu código de verificação: ${code}\n\nUtilize este código para confirmar a sua identidade no aplicativo Calféx.\nValidade: 10 minutos.\n\nRemetente: ${CALFEX_SENDER_EMAIL}`,
        html: htmlContent
      });
      console.log(`[CALFÉX EMAIL DISPATCHED] ✅ E-mail enviado com sucesso de ${CALFEX_SENDER_EMAIL} para ${toEmail}. Message ID: ${info.messageId}`);
      return { sent: true };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      if (errMsg.includes('535') || errMsg.includes('Username and Password not accepted') || errMsg.includes('BadCredentials')) {
        console.error(`[CALFÉX EMAIL AUTHENTICATION NOTICE] O Gmail recusou a autenticação para ${CALFEX_SENDER_EMAIL}.`);
        console.error(`Dica: O Google exige uma "Senha de App" de 16 letras gerada em https://myaccount.google.com/apppasswords na conta ${CALFEX_SENDER_EMAIL}, e não a senha de login comum.`);
        return { 
          sent: false, 
          reason: 'GMAIL_AUTH_535: O Gmail não aceitou o usuário ou a senha. É necessário gerar uma Senha de App de 16 caracteres em https://myaccount.google.com/apppasswords na conta calfex39@gmail.com com verificação em 2 etapas ativada.' 
        };
      }
    }
  }

  const finalErrMsg = lastError?.message || String(lastError || 'SMTP Error');
  console.error(`[CALFÉX EMAIL ERROR] Falha ao enviar e-mail de ${CALFEX_SENDER_EMAIL} para ${toEmail}:`, finalErrMsg);
  return { sent: false, reason: finalErrMsg };
}

app.use(express.json({ limit: '15mb' }));

// ==========================================
// 1. CLOUD STORAGE DATABASE (Supabase & Multi-device Sync)
// ==========================================
interface CloudStudentRecord {
  profile: any;
  subjects: any[];
  securitySettings?: any;
  targetGrade?: number;
  schedule?: any[];
  pautaLinks?: any[];
  updatedAt: string;
}

interface CloudDatabase {
  [studentId: string]: CloudStudentRecord;
}

function getDatabaseFilePath(): string {
  if (process.env.DB_FILE_PATH) {
    return process.env.DB_FILE_PATH;
  }
  const defaultDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    const testFile = path.join(defaultDir, '.write_test');
    fs.writeFileSync(testFile, '1', 'utf-8');
    fs.unlinkSync(testFile);
    return path.join(defaultDir, 'calfex_cloud_db.json');
  } catch (e) {
    // If standard filesystem is read-only (e.g. serverless functions /tmp), fallback to /tmp
    const tmpDir = path.join('/tmp', 'calfex_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return path.join(tmpDir, 'calfex_cloud_db.json');
    } catch {
      return path.join(defaultDir, 'calfex_cloud_db.json');
    }
  }
}

// Ensure data directory exists and database file is initialized
function ensureDataDirExists(): string {
  const dbPath = getDatabaseFilePath();
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('Could not initialize data directory or db file:', e);
  }
  return dbPath;
}

ensureDataDirExists();

function loadCloudDb(): CloudDatabase {
  try {
    const dbPath = ensureDataDirExists();
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data || '{}');
    }
  } catch (err) {
    console.error('Error loading cloud database file:', err);
  }
  return {};
}

function saveCloudDb(db: CloudDatabase): void {
  try {
    const dbPath = ensureDataDirExists();
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to cloud database file:', err);
  }
}

// In-memory active database
let cloudDatabase: CloudDatabase = loadCloudDb();

// In-memory store for password reset verification codes
const passwordResetCodes: { [email: string]: { code: string; studentId: string; expiresAt: number; studentName: string } } = {};

// Auto-migration from local storage to Supabase cloud database
async function migrateLocalDataToSupabase() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const localKeys = Object.keys(cloudDatabase);
    if (localKeys.length === 0) return;

    for (const key of localKeys) {
      const rec = cloudDatabase[key];
      if (!rec || !rec.profile) continue;

      const profile = rec.profile;
      const studentId = rec.profile.id || key;
      const email = rec.profile.email || `${studentId}@calfex.ao`;
      const name = rec.profile.name || 'Estudante';
      const orderNumber = rec.profile.orderNumber ? String(rec.profile.orderNumber) : null;
      const className = rec.profile.className || rec.profile.classRoom || null;
      const course = rec.profile.course || null;
      const schoolName = rec.profile.schoolName || null;
      const academicYear = rec.profile.academicYear || null;
      const gender = rec.profile.gender || null;
      const passwordHash = rec.profile.password ? hashPassword(rec.profile.password) : (rec.securitySettings?.pinCode ? hashPassword(rec.securitySettings.pinCode) : null);

      const row = {
        id: studentId,
        email: email.toLowerCase(),
        name: name,
        order_number: orderNumber,
        class_room: className,
        course: course,
        school_name: schoolName,
        academic_year: academicYear,
        gender: gender,
        password_hash: passwordHash,
        profile: profile,
        subjects: Array.isArray(rec.subjects) ? rec.subjects : [],
        security_settings: rec.securitySettings || {},
        target_grade: rec.targetGrade || profile.targetGrade || 14,
        schedule: Array.isArray(rec.schedule) ? rec.schedule : [],
        pauta_links: Array.isArray(rec.pautaLinks) ? rec.pautaLinks : [],
        updated_at: rec.updatedAt || new Date().toISOString()
      };

      const result = await upsertStudentToSupabase(sb, row);
      if (result.success) {
        console.log(`[CALFÉX SUPABASE MIGRATION] ✅ Conta ${name} (${email}) sincronizada com o Supabase!`);
      }
    }
  } catch (err) {
    console.warn('[CALFÉX SUPABASE MIGRATION] Falha na auto-migração para Supabase:', err);
  }
}

// ==========================================
// 2. CLOUD ACCOUNT & MULTI-DEVICE ENDPOINTS (SUPABASE INTEGRATED)
// ==========================================

// Diagnostic endpoint to check Supabase connection & table health
app.get('/api/supabase/status', async (req, res) => {
  const url = (
    process.env.SUPABASE_URL || 
    process.env.VITE_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.REACT_APP_SUPABASE_URL || 
    ''
  ).trim();

  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.REACT_APP_SUPABASE_ANON_KEY || 
    ''
  ).trim();

  const sqlSetupScript = `
-- CRIE A TABELA DE CONTAS CALFÉX NO SUPABASE (SQL EDITOR)
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

-- HABILITAR PERMISSÕES DE LEITURA E ESCRITA
ALTER TABLE public.calfex_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to calfex_students" ON public.calfex_students;
CREATE POLICY "Allow all access to calfex_students" ON public.calfex_students FOR ALL USING (true) WITH CHECK (true);
`.trim();

  if (!url || !key) {
    return res.json({
      connected: false,
      configured: false,
      tableExists: false,
      message: 'SUPABASE_URL e SUPABASE_KEY não configuradas no servidor.',
      urlConfigured: !!url,
      keyConfigured: !!key,
      totalLocalAccounts: Object.keys(cloudDatabase).length,
      sqlSetupScript
    });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.json({
      connected: false,
      configured: true,
      tableExists: false,
      message: 'Falha ao inicializar o cliente Supabase.',
      sqlSetupScript
    });
  }

  try {
    const { data, error } = await sb.from('calfex_students').select('id').limit(1);
    if (error) {
      const isMissingTable = error.code === 'PGRST205' || (error.message && error.message.includes('schema cache'));
      return res.json({
        connected: true,
        configured: true,
        tableExists: false,
        tableError: error.message,
        message: isMissingTable 
          ? 'Conexão com Supabase ativa, mas a tabela "calfex_students" ainda não foi criada no painel do Supabase.' 
          : error.message,
        sqlSetupScript,
        totalLocalAccounts: Object.keys(cloudDatabase).length
      });
    }

    const students = await fetchAllStudentsFromSupabase(sb);
    return res.json({
      connected: true,
      configured: true,
      tableExists: true,
      totalCloudAccounts: students.length,
      totalLocalAccounts: Object.keys(cloudDatabase).length,
      message: 'Conectado com sucesso ao Supabase e tabela "calfex_students" operacional!'
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      configured: true,
      tableExists: false,
      error: err?.message || String(err),
      sqlSetupScript
    });
  }
});

// Endpoint to provide SQL setup script
app.get('/api/supabase/setup-sql', (req, res) => {
  res.type('text/plain').send(`
-- =======================================================
-- SCRIPT SQL PARA CRIAR TABELA NO SUPABASE (CALFÉX APP)
-- Acesse: Painel Supabase > SQL Editor > Cole e clique em Run
-- =======================================================

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

-- Habilitar RLS e permitir operações da API
ALTER TABLE public.calfex_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to calfex_students" ON public.calfex_students;
CREATE POLICY "Allow all access to calfex_students" ON public.calfex_students FOR ALL USING (true) WITH CHECK (true);
`.trim());
});

// Get list of all registered student profiles in the cloud
app.get('/api/accounts', async (req, res) => {
  try {
    const sb = getSupabase();
    if (sb) {
      const data = await fetchAllStudentsFromSupabase(sb);
      if (Array.isArray(data) && data.length > 0) {
        const accounts = data.map(row => {
          const profile = row.profile || {};
          const safe = {
            id: row.id || profile.id,
            name: row.name || profile.name,
            email: row.email || profile.email,
            orderNumber: row.order_number || profile.orderNumber,
            className: row.class_room || profile.className || profile.classRoom,
            classRoom: row.class_room || profile.classRoom || profile.className,
            course: row.course || profile.course,
            schoolName: row.school_name || profile.schoolName,
            academicYear: row.academic_year || profile.academicYear,
            gender: row.gender || profile.gender,
            targetGrade: row.target_grade || profile.targetGrade || 14,
            registeredAt: profile.registeredAt
          };
          return safe;
        });
        return res.json({ accounts });
      }
    }

    const profiles = Object.values(cloudDatabase).map(r => {
      if (!r.profile) return null;
      const safe = { ...r.profile };
      delete safe.password;
      return safe;
    }).filter(Boolean);
    res.json({ accounts: profiles });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas na nuvem' });
  }
});

// Login from any device using Email, Order Number, or Name + Password or Registration Code
app.post('/api/accounts/login', async (req, res) => {
  const identifier = req.body?.identifier;
  const password = req.body?.password;

  if (!identifier || typeof identifier !== 'string') {
    return res.status(400).json({ success: false, message: 'Por favor, informe o seu E-mail cadastrado.' });
  }

  const term = identifier.trim().toLowerCase();
  const inputCodeOrPass = password ? password.toString().trim() : '';
  const sb = getSupabase();

  if (sb) {
    try {
      const data = await fetchAllStudentsFromSupabase(sb);
      if (Array.isArray(data) && data.length > 0) {
        const matchingRows = data.filter(r => {
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
          // Sort by updated_at descending to check freshest first
          matchingRows.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

          let matchedRow = null;
          if (inputCodeOrPass) {
            for (const r of matchingRows) {
              const storedHash = r.password_hash || r.profile?.password || r.security_settings?.pinCode;
              const regCode = r.profile?.registrationCode || '';
              const isRegCodeMatch = regCode && (
                regCode.toLowerCase() === inputCodeOrPass.toLowerCase() ||
                regCode.replace(/\D/g, '') === inputCodeOrPass.replace(/\D/g, '')
              );
              const isPassMatch = storedHash ? verifyPassword(inputCodeOrPass, storedHash.toString()) : true;

              if (isPassMatch || isRegCodeMatch) {
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

            return res.json({
              success: true,
              student: safeStudent,
              subjects: matchedRow.subjects || [],
              securitySettings: matchedRow.security_settings || { mode: 'none' },
              targetGrade: matchedRow.target_grade || safeStudent.targetGrade || 14,
              schedule: matchedRow.schedule || [],
              pautaLinks: matchedRow.pauta_links || [],
              updatedAt: matchedRow.updated_at || new Date().toISOString()
            });
          }

          // Matched account was found, but password was wrong on all candidates
          return res.status(401).json({
            success: false,
            message: 'Senha de acesso incorreta. Verifique a senha digitada ou utilize "Esqueci a senha" para receber o código de 6 dígitos no seu e-mail.'
          });
        }
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE LOGIN] Erro na consulta ao Supabase, tentando cache local:', err);
    }
  }

  const records = Object.values(cloudDatabase);
  const matchingRecords = records.filter(r => {
    const p = r.profile;
    if (!p) return false;
    const email = (p.email || '').toLowerCase().trim();
    const orderNum = (p.orderNumber || '').toString().toLowerCase().trim();
    const name = (p.name || '').toLowerCase().trim();
    const id = (p.id || '').toLowerCase().trim();
    const regCode = (p.registrationCode || '').toString().toLowerCase().trim();
    
    return (
      email === term ||
      orderNum === term ||
      id === term ||
      name === term ||
      (name.length >= 3 && term.length >= 3 && (name.includes(term) || term.includes(name))) ||
      regCode === term
    );
  });

  if (matchingRecords.length > 0) {
    let matched = null;
    if (inputCodeOrPass) {
      for (const r of matchingRecords) {
        const studentPass = r.profile?.password || r.securitySettings?.pinCode;
        const regCode = r.profile?.registrationCode || '';
        const isRegCodeMatch = regCode && (
          regCode.toLowerCase() === inputCodeOrPass.toLowerCase() ||
          regCode.replace(/\D/g, '') === inputCodeOrPass.replace(/\D/g, '')
        );
        const isPassMatch = studentPass ? verifyPassword(inputCodeOrPass, studentPass.toString()) : true;
        if (isPassMatch || isRegCodeMatch) {
          matched = r;
          break;
        }
      }
    } else {
      matched = matchingRecords[0];
    }

    if (matched) {
      const safeStudent = { ...matched.profile };
      delete safeStudent.password;

      // Auto-sync to Supabase if connected
      if (sb) {
        const row = {
          id: matched.profile.id,
          email: (matched.profile.email || '').toLowerCase().trim(),
          name: matched.profile.name,
          order_number: matched.profile.orderNumber ? String(matched.profile.orderNumber) : null,
          class_room: matched.profile.className || matched.profile.classRoom || null,
          course: matched.profile.course || null,
          school_name: matched.profile.schoolName || null,
          academic_year: matched.profile.academicYear || null,
          gender: matched.profile.gender || null,
          password_hash: matched.profile.password || (matched.securitySettings?.pinCode ? hashPassword(matched.securitySettings.pinCode) : null),
          profile: matched.profile,
          subjects: matched.subjects || [],
          security_settings: matched.securitySettings || {},
          target_grade: matched.targetGrade || matched.profile.targetGrade || 14,
          schedule: matched.schedule || [],
          pauta_links: matched.pautaLinks || [],
          updated_at: matched.updatedAt || new Date().toISOString()
        };
        upsertStudentToSupabase(sb, row).catch(e => console.warn('Background upsert to Supabase failed:', e));
      }

      return res.json({
        success: true,
        student: safeStudent,
        subjects: matched.subjects || [],
        securitySettings: matched.securitySettings,
        targetGrade: matched.targetGrade || matched.profile.targetGrade || 14,
        schedule: matched.schedule || [],
        pautaLinks: matched.pautaLinks || [],
        updatedAt: matched.updatedAt
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Senha de acesso incorreta. Verifique os dados digitados ou utilize "Esqueci a senha" para recuperar.'
    });
  }

  return res.status(404).json({
    success: false,
    message: 'Nenhuma conta encontrada com este e-mail. Verifique se o e-mail foi digitado corretamente ou crie um novo cadastro.'
  });
});

// Login with E-mail and Registration Code or 6-Digit Verification Code
app.post('/api/accounts/login-with-code', async (req, res) => {
  const { email, code, registrationCode, password } = req.body || {};

  if (!email || (!code && !registrationCode && !password)) {
    return res.status(400).json({
      success: false,
      message: 'É obrigatório informar o e-mail e o código de cadastro ou código de verificação.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const inputCode = (code || registrationCode || password || '').toString().trim();
  const sb = getSupabase();
  let codeValid = false;

  // 1. Check if inputCode matches student's permanent registration code directly
  if (sb) {
    try {
      const { data: matchedRow } = await sb
        .from('calfex_students')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (matchedRow) {
        const studentProfile = matchedRow.profile || {};
        const regCode = (studentProfile.registrationCode || '').toString().toLowerCase();
        const cleanInput = inputCode.toLowerCase();

        if (
          (regCode && (regCode === cleanInput || regCode.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))) ||
          (matchedRow.password_hash && verifyPassword(inputCode, matchedRow.password_hash))
        ) {
          codeValid = true;
          const safeStudent = { ...studentProfile };
          delete safeStudent.password;

          return res.json({
            success: true,
            message: 'Autenticação por código de cadastro realizada com sucesso!',
            student: safeStudent,
            subjects: matchedRow.subjects || [],
            securitySettings: matchedRow.security_settings || { mode: 'none' },
            targetGrade: matchedRow.target_grade || safeStudent.targetGrade || 14,
            schedule: matchedRow.schedule || [],
            pautaLinks: matchedRow.pauta_links || [],
            updatedAt: matchedRow.updated_at || new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE CHECK REG CODE ERROR]:', err);
    }
  }

  // Check in-memory database for permanent registration code
  const memRecord = Object.values(cloudDatabase).find(r => r.profile?.email?.toLowerCase() === cleanEmail);
  if (memRecord && memRecord.profile) {
    const regCode = (memRecord.profile.registrationCode || '').toString().toLowerCase();
    const cleanInput = inputCode.toLowerCase();
    if (
      (regCode && (regCode === cleanInput || regCode.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))) ||
      (memRecord.profile.password && verifyPassword(inputCode, memRecord.profile.password))
    ) {
      const safeStudent = { ...memRecord.profile };
      delete safeStudent.password;
      return res.json({
        success: true,
        message: 'Autenticação por código de cadastro realizada com sucesso!',
        student: safeStudent,
        subjects: memRecord.subjects || [],
        securitySettings: memRecord.securitySettings,
        targetGrade: memRecord.targetGrade || safeStudent.targetGrade || 14,
        schedule: memRecord.schedule || [],
        pautaLinks: memRecord.pautaLinks || [],
        updatedAt: memRecord.updatedAt
      });
    }
  }

  // 2. Check temporary 6-digit email verification code
  if (sb) {
    try {
      const { data: resetData } = await sb
        .from('calfex_password_resets')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (resetData) {
        if (Date.now() > Number(resetData.expires_at)) {
          await sb.from('calfex_password_resets').delete().eq('email', cleanEmail);
          return res.status(400).json({ success: false, message: 'Este código expirou. Solicite um novo código de verificação para o seu e-mail.' });
        }
        if (resetData.code === inputCode) {
          codeValid = true;
          await sb.from('calfex_password_resets').delete().eq('email', cleanEmail);
        }
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE LOGIN WITH CODE ERROR]:', err);
    }
  }

  if (!codeValid) {
    const memoryRecord = passwordResetCodes[cleanEmail];
    if (memoryRecord) {
      if (Date.now() > memoryRecord.expiresAt) {
        delete passwordResetCodes[cleanEmail];
        return res.status(400).json({ success: false, message: 'Este código expirou. Solicite um novo código.' });
      }
      if (memoryRecord.code === inputCode) {
        codeValid = true;
        delete passwordResetCodes[cleanEmail];
      }
    }
  }

  if (!codeValid) {
    return res.status(400).json({
      success: false,
      message: 'Código de cadastro ou código de verificação incorreto. Verifique os dados digitados ou solicite um código para o seu e-mail.'
    });
  }

  // Code is verified! Now retrieve student profile
  if (sb) {
    try {
      const { data: matchedRow } = await sb
        .from('calfex_students')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (matchedRow) {
        const studentProfile = matchedRow.profile || {
          id: matchedRow.id,
          name: matchedRow.name,
          email: matchedRow.email,
          orderNumber: matchedRow.order_number,
          className: matchedRow.class_room,
          classRoom: matchedRow.class_room,
          course: matchedRow.course,
          schoolName: matchedRow.school_name,
          academicYear: matchedRow.academic_year,
          gender: matchedRow.gender,
          targetGrade: matchedRow.target_grade
        };

        const safeStudent = { ...studentProfile };
        delete safeStudent.password;

        return res.json({
          success: true,
          message: 'Autenticação por código realizada com sucesso!',
          student: safeStudent,
          subjects: matchedRow.subjects || [],
          securitySettings: matchedRow.security_settings || { mode: 'none' },
          targetGrade: matchedRow.target_grade || 14,
          schedule: matchedRow.schedule || [],
          pautaLinks: matchedRow.pauta_links || [],
          updatedAt: matchedRow.updated_at || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE FETCH USER AFTER CODE ERROR]:', err);
    }
  }

  // Memory/local cache fallback
  const records = Object.values(cloudDatabase);
  const matched = records.find(r => r.profile && r.profile.email && r.profile.email.toLowerCase() === cleanEmail);

  if (matched && matched.profile) {
    const safeStudent = { ...matched.profile };
    delete safeStudent.password;

    return res.json({
      success: true,
      message: 'Autenticação por código realizada com sucesso!',
      student: safeStudent,
      subjects: matched.subjects || [],
      securitySettings: matched.securitySettings,
      targetGrade: matched.targetGrade || matched.profile.targetGrade || 14,
      schedule: matched.schedule || [],
      pautaLinks: matched.pautaLinks || [],
      updatedAt: matched.updatedAt
    });
  }

  // If new user verified their email for login, create an initial student profile
  const newStudentId = `std_${Date.now()}`;
  const generatedProfile = {
    id: newStudentId,
    name: cleanEmail.split('@')[0],
    email: cleanEmail,
    orderNumber: 1,
    className: 'Turma A',
    classRoom: 'Turma A',
    course: 'Ensino Geral',
    schoolName: 'Complexo Escolar Calféx',
    academicYear: '2025 / 2026',
    gender: 'masculino' as const,
    targetGrade: 14.0,
    registrationDate: new Date().toISOString()
  };

  return res.json({
    success: true,
    message: 'Código confirmado com sucesso!',
    student: generatedProfile,
    subjects: [],
    securitySettings: { mode: 'none' },
    targetGrade: 14.0,
    schedule: [],
    pautaLinks: []
  });
});

// Request Password Reset Code via Email
app.post('/api/accounts/forgot-password', async (req, res) => {
  const identifier = req.body?.identifier;

  if (!identifier || typeof identifier !== 'string') {
    return res.status(400).json({ success: false, message: 'Informe o e-mail, nome ou número de ordem da conta.' });
  }

  const term = identifier.trim().toLowerCase();
  let targetEmail = '';
  let studentName = 'Estudante';
  let studentId = '';

  const sb = getSupabase();
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
          targetEmail = match.email;
          studentName = match.name || 'Estudante';
          studentId = match.id;
        }
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE FORGOT PASSWORD SEARCH ERROR]:', err);
    }
  }

  if (!targetEmail) {
    const records = Object.values(cloudDatabase);
    const matched = records.find(r => {
      const p = r.profile;
      if (!p) return false;
      return (
        (p.email && p.email.toLowerCase() === term) ||
        (p.orderNumber && p.orderNumber.toString() === term) ||
        (p.name && p.name.toLowerCase() === term) ||
        (p.name && p.name.toLowerCase().includes(term))
      );
    });

    if (matched && matched.profile) {
      const profile = matched.profile;
      targetEmail = profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '')}@calfex.ao`;
      studentName = profile.name || 'Estudante';
      studentId = profile.id;
    } else if (term.includes('@') && term.includes('.')) {
      targetEmail = term;
      studentName = term.split('@')[0];
      studentId = `std_${Date.now()}`;
    } else {
      return res.status(404).json({
        success: false,
        message: 'Não encontramos nenhuma conta com essas informações cadastradas. Digite o seu endereço de e-mail cadastrado.'
      });
    }
  }
  
  // Generate a random 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  if (sb) {
    try {
      await sb.from('calfex_password_resets').upsert({
        email: targetEmail.toLowerCase(),
        code: code,
        student_id: studentId,
        student_name: studentName,
        expires_at: expiresAt
      }, { onConflict: 'email' });
    } catch (err) {
      console.warn('[CALFÉX SUPABASE SAVE RESET CODE ERROR]:', err);
    }
  }

  passwordResetCodes[targetEmail.toLowerCase()] = {
    code,
    studentId,
    expiresAt,
    studentName
  };

  const atIndex = targetEmail.indexOf('@');
  let maskedEmail = targetEmail;
  if (atIndex > 2) {
    const namePart = targetEmail.substring(0, atIndex);
    const domainPart = targetEmail.substring(atIndex);
    maskedEmail = `${namePart[0]}***${namePart[namePart.length - 1]}${domainPart}`;
  }

  const emailResult = await sendCalfexVerificationEmail(targetEmail, studentName, code);
  console.log(`[CALFÉX EMAIL SECURITY] Enviado código de verificação para o e-mail: ${targetEmail} a partir de ${CALFEX_SENDER_EMAIL} (Código: ${code}, Enviado: ${emailResult.sent})`);

  return res.json({
    success: true,
    message: emailResult.sent 
      ? `Código de verificação enviado para ${maskedEmail} a partir de ${CALFEX_SENDER_EMAIL}`
      : `Código gerado para ${maskedEmail}, mas o envio via Gmail SMTP requer configuração da variável GMAIL_APP_PASSWORD no servidor.`,
    sender: CALFEX_SENDER_EMAIL,
    email: targetEmail,
    maskedEmail,
    studentName,
    emailSent: emailResult.sent,
    emailReason: emailResult.reason,
    expiresInSeconds: 600
  });
});

// Unified verification alias
app.post('/api/auth/send-verification-code', async (req, res, next) => {
  const { email, identifier, name } = req.body || {};
  req.body.identifier = email || identifier || name;
  const term = (req.body.identifier || '').trim().toLowerCase();
  if (!term) {
    return res.status(400).json({ success: false, message: 'Endereço de e-mail é obrigatório para envio do código.' });
  }
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const targetEmail = term;
  const studentName = name || (term.includes('@') ? term.split('@')[0] : 'Estudante');

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('calfex_password_resets').upsert({
        email: targetEmail.toLowerCase(),
        code: code,
        student_id: `std_${Date.now()}`,
        student_name: studentName,
        expires_at: expiresAt
      }, { onConflict: 'email' });
    } catch (err) {
      console.warn('[CALFÉX SUPABASE SAVE CODE ERROR]:', err);
    }
  }

  passwordResetCodes[targetEmail.toLowerCase()] = {
    code,
    studentId: `std_${Date.now()}`,
    expiresAt,
    studentName
  };

  const atIndex = targetEmail.indexOf('@');
  let maskedEmail = targetEmail;
  if (atIndex > 2) {
    const namePart = targetEmail.substring(0, atIndex);
    const domainPart = targetEmail.substring(atIndex);
    maskedEmail = `${namePart[0]}***${namePart[namePart.length - 1]}${domainPart}`;
  }

  const emailResult = await sendCalfexVerificationEmail(targetEmail, studentName, code);
  console.log(`[CALFÉX VERIFICAÇÃO] Código de 6 dígitos enviado para ${targetEmail}: ${code} (Status: ${emailResult.sent})`);

  return res.json({
    success: true,
    message: emailResult.sent 
      ? `Código de 6 dígitos enviado para ${maskedEmail}` 
      : `Código gerado, envio via SMTP pendente de configuração da senha de app do Gmail.`,
    sender: CALFEX_SENDER_EMAIL,
    email: targetEmail,
    maskedEmail,
    emailSent: emailResult.sent,
    emailReason: emailResult.reason,
    expiresInSeconds: 600
  });
});

// Direct test email endpoint for quick verification
app.post('/api/send-test-email', async (req, res) => {
  const toEmail = req.body?.email || 'melcanielulima111@gmail.com';
  const name = req.body?.name || 'Estudante CalFéx';
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const result = await sendCalfexVerificationEmail(toEmail, name, code);
  return res.json({
    success: result.sent,
    sender: CALFEX_SENDER_EMAIL,
    to: toEmail,
    code,
    result
  });
});

// Verify Password / Auth Reset Code
app.post(['/api/accounts/verify-reset-code', '/api/auth/verify-code'], async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'E-mail e código de verificação são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const inputCode = code.toString().trim();
  const sb = getSupabase();

  if (sb) {
    try {
      const { data: resetRows } = await sb
        .from('calfex_password_resets')
        .select('*')
        .eq('email', cleanEmail)
        .order('expires_at', { ascending: false });

      if (Array.isArray(resetRows) && resetRows.length > 0) {
        const resetItem = resetRows[0];
        if (Date.now() > Number(resetItem.expires_at)) {
          await sb.from('calfex_password_resets').delete().eq('email', cleanEmail);
          return res.status(400).json({ success: false, message: 'Este código expirou (validade de 10 minutos). Solicite um novo código.' });
        }
        if (resetItem.code === inputCode) {
          return res.json({ success: true, message: 'Código validado com sucesso!' });
        }
        return res.status(400).json({ success: false, message: 'Código de verificação incorreto. Verifique os 6 dígitos digitados.' });
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE VERIFY CODE ERROR]:', err);
    }
  }

  const record = passwordResetCodes[cleanEmail];
  if (!record) {
    return res.status(400).json({ success: false, message: 'Nenhum código pendente para este e-mail. Solicite um novo código.' });
  }

  if (Date.now() > record.expiresAt) {
    delete passwordResetCodes[cleanEmail];
    return res.status(400).json({ success: false, message: 'Este código expirou (validade de 10 minutos). Solicite um novo código.' });
  }

  if (record.code !== inputCode) {
    return res.status(400).json({ success: false, message: 'Código de verificação incorreto. Verifique os 6 dígitos digitados.' });
  }

  return res.json({ success: true, message: 'Código validado com sucesso!' });
});

// Reset and Update Password in Cloud DB
app.post('/api/accounts/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !newPassword || newPassword.toString().trim().length < 4) {
    return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 4 caracteres.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = newPassword.toString().trim();
  const hashedPass = hashPassword(cleanPass);
  const sb = getSupabase();
  let targetStudentId: string | null = null;
  let studentProfileFromDb: any = null;

  if (sb) {
    try {
      if (code) {
        const { data: resetRows } = await sb
          .from('calfex_password_resets')
          .select('*')
          .eq('email', cleanEmail)
          .order('expires_at', { ascending: false });

        if (Array.isArray(resetRows) && resetRows.length > 0) {
          const resetData = resetRows[0];
          if (Date.now() > Number(resetData.expires_at)) {
            await sb.from('calfex_password_resets').delete().eq('email', cleanEmail);
            return res.status(400).json({ success: false, message: 'Código de verificação expirado.' });
          }
          if (resetData.code !== code.toString().trim()) {
            return res.status(400).json({ success: false, message: 'Código de verificação inválido.' });
          }
          targetStudentId = resetData.student_id;
        }
      }

      // Fetch student to get complete profile
      const { data: stdRows } = await sb
        .from('calfex_students')
        .select('*')
        .eq('email', cleanEmail)
        .order('updated_at', { ascending: false });

      if (Array.isArray(stdRows) && stdRows.length > 0) {
        const stdData = stdRows[0];
        studentProfileFromDb = stdData.profile || { id: stdData.id, name: stdData.name, email: stdData.email };
        const updatedProfile = { ...(studentProfileFromDb), password: hashedPass };
        
        await sb.from('calfex_students').update({
          password_hash: hashedPass,
          profile: updatedProfile,
          security_settings: { mode: 'pin', pinCode: hashedPass },
          updated_at: new Date().toISOString()
        }).eq('email', cleanEmail);

        await sb.from('calfex_password_resets').delete().eq('email', cleanEmail);
        console.log(`[CALFÉX SUPABASE PASSWORD RESET] ✅ Senha atualizada no Supabase para ${cleanEmail}`);
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE RESET PASSWORD ERROR]:', err);
    }
  }

  const resetRecord = passwordResetCodes[cleanEmail];
  let targetRecordKey: string | null = targetStudentId || (resetRecord ? resetRecord.studentId : null);

  if (!targetRecordKey || !cloudDatabase[targetRecordKey]) {
    const keys = Object.keys(cloudDatabase);
    for (const k of keys) {
      if (cloudDatabase[k]?.profile?.email?.toLowerCase() === cleanEmail) {
        targetRecordKey = k;
        break;
      }
    }
  }

  if (targetRecordKey && cloudDatabase[targetRecordKey]) {
    cloudDatabase[targetRecordKey].profile.password = hashedPass;
    if (!cloudDatabase[targetRecordKey].securitySettings) {
      cloudDatabase[targetRecordKey].securitySettings = { mode: 'pin', pinCode: hashedPass };
    } else {
      cloudDatabase[targetRecordKey].securitySettings.pinCode = hashedPass;
    }
    cloudDatabase[targetRecordKey].updatedAt = new Date().toISOString();
    saveCloudDb(cloudDatabase);
  }

  delete passwordResetCodes[cleanEmail];

  const returnProfile = studentProfileFromDb || (targetRecordKey && cloudDatabase[targetRecordKey]?.profile) || null;
  const safeProfile = returnProfile ? { ...returnProfile } : null;
  if (safeProfile) delete safeProfile.password;

  return res.json({
    success: true,
    message: 'Senha redefinida com sucesso!',
    student: safeProfile
  });
});

// Register or update student account in the cloud
app.post('/api/accounts/register', async (req, res) => {
  const { profile, subjects, securitySettings, targetGrade, schedule, pautaLinks } = req.body;

  if (!profile || !profile.id || !profile.email) {
    return res.status(400).json({ success: false, message: 'Dados de perfil incompletos' });
  }

  const studentId = profile.id;
  const now = new Date().toISOString();

  const secureProfile = { ...profile };
  const rawPass = secureProfile.password ? secureProfile.password.toString().trim() : '';
  const passHash = rawPass ? hashPassword(rawPass) : null;

  if (secureProfile.password) {
    secureProfile.password = passHash;
  }

  const finalSecSettings = securitySettings ? { ...securitySettings } : {
    mode: profile.password ? 'pin' : 'none',
    pinCode: passHash || ''
  };

  if (finalSecSettings.pinCode) {
    finalSecSettings.pinCode = hashPassword(finalSecSettings.pinCode);
  }

  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const scheduleList = Array.isArray(schedule) ? schedule : [];
  const linksList = Array.isArray(pautaLinks) ? pautaLinks : [];
  const target = targetGrade || profile.targetGrade || 14;

  const sb = getSupabase();
  if (sb) {
    try {
      const row = {
        id: studentId,
        email: (profile.email || '').toLowerCase().trim(),
        name: profile.name || 'Estudante',
        order_number: profile.orderNumber ? String(profile.orderNumber) : null,
        class_room: profile.className || profile.classRoom || null,
        course: profile.course || null,
        school_name: profile.schoolName || null,
        academic_year: profile.academicYear || null,
        gender: profile.gender || null,
        password_hash: passHash || finalSecSettings.pinCode || null,
        profile: secureProfile,
        subjects: subjectsList,
        security_settings: finalSecSettings,
        target_grade: target,
        schedule: scheduleList,
        pauta_links: linksList,
        updated_at: now
      };

      const result = await upsertStudentToSupabase(sb, row);
      if (result.success) {
        console.log(`[CALFÉX SUPABASE REGISTER] ✅ Conta ${profile.email} (${studentId}) salva com sucesso no Supabase.`);
      } else {
        console.warn('[CALFÉX SUPABASE REGISTER NOTICE]:', result.error);
      }
    } catch (err) {
      console.error('[CALFÉX SUPABASE REGISTER EXCEPTION]:', err);
    }
  }

  cloudDatabase[studentId] = {
    profile: secureProfile,
    subjects: subjectsList,
    securitySettings: finalSecSettings,
    targetGrade: target,
    schedule: scheduleList,
    pautaLinks: linksList,
    updatedAt: now
  };

  saveCloudDb(cloudDatabase);

  const safeStudent = { ...profile };
  delete safeStudent.password;

  res.json({
    success: true,
    student: safeStudent,
    subjects: subjectsList,
    updatedAt: now
  });
});

// Sync student data to cloud
app.post('/api/students/:id/sync', async (req, res) => {
  const studentId = req.params.id;
  const { profile, subjects, securitySettings, targetGrade, schedule, pautaLinks } = req.body;
  const now = new Date().toISOString();

  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const scheduleList = Array.isArray(schedule) ? schedule : [];
  const linksList = Array.isArray(pautaLinks) ? pautaLinks : [];

  let secureProfile = profile ? { ...profile } : undefined;
  let passHash: string | null = null;
  if (secureProfile) {
    if (secureProfile.password) {
      secureProfile.password = hashPassword(secureProfile.password);
      passHash = secureProfile.password;
    }
  }

  const finalSecSettings = securitySettings ? { ...securitySettings } : undefined;
  if (finalSecSettings && finalSecSettings.pinCode) {
    finalSecSettings.pinCode = hashPassword(finalSecSettings.pinCode);
    if (!passHash) passHash = finalSecSettings.pinCode;
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const row: any = {
        id: studentId,
        updated_at: now
      };
      if (subjects !== undefined) row.subjects = subjectsList;
      if (securitySettings !== undefined) row.security_settings = finalSecSettings;
      if (targetGrade !== undefined) row.target_grade = targetGrade;
      if (schedule !== undefined) row.schedule = scheduleList;
      if (pautaLinks !== undefined) row.pauta_links = linksList;
      if (secureProfile) {
        row.profile = secureProfile;
        if (secureProfile.name) row.name = secureProfile.name;
        if (secureProfile.email) row.email = secureProfile.email.toLowerCase().trim();
        if (secureProfile.orderNumber) row.order_number = String(secureProfile.orderNumber);
        if (secureProfile.className || secureProfile.classRoom) row.class_room = secureProfile.className || secureProfile.classRoom;
        if (secureProfile.course) row.course = secureProfile.course;
        if (secureProfile.schoolName) row.school_name = secureProfile.schoolName;
        if (secureProfile.academicYear) row.academic_year = secureProfile.academicYear;
        if (secureProfile.gender) row.gender = secureProfile.gender;
      }
      if (passHash) {
        row.password_hash = passHash;
      }

      await upsertStudentToSupabase(sb, row);
    } catch (err) {
      console.warn('[CALFÉX SUPABASE SYNC ERROR]:', err);
    }
  }

  const existing = cloudDatabase[studentId] || {
    profile: secureProfile || { id: studentId, name: 'Estudante' },
    subjects: [],
    updatedAt: now
  };

  cloudDatabase[studentId] = {
    profile: secureProfile || existing.profile,
    subjects: subjects !== undefined ? subjectsList : existing.subjects,
    securitySettings: finalSecSettings !== undefined ? finalSecSettings : existing.securitySettings,
    targetGrade: targetGrade !== undefined ? targetGrade : existing.targetGrade,
    schedule: schedule !== undefined ? scheduleList : existing.schedule,
    pautaLinks: pautaLinks !== undefined ? linksList : existing.pautaLinks,
    updatedAt: now
  };

  saveCloudDb(cloudDatabase);

  res.json({ success: true, updatedAt: now });
});

// Get complete data for student from cloud
app.get('/api/students/:id/data', async (req, res) => {
  const studentId = req.params.id;
  const sb = getSupabase();

  if (sb) {
    try {
      const data = await fetchStudentByIdOrEmailFromSupabase(sb, studentId);
      if (data) {
        const safeStudent = { ...(data.profile || {}) };
        delete safeStudent.password;

        return res.json({
          success: true,
          student: safeStudent,
          subjects: data.subjects || [],
          securitySettings: data.security_settings || { mode: 'none' },
          targetGrade: data.target_grade || safeStudent.targetGrade || 14,
          schedule: data.schedule || [],
          pautaLinks: data.pauta_links || [],
          updatedAt: data.updated_at || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[CALFÉX SUPABASE FETCH DATA ERROR]:', err);
    }
  }

  const record = cloudDatabase[studentId];
  if (!record) {
    return res.status(404).json({ success: false, message: 'Estudante não encontrado na nuvem' });
  }

  const safeStudent = { ...record.profile };
  delete safeStudent.password;

  res.json({
    success: true,
    student: safeStudent,
    subjects: record.subjects || [],
    securitySettings: record.securitySettings,
    targetGrade: record.targetGrade,
    schedule: record.schedule,
    pautaLinks: record.pautaLinks,
    updatedAt: record.updatedAt
  });
});

// Delete student account permanently from cloud
app.delete('/api/students/:id', async (req, res) => {
  const studentId = req.params.id;
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('calfex_students').delete().eq('id', studentId);
      await sb.from('students').delete().eq('id', studentId);
      console.log(`[CALFÉX SUPABASE DELETE] ✅ Conta ${studentId} eliminada do Supabase.`);
    } catch (err) {
      console.warn('[CALFÉX SUPABASE DELETE ERROR]:', err);
    }
  }
  if (cloudDatabase[studentId]) {
    delete cloudDatabase[studentId];
    saveCloudDb(cloudDatabase);
  }
  res.json({ success: true, message: 'Conta e dados eliminados permanentemente com sucesso.' });
});

// Delete account by email or id
app.delete('/api/accounts/:idOrEmail', async (req, res) => {
  const param = req.params.idOrEmail;
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('calfex_students').delete().or(`id.eq.${param},email.eq.${param.toLowerCase()}`);
    } catch (err) {
      console.warn('[CALFÉX SUPABASE DELETE ACCOUNT ERROR]:', err);
    }
  }
  if (cloudDatabase[param]) {
    delete cloudDatabase[param];
    saveCloudDb(cloudDatabase);
  }
  const keys = Object.keys(cloudDatabase);
  for (const k of keys) {
    if (cloudDatabase[k]?.profile?.email === param || cloudDatabase[k]?.profile?.id === param) {
      delete cloudDatabase[k];
      saveCloudDb(cloudDatabase);
    }
  }
  res.json({ success: true, message: 'Conta removida com sucesso.' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Calféx', creator: 'Melcaniel Ulima', cloudSync: 'active' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Calféx Server running with Cloud Sync on http://localhost:${PORT}`);
  });
}

// Start standalone server unless running in serverless cloud function (Netlify / Lambda)
if (process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
export { app };

