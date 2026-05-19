# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (porta 3001)
```bash
cd backend
npm install
npm run dev      # node --watch (auto-reload)
npm start        # produção
```

Requer `backend/.env` com:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

### Frontend (porta 3000)
```bash
cd frontend
npm install
npm run dev
npm run build && npm start   # produção
npm run lint
```

## Architecture

Dois processos independentes sem banco de dados — toda persistência é em arquivos no disco.

### Backend (`backend/src/`)

- **`server.js`** — Express app, monta as 4 rotas, cria `uploads/` e `docs/` se não existirem.
- **`services/storage.js`** — Toda I/O de disco. Projetos ficam em `uploads/{projectId}/` com um `manifest.json`. Documentações ficam em `docs/{projectId}/{arquivo}.md`; documentação do projeto inteiro salva como `_projeto.md`.
- **`services/ai.js`** — Chama `claude-haiku-4-5-20251001` via `@anthropic-ai/sdk`. `documentCode()` para arquivo único, `documentProject()` para múltiplos arquivos com análise de interdependências.
- **`services/training.js`** — Gerencia o system prompt da IA. Configuração persistida em `docs/training.json`; se não existir, usa `DEFAULT_TRAINING` embutido no código. `buildSystemPrompt()` monta o prompt final.

### Frontend (`frontend/src/`)

Padrão Next.js App Router com separação SSR/cliente:

- **`app/*/page.tsx`** — Server Components que fazem fetch via `src/lib/api.ts`. Usam `process.env.API_URL` (pode ser sobrescrito em produção).
- **Componentes `*Detail.tsx` / `*Editor.tsx`** — Marcados com `"use client"`, recebem dados via props do Server Component pai e fazem chamadas mutantes ao backend diretamente para `http://localhost:3001`.
- **`lib/api.ts`** — Dois conjuntos de funções: SSR usam `process.env.API_URL || "http://localhost:3001"`; client-side hardcoded em `http://localhost:3001`.

### Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/upload` | Upload de arquivos (.p .w .i .cls .t .r), retorna `projectId` |
| GET | `/api/projects` | Lista todos os projetos |
| GET | `/api/projects/:id` | Manifesto do projeto |
| GET | `/api/projects/:id/files` | Conteúdo dos arquivos |
| POST | `/api/document/file` | Documenta um arquivo via IA |
| POST | `/api/document/project` | Documenta projeto inteiro via IA |
| GET | `/api/document/:projectId` | Busca documentações geradas |
| GET/PUT | `/api/training` | Lê/salva configuração do system prompt |
| POST | `/api/training/reset` | Restaura DEFAULT_TRAINING |
| GET | `/api/training/preview` | Retorna o system prompt compilado |

### Fluxo de dados

1. Upload → `multer` salva em `uploads/tmp/`, `storage.saveProject()` move para `uploads/{uuid}/` e grava `manifest.json`
2. Documentar → lê conteúdo do disco, envia para Claude, salva resposta como `.md`
3. Listar docs → lê arquivos `.md` do diretório `docs/{projectId}/`
