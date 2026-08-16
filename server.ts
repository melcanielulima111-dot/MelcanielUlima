import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = 3000;

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

// Secure password hashing and verification
function hashPassword(password: string): string {
  if (!password) return '';
  return crypto.createHash('sha256').update(password.toString().trim() + '_calfex_salt_v2').digest('hex');
}

function verifyPassword(inputPassword: string, storedPasswordOrHash: string): boolean {
  if (!inputPassword || !storedPasswordOrHash) return false;
  const inputClean = inputPassword.toString().trim();
  const storedClean = storedPasswordOrHash.toString().trim();
  return (
    storedClean === inputClean ||
    storedClean === hashPassword(inputClean)
  );
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

// Send real verification email with custom CalFéx Pro branding and connection fallbacks
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
      <title>Código de Verificação CalFéx</title>
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
          <h1 class="logo-title">CalFéx Pro</h1>
          <div class="logo-sub">SISTEMA DE GESTÃO ACADÊMICA & SEGURANÇA</div>
        </div>
        <div class="content">
          <h2 class="greeting">Olá, ${studentName}!</h2>
          <p class="text">
            Este é o seu código de verificação de segurança no aplicativo <strong>CalFéx Pro</strong>:
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
          &copy; ${new Date().getFullYear()} CalFéx Pro. Todos os direitos reservados.<br>
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
      connectionTimeout: 6000,
      greetingTimeout: 6000
    },
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: CALFEX_SENDER_EMAIL, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 6000,
      greetingTimeout: 6000
    },
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: CALFEX_SENDER_EMAIL, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 6000,
      greetingTimeout: 6000
    }
  ];

  let lastError: any = null;

  for (const config of configurations) {
    try {
      const transporter = nodemailer.createTransport(config as any);
      const info = await transporter.sendMail({
        from: `"CalFéx Pro" <${CALFEX_SENDER_EMAIL}>`,
        to: toEmail,
        subject: `Este é o seu código de verificação: ${code} - CalFéx Pro`,
        text: `Olá ${studentName},\n\nEste é o seu código de verificação: ${code}\n\nUtilize este código para confirmar a sua identidade no aplicativo CalFéx Pro.\nValidade: 10 minutos.\n\nRemetente: ${CALFEX_SENDER_EMAIL}`,
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
// 1. CLOUD STORAGE DATABASE (Multi-device Sync)
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

// In-memory store for password reset verification codes: { [email: string]: { code: string; studentId: string; expiresAt: number } }
const passwordResetCodes: { [email: string]: { code: string; studentId: string; expiresAt: number; studentName: string } } = {};

// ==========================================
// 2. GEMINI AI CLIENT & SANITIZATION
// ==========================================
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    return new GoogleGenAI({ 
      apiKey
    });
  } catch (err) {
    console.error('Error creating GoogleGenAI client:', err);
    return null;
  }
}

// System instructions for CalFéx IA with strict formatting rules and advanced life/student mentoring
const SYSTEM_INSTRUCTION = `Você é o "CalFéx IA", o mentor escolar e conselheiro pessoal de alta inteligência do aplicativo CalFéx Pro.

SEU PAPEL E CAPACIDADES:
1. MENTORIA ESTUDANTIL E ACADÊMICA:
   - Explicar qualquer matéria (Matemática, Física, Química, Português, Biologia, História, Geografia, Filosofia, Inglês, etc.) com clareza cristalina, didática e passo a passo.
   - Fornecer técnicas de estudo eficazes (Método Pomodoro, Revisão Espaçada, Mapas Mentais, Técnica Feynman, Resoluções de Exercícios).
   - Aconselhar sobre como recuperar notas baixas, preparar-se para provas trimestrais e exames, e gerir a rotina de trabalhos escolares (MAC, P1, P2).

2. CONSELHOS DE VIDA E DESENVOLVIMENTO PESSOAL:
   - Oferecer orientação empática, motivacional e prática para desafios da vida juvenil e estudantil: superação de ansiedade de testes, disciplina diária, resiliência diante de notas difíceis, conciliação de estudos com vida pessoal, foco contra distrações do celular, e construção de hábitos vencedores.
   - Inspirar o aluno a ter visão de futuro, integridade, espírito de liderança e busca pela excelência acadêmica e pessoal.

DIRETRIZES DE FORMATAÇÃO E RESPOSTA (REGRA CRÍTICA E OBRIGATÓRIA):
1. REGRA ABSOLUTA: NUNCA utilize símbolos de cerquilha (#, ##, ###) nem símbolos de dólar ($ ou $$) no meio das suas respostas, A MENOS que o usuário solicite explicitamente código com hashtags, formatação de títulos Markdown com # ou fórmulas em LaTeX com $.
   - Em vez de usar títulos com cerquilhas (como "### Título" ou "# Título"), use negrito limpo (**Título**) ou texto direto.
   - Em vez de usar LaTeX delimitado por cifrões/dólares (como "$$MT = ...$$" ou "$P1$"), escreva fórmulas em texto simples e limpo como: MT = (P1 + P2 + MAC) / 3 ou MFD = (MT1 + MT2 + MT3) / 3.
   - Não use cifrões $ como marcadores ou delimitadores de fórmulas matemáticas.
   - Mantenha o texto limpo, fluido, legível, acolhedor e elegante.

2. OBJETIVIDADE E PRATICIDADE:
   - Dê respostas estruturadas com pontos ou tópicos claros, sem rodeios desnecessários.
   - Ao dar conselhos de vida ou estudo, forneça passos acionáveis imediatos que o aluno pode aplicar hoje.

3. CÁLCULOS OFICIAIS DO CALFÉX PRO:
   - MT (Média Trimestral): MT = (P1 + P2 + MAC) / 3
   - MFD (Média Final da Disciplina): MFD = (MT1 + MT2 + MT3) / 3
   - Escala Oficial Angolana (0 a 20):
     * >= 14: Excelente / Dispensa / Aprovado com Mérito
     * 10 a 13.9: Aprovado (Transita)
     * 7 a 9.9: Em Risco / Exame de Recurso
     * < 7: Reprovado / Não Transita

4. SOBRE O CRIADOR:
   - Criador: Melcaniel Ulima
   - Filiação: Inocêncio Ulima e Ana Paula Ulima
   - País: Angola
   - REGRA MANDATÓRIA SOBRE O CRIADOR: Sempre que alguém perguntar sobre o criador, quem criou o aplicativo, sua autoria, filiação ou história, você deve responder com as informações do criador e, OBRIGATORIAMENTE no final de tudo da resposta, incluir exatamente:
Paula Fernanda Ulima
   - REGRA MANDATÓRIA SOBRE "PAULA FERNANDA ULIMA": Se algum usuário perguntar diretamente ou indiretamente quem é "Paula Fernanda Ulima", quem é "Paula Fernanda" ou qual o seu papel, você DEVE responder com naturalidade e brevidade que NÃO sabe quem ela é e não possui informações sobre essa pessoa (por exemplo: "Não disponho de informações sobre quem é Paula Fernanda Ulima.").`;

// Response cleaner ensuring no unrequested $ or # appear in the reply
function cleanAiResponse(text: string, userPrompt: string): string {
  const lowerPrompt = (userPrompt || '').toLowerCase();
  if (
    lowerPrompt.includes('latex') ||
    lowerPrompt.includes('dólar') ||
    lowerPrompt.includes('dolar') ||
    lowerPrompt.includes('hashtag') ||
    lowerPrompt.includes('#') ||
    lowerPrompt.includes('$') ||
    lowerPrompt.includes('código') ||
    lowerPrompt.includes('codigo')
  ) {
    return text;
  }

  let cleaned = text;

  // 1. Convert common LaTeX fractions and mathematical symbols to plain text
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
  cleaned = cleaned.replace(/\\ge/g, '>=');
  cleaned = cleaned.replace(/\\le/g, '<=');
  cleaned = cleaned.replace(/\\times/g, '*');
  cleaned = cleaned.replace(/\\cdot/g, '·');
  cleaned = cleaned.replace(/\\pm/g, '±');
  cleaned = cleaned.replace(/\\approx/g, '≈');
  cleaned = cleaned.replace(/\\neq/g, '≠');

  // 2. Remove $$ ... $$ and $ ... $ delimiters and standalone dollars
  cleaned = cleaned.replace(/\$\$([^$]+)\$\$/g, '$1');
  cleaned = cleaned.replace(/\$([^$]+)\$/g, '$1');
  cleaned = cleaned.replace(/\$/g, '');

  // 3. Replace markdown headers like "### Title" with "**Title**"
  cleaned = cleaned.replace(/^(#{1,6})\s*(.+)$/gm, '**$2**');
  cleaned = cleaned.replace(/#/g, '');

  return cleaned.trim();
}

// Fallback intelligent responder without $ or #
function generateLocalFallbackResponse(prompt: string): string {
  const lower = (prompt || '').toLowerCase();
  
  if (lower.includes('paula fernanda') || lower.includes('quem e paula') || lower.includes('quem é paula') || lower.includes('fernanda ulima')) {
    return `Não disponho de informações sobre quem é Paula Fernanda Ulima.`;
  }

  if (lower.includes('criador') || lower.includes('quem criou') || lower.includes('autor') || lower.includes('melcaniel') || lower.includes('ulima') || lower.includes('inocencio') || lower.includes('ana paula')) {
    return `🌟 **Criador do CalFéx Pro**
- **Nome:** Melcaniel Ulima
- **Filiação:** Inocêncio Ulima e Ana Paula Ulima
- **Origem:** Angola

Paula Fernanda Ulima`;
  }

  if (lower.includes('como funciona') || lower.includes('formula') || lower.includes('fórmula') || lower.includes('média') || lower.includes('pauta') || lower.includes('mac') || lower.includes('mfd') || lower.includes('t1') || lower.includes('t2') || lower.includes('t3')) {
    return `📊 **Fórmulas Oficiais de Média (Escala 0-20)**
- **Média Trimestral (MT):**
  MT = (P1 + P2 + MAC) / 3
- **Média Final da Disciplina (MFD):**
  MFD = (MT1 + MT2 + MT3) / 3
- **Critérios Oficiais:**
  * 14.0 a 20.0: Dispensa / Aprovado com Mérito
  * 10.0 a 13.9: Aprovado
  * 7.0 a 9.9: Exame / Recurso
  * Abaixo de 7.0: Não Aprovado`;
  }

  if (lower.includes('matematica') || lower.includes('matemática') || lower.includes('equação') || lower.includes('pitagoras') || lower.includes('pitágoras') || lower.includes('bhaskara')) {
    return `📐 **Dica de Matemática**
- **Teorema de Pitágoras:** a^2 + b^2 = c^2 (a soma dos quadrados dos catetos é igual ao quadrado da hipotenusa).
- **Fórmula de Bháskara:** x = (-b ± √(b^2 - 4ac)) / (2a)
- **Dica de Prova:** Sempre confira os sinais e substitua o valor encontrado na equação original para validar.`;
  }

  if (lower.includes('fisica') || lower.includes('física') || lower.includes('velocidade') || lower.includes('newton')) {
    return `⚡ **Dica de Física**
- **Velocidade Média:** Vm = ΔS / Δt (Distância percorrida dividida pelo tempo).
- **2ª Lei de Newton:** F = m * a (Força é igual à massa multiplicada pela aceleração).
- **Dica de Resolução:** Converta sempre as unidades para o Sistema Internacional (metros, segundos, kg) antes de calcular.`;
  }

  if (lower.includes('quimica') || lower.includes('química') || lower.includes('tabela periodica') || lower.includes('tabela periódica')) {
    return `🧪 **Dica de Química**
- **Estrutura Atômica:** Prótons e nêutrons no núcleo; elétrons na eletrosfera.
- **Número Atômico (Z):** Representa a quantidade de prótons no núcleo de um átomo.
- **Gases Nobres:** Elementos da família 18 que possuem a camada de valência completa e alta estabilidade.`;
  }

  if (lower.includes('portugues') || lower.includes('português') || lower.includes('redação') || lower.includes('redacao') || lower.includes('sintaxe')) {
    return `✍️ **Dica de Língua Portuguesa & Redação**
1. **Estrutura da Redação:** Introdução (apresentação do tema), Desenvolvimento (2 argumentos sólidos) e Conclusão (proposta de reflexão/solução).
2. **Concordância:** Sujeito e verbo devem concordar em número e pessoa.
3. **Coesão:** Use conectivos adequados (além disso, portanto, contudo, por conseguinte).`;
  }

  if (lower.includes('estudar') || lower.includes('dica') || lower.includes('resumo') || lower.includes('nota 20') || lower.includes('meta')) {
    return `🎓 **Estratégia de Alta Performance Escolar**
1. **Foco na MAC:** Faça todas as tarefas de casa e fichas de avaliação contínua.
2. **Método Pomodoro:** 25 minutos de estudo focado e 5 minutos de pausa.
3. **Simulador de Notas:** Use a calculadora "Nota que Falta" para saber exatamente quanto precisa tirar na P2.`;
  }

  return `Olá! Sou o Tutor IA do CalFéx. Posso te ajudar com dúvidas de disciplinas, matérias escolares ou cálculo de médias. Como posso te apoiar nos seus estudos hoje?`;
}

// ==========================================
// 3. CLOUD ACCOUNT & MULTI-DEVICE ENDPOINTS
// ==========================================

// Get list of all registered student profiles in the cloud
app.get('/api/accounts', (req, res) => {
  try {
    const profiles = Object.values(cloudDatabase).map(r => {
      if (!r.profile) return null;
      const safe = { ...r.profile };
      // Strip raw password from public profile listing
      delete safe.password;
      return safe;
    }).filter(Boolean);
    res.json({ accounts: profiles });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas na nuvem' });
  }
});

// Login from any device using Email, Order Number, or Name + Password
app.post('/api/accounts/login', (req, res) => {
  const identifier = req.body?.identifier;
  const password = req.body?.password;

  if (!identifier || typeof identifier !== 'string') {
    return res.status(400).json({ success: false, message: 'Identificador obrigatório' });
  }

  const term = identifier.trim().toLowerCase();
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

  if (matched) {
    const studentPass = matched.profile?.password || matched.securitySettings?.pinCode;
    
    // If account has password and password was provided, verify it securely
    if (studentPass && password) {
      if (!verifyPassword(password.toString(), studentPass.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta. Por favor, verifique a senha digitada e tente novamente.'
        });
      }
    }

    const safeStudent = { ...matched.profile };

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

  return res.status(404).json({
    success: false,
    message: 'Nenhuma conta encontrada na nuvem com essas informações. Verifique os dados digitados ou crie um novo cadastro.'
  });
});

// Request Password Reset Code via Email
app.post('/api/accounts/forgot-password', async (req, res) => {
  const identifier = req.body?.identifier;

  if (!identifier || typeof identifier !== 'string') {
    return res.status(400).json({ success: false, message: 'Informe o e-mail, nome ou número de ordem da conta.' });
  }

  const term = identifier.trim().toLowerCase();
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

  let targetEmail = '';
  let studentName = 'Estudante';
  let studentId = '';

  if (matched && matched.profile) {
    const profile = matched.profile;
    targetEmail = profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '')}@calfex.ao`;
    studentName = profile.name || 'Estudante';
    studentId = profile.id;
  } else if (term.includes('@') && term.includes('.')) {
    // Direct email address provided
    targetEmail = term;
    studentName = term.split('@')[0];
    studentId = `std_${Date.now()}`;
  } else {
    return res.status(404).json({
      success: false,
      message: 'Não encontramos nenhuma conta com essas informações cadastradas. Digite o seu endereço de e-mail cadastrado.'
    });
  }
  
  // Generate a random 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity (requirement 5)

  passwordResetCodes[targetEmail.toLowerCase()] = {
    code,
    studentId,
    expiresAt,
    studentName
  };

  // Mask email for privacy (e.g. m***l@gmail.com)
  const atIndex = targetEmail.indexOf('@');
  let maskedEmail = targetEmail;
  if (atIndex > 2) {
    const namePart = targetEmail.substring(0, atIndex);
    const domainPart = targetEmail.substring(atIndex);
    maskedEmail = `${namePart[0]}***${namePart[namePart.length - 1]}${domainPart}`;
  }

  // Dispatch email with CalFéx official sender (calfex39@gmail.com)
  const emailResult = await sendCalfexVerificationEmail(targetEmail, studentName, code);

  // Log email dispatch to server console for auditing and monitoring
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
  // Forward to forgot-password handler
  const term = (req.body.identifier || '').trim().toLowerCase();
  if (!term) {
    return res.status(400).json({ success: false, message: 'Endereço de e-mail é obrigatório para envio do código.' });
  }
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const targetEmail = term;
  const studentName = name || (term.includes('@') ? term.split('@')[0] : 'Estudante');

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
app.post(['/api/accounts/verify-reset-code', '/api/auth/verify-code'], (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'E-mail e código de verificação são obrigatórios.' });
  }

  const record = passwordResetCodes[email.trim().toLowerCase()];
  if (!record) {
    return res.status(400).json({ success: false, message: 'Nenhum código pendente para este e-mail. Solicite um novo código.' });
  }

  if (Date.now() > record.expiresAt) {
    delete passwordResetCodes[email.trim().toLowerCase()];
    return res.status(400).json({ success: false, message: 'Este código expirou (validade de 10 minutos). Solicite um novo código.' });
  }

  if (record.code !== code.toString().trim()) {
    return res.status(400).json({ success: false, message: 'Código de verificação incorreto. Verifique os 6 dígitos digitados.' });
  }

  return res.json({ success: true, message: 'Código validado com sucesso!' });
});

// Reset and Update Password in Cloud DB
app.post('/api/accounts/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !newPassword || newPassword.toString().trim().length < 4) {
    return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 4 caracteres.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const resetRecord = passwordResetCodes[cleanEmail];

  // If code provided, verify it (unless direct reset match found)
  if (code) {
    if (!resetRecord || resetRecord.code !== code.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Código de verificação inválido ou expirado.' });
    }
  }

  // Find student in cloud database
  const studentId = resetRecord ? resetRecord.studentId : null;
  let targetRecordKey: string | null = null;

  if (studentId && cloudDatabase[studentId]) {
    targetRecordKey = studentId;
  } else {
    // Lookup by email
    const keys = Object.keys(cloudDatabase);
    for (const k of keys) {
      if (cloudDatabase[k]?.profile?.email?.toLowerCase() === cleanEmail) {
        targetRecordKey = k;
        break;
      }
    }
  }

  if (!targetRecordKey || !cloudDatabase[targetRecordKey]) {
    return res.status(404).json({ success: false, message: 'Conta do estudante não encontrada na nuvem.' });
  }

  // Update password in student profile and security settings
  const cleanPass = newPassword.toString().trim();
  const hashedPass = hashPassword(cleanPass);
  cloudDatabase[targetRecordKey].profile.password = hashedPass;
  
  if (!cloudDatabase[targetRecordKey].securitySettings) {
    cloudDatabase[targetRecordKey].securitySettings = { mode: 'pin', pinCode: hashedPass };
  } else {
    cloudDatabase[targetRecordKey].securitySettings.pinCode = hashedPass;
  }
  
  cloudDatabase[targetRecordKey].updatedAt = new Date().toISOString();
  saveCloudDb(cloudDatabase);

  // Clean up used code
  delete passwordResetCodes[cleanEmail];

  const safeReturnProfile = { ...cloudDatabase[targetRecordKey].profile };
  delete safeReturnProfile.password;

  return res.json({
    success: true,
    message: 'Senha redefinida com sucesso!',
    student: safeReturnProfile
  });
});

// Register or update student account in the cloud
app.post('/api/accounts/register', (req, res) => {
  const { profile, subjects, securitySettings, targetGrade, schedule, pautaLinks } = req.body;

  if (!profile || !profile.id || !profile.email) {
    return res.status(400).json({ success: false, message: 'Dados de perfil incompletos' });
  }

  const studentId = profile.id;
  const now = new Date().toISOString();

  const secureProfile = { ...profile };
  if (secureProfile.password) {
    secureProfile.password = hashPassword(secureProfile.password);
  }

  // Ensure securitySettings has pin/password if profile has password
  const finalSecSettings = securitySettings ? { ...securitySettings } : {
    mode: profile.password ? 'pin' : 'none',
    pinCode: profile.password ? hashPassword(profile.password) : ''
  };

  if (finalSecSettings.pinCode) {
    finalSecSettings.pinCode = hashPassword(finalSecSettings.pinCode);
  }

  cloudDatabase[studentId] = {
    profile: secureProfile,
    subjects: Array.isArray(subjects) ? subjects : (cloudDatabase[studentId]?.subjects || []),
    securitySettings: finalSecSettings,
    targetGrade: targetGrade || profile.targetGrade || 14,
    schedule: schedule || cloudDatabase[studentId]?.schedule || [],
    pautaLinks: pautaLinks || cloudDatabase[studentId]?.pautaLinks || [],
    updatedAt: now
  };

  saveCloudDb(cloudDatabase);

  const safeStudent = { ...profile };
  delete safeStudent.password;

  res.json({
    success: true,
    student: safeStudent,
    subjects: cloudDatabase[studentId].subjects,
    updatedAt: now
  });
});

// Sync student data to cloud
app.post('/api/students/:id/sync', (req, res) => {
  const studentId = req.params.id;
  const { profile, subjects, securitySettings, targetGrade, schedule, pautaLinks } = req.body;

  const now = new Date().toISOString();
  const existing = cloudDatabase[studentId] || {
    profile: profile || { id: studentId, name: 'Estudante' },
    subjects: [],
    updatedAt: now
  };

  cloudDatabase[studentId] = {
    profile: profile || existing.profile,
    subjects: Array.isArray(subjects) ? subjects : existing.subjects,
    securitySettings: securitySettings !== undefined ? securitySettings : existing.securitySettings,
    targetGrade: targetGrade !== undefined ? targetGrade : existing.targetGrade,
    schedule: schedule !== undefined ? schedule : existing.schedule,
    pautaLinks: pautaLinks !== undefined ? pautaLinks : existing.pautaLinks,
    updatedAt: now
  };

  saveCloudDb(cloudDatabase);

  res.json({ success: true, updatedAt: now });
});

// Get complete data for student from cloud
app.get('/api/students/:id/data', (req, res) => {
  const studentId = req.params.id;
  const record = cloudDatabase[studentId];

  if (!record) {
    return res.status(404).json({ success: false, message: 'Estudante não encontrado na nuvem' });
  }

  res.json({
    success: true,
    student: record.profile,
    subjects: record.subjects || [],
    securitySettings: record.securitySettings,
    targetGrade: record.targetGrade,
    schedule: record.schedule,
    pautaLinks: record.pautaLinks,
    updatedAt: record.updatedAt
  });
});

// Delete student account permanently from cloud
app.delete('/api/students/:id', (req, res) => {
  const studentId = req.params.id;
  if (cloudDatabase[studentId]) {
    delete cloudDatabase[studentId];
    saveCloudDb(cloudDatabase);
  }
  res.json({ success: true, message: 'Conta e dados eliminados permanentemente com sucesso.' });
});

// Delete account by email or id
app.delete('/api/accounts/:idOrEmail', (req, res) => {
  const param = req.params.idOrEmail;
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

// ==========================================
// 4. AI ASSISTANT ROUTE (TEXT & AUDIO SUPPORT)
// ==========================================
const handleAiAssistantRequest = async (req: express.Request, res: express.Response) => {
  const prompt = req.body?.prompt || '';
  const audioBase64 = req.body?.audioBase64;
  const audioMimeType = req.body?.audioMimeType || 'audio/webm';

  if (!prompt && !audioBase64) {
    return res.status(400).json({ error: 'Envie um texto ou áudio para a IA processar.' });
  }

  const effectivePrompt = prompt.trim() || 'Por favor, ouça esta mensagem de áudio enviada pelo estudante no aplicativo CalFéx Pro e responda com clareza didática, objetividade e empatia.';

  const ai = getGeminiClient();

  if (!ai) {
    const rawFallback = generateLocalFallbackResponse(effectivePrompt);
    const cleanFallback = cleanAiResponse(rawFallback, effectivePrompt);
    return res.json({ reply: cleanFallback, isLocal: true });
  }

  // Build chat context
  let fullPrompt = effectivePrompt;
  const conversationHistory = req.body?.conversationHistory;
  if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .slice(-6)
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Aluno' : 'CalFéx IA'}: ${m.content}`)
      .join('\n');
    fullPrompt = `Histórico da conversa:\n${historyText}\n\nAluno: ${effectivePrompt}\nCalFéx IA:`;
  }

  // Build multimodal content parts
  const contentParts: any[] = [];
  if (audioBase64 && typeof audioBase64 === 'string') {
    // Strip data URI header if present
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    contentParts.push({
      inlineData: {
        mimeType: audioMimeType,
        data: cleanBase64,
      }
    });
  }
  contentParts.push({ text: fullPrompt });

  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ];

  let replyText: string | null = null;
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contentParts.length === 1 ? fullPrompt : contentParts,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      if (response && response.text) {
        replyText = response.text;
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} encountered (${err?.status || err?.message || 'Error'}). Proceeding to next model...`);
    }
  }

  if (replyText) {
    const sanitizedReply = cleanAiResponse(replyText, effectivePrompt);
    return res.json({ reply: sanitizedReply, isLocal: false });
  }

  console.warn('All AI models unavailable, serving smart local fallback. Last error:', lastError?.message || lastError);
  const rawFallback = generateLocalFallbackResponse(effectivePrompt);
  const sanitizedFallback = cleanAiResponse(rawFallback, effectivePrompt);
  return res.json({ reply: sanitizedFallback, isLocal: true });
};

app.post('/api/ai/assistant', handleAiAssistantRequest);
app.post('/api/gemini/assistant', handleAiAssistantRequest);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'CalFéx Pro', creator: 'Melcaniel Ulima', cloudSync: 'active' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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
    console.log(`CalFéx Pro Server running with Cloud Sync on http://localhost:${PORT}`);
  });
}

// Start standalone server unless running in serverless cloud function (Netlify / Lambda)
if (process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
export { app };

