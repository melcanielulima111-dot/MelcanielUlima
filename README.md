# CalFéx Pro — Sistema de Gestão Académica & Inteligência Artificial

Sistema completo para estudantes e instituições escolares gerirem notas, pautas trimestrais, simuladores de médias e tutoria inteligente por IA (com suporte a texto, gravação de voz e áudio).

---

## 🌐 1. Publicação no Netlify (Passo a Passo)

### Configurações de Deploy no Netlify:
- **Build command (Comando de build):** `npm run build`
- **Publish directory (Pasta de publicação):** `dist`
- **Functions directory:** `netlify/functions` (configurado automaticamente pelo `netlify.toml`)

### Configuração de Variáveis de Ambiente no Netlify:
Acesse no painel do Netlify: **Site configuration > Environment variables > Add a variable**:

1. `GEMINI_API_KEY`: Sua chave de API do Google Gemini ([obter gratuitamente aqui](https://aistudio.google.com/app/apikey)).
2. `CALFEX_SENDER_EMAIL`: `calfex39@gmail.com`
3. `GMAIL_APP_PASSWORD`: Senha de app do Gmail para envio de códigos de verificação e recuperação.

O arquivo `netlify.toml` e `public/_redirects` já estão configurados no projeto para garantir:
- Roteamento SPA perfeito (redireciona rotas para `index.html` com código 200).
- Suporte a chamadas de API (`/api/*`) processadas pelas Netlify Functions sem necessidade de servidor externo.

---

## 🐙 2. Como Enviar para o GitHub

1. No terminal da pasta do projeto descompactado:
   ```bash
   git init
   git add .
   git commit -m "feat: CalFéx Pro release"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```
2. O arquivo `.gitignore` já está configurado para proteger todos os segredos e arquivos `.env`, impedindo o vazamento de chaves ou credenciais para o repositório público.

---

## 💻 3. Execução Local / Servidor VPS / Docker

1. **Instalar as dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env` e preencha suas variáveis:
   ```bash
   cp .env.example .env
   ```

3. **Iniciar em modo desenvolvimento:**
   ```bash
   npm run dev
   ```
   *Acesso em: `http://localhost:3000`*

4. **Compilar e rodar em produção:**
   ```bash
   npm run build
   npm start
   ```

---

## 🔒 4. Funcionalidades & Arquitetura

- **Tutor IA com Áudio e Texto:** Integração com Google Gemini 3.7 Flash. Se a chave não for informada, o sistema possui um motor de resposta inteligente didático offline para nunca deixar o aluno sem resposta.
- **Armazenamento e Contas:** Persistência em `data/calfex_cloud_db.json` com fallback automático para `localStorage` do navegador.
- **Notificações:** Suporte a Web Notifications API com alertas sonoros e visuais nativos no navegador.
- **Modo Offline:** Todas as calculadoras de médias, pautas, simuladores de notas e armazenamento local continuam 100% funcionais mesmo sem internet.

---
Criado com excelência por **Melcaniel Ulima**.
