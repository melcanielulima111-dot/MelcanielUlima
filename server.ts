import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'calfex_cloud_db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data dir:', e);
}

function loadCloudDb(): CloudDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading cloud database file:', err);
  }
  return {};
}

function saveCloudDb(db: CloudDatabase): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
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
   - Filiação: Filho de Inocêncio Ulima e Ana Paula Ulima
   - Data de Nascimento: 06 de Outubro de 2010 (06/10/2010)
   - País: Angola`;

// Response cleaner ensuring no unrequested $ or # appear in the reply
function cleanAiResponse(text: string, userPrompt: string): string {
  const lowerPrompt = userPrompt.toLowerCase();
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
  const lower = prompt.toLowerCase();
  
  if (lower.includes('criador') || lower.includes('quem criou') || lower.includes('autor') || lower.includes('melcaniel') || lower.includes('ulima') || lower.includes('inocencio') || lower.includes('ana paula')) {
    return `🌟 **Criador do CalFéx Pro**
- **Nome:** Melcaniel Ulima
- **Filiação:** Filho de Inocêncio Ulima e Ana Paula Ulima
- **Data de Nascimento:** 06/10/2010 (6 de Outubro de 2010)
- **Origem:** Angola`;
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
    const profiles = Object.values(cloudDatabase).map(r => r.profile).filter(Boolean);
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
    
    // If account has password and password was provided, verify it
    if (studentPass && password) {
      if (studentPass.toString().trim() !== password.toString().trim()) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta. Por favor, verifique a senha digitada e tente novamente.'
        });
      }
    }

    return res.json({
      success: true,
      student: matched.profile,
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
app.post('/api/accounts/forgot-password', (req, res) => {
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

  if (!matched || !matched.profile) {
    return res.status(404).json({
      success: false,
      message: 'Não encontramos nenhuma conta com essas informações cadastradas. Verifique se digitou corretamente.'
    });
  }

  const profile = matched.profile;
  const targetEmail = profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '')}@calfex.ao`;
  
  // Generate a random 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  passwordResetCodes[targetEmail.toLowerCase()] = {
    code,
    studentId: profile.id,
    expiresAt,
    studentName: profile.name
  };

  // Mask email for privacy (e.g. m***l@gmail.com)
  const atIndex = targetEmail.indexOf('@');
  let maskedEmail = targetEmail;
  if (atIndex > 2) {
    const namePart = targetEmail.substring(0, atIndex);
    const domainPart = targetEmail.substring(atIndex);
    maskedEmail = `${namePart[0]}***${namePart[namePart.length - 1]}${domainPart}`;
  }

  return res.json({
    success: true,
    message: `Código de verificação enviado para ${maskedEmail}`,
    email: targetEmail,
    maskedEmail,
    studentName: profile.name,
    code, // Returned so frontend can simulate instant delivery in testing
    expiresInSeconds: 900
  });
});

// Verify Password Reset Code
app.post('/api/accounts/verify-reset-code', (req, res) => {
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
    return res.status(400).json({ success: false, message: 'Este código expirou (validade de 15 minutos). Solicite um novo código.' });
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
  cloudDatabase[targetRecordKey].profile.password = cleanPass;
  
  if (!cloudDatabase[targetRecordKey].securitySettings) {
    cloudDatabase[targetRecordKey].securitySettings = { mode: 'pin', pinCode: cleanPass };
  } else {
    cloudDatabase[targetRecordKey].securitySettings.pinCode = cleanPass;
  }
  
  cloudDatabase[targetRecordKey].updatedAt = new Date().toISOString();
  saveCloudDb(cloudDatabase);

  // Clean up used code
  delete passwordResetCodes[cleanEmail];

  return res.json({
    success: true,
    message: 'Senha redefinida com sucesso!',
    student: cloudDatabase[targetRecordKey].profile
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

  // Ensure securitySettings has pin/password if profile has password
  const finalSecSettings = securitySettings || {
    mode: profile.password ? 'pin' : 'none',
    pinCode: profile.password || ''
  };

  cloudDatabase[studentId] = {
    profile,
    subjects: Array.isArray(subjects) ? subjects : (cloudDatabase[studentId]?.subjects || []),
    securitySettings: finalSecSettings,
    targetGrade: targetGrade || profile.targetGrade || 14,
    schedule: schedule || cloudDatabase[studentId]?.schedule || [],
    pautaLinks: pautaLinks || cloudDatabase[studentId]?.pautaLinks || [],
    updatedAt: now
  };

  saveCloudDb(cloudDatabase);

  res.json({
    success: true,
    student: profile,
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
// 4. AI ASSISTANT ROUTE (CLEAN TEXT)
// ==========================================
app.post('/api/gemini/assistant', async (req, res) => {
  const prompt = req.body?.prompt;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt é obrigatório' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    const rawFallback = generateLocalFallbackResponse(prompt);
    const cleanFallback = cleanAiResponse(rawFallback, prompt);
    return res.json({ reply: cleanFallback, isLocal: true });
  }

  // Build chat context
  let fullPrompt = prompt;
  const conversationHistory = req.body?.conversationHistory;
  if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .slice(-6)
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Aluno' : 'CalFéx IA'}: ${m.content}`)
      .join('\n');
    fullPrompt = `Histórico da conversa:\n${historyText}\n\nAluno: ${prompt}\nCalFéx IA:`;
  }

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
        contents: fullPrompt,
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
      // If 503 transient demand spike, do a short retry with next model
      console.warn(`Model ${modelName} encountered (${err?.status || err?.message || 'Error'}). Proceeding to next model...`);
    }
  }

  if (replyText) {
    const sanitizedReply = cleanAiResponse(replyText, prompt);
    return res.json({ reply: sanitizedReply, isLocal: false });
  }

  console.warn('All Gemini models unavailable, serving smart local fallback. Last error:', lastError?.message || lastError);
  const rawFallback = generateLocalFallbackResponse(prompt);
  const sanitizedFallback = cleanAiResponse(rawFallback, prompt);
  return res.json({ reply: sanitizedFallback, isLocal: true });
});

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

startServer();
