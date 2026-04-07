# Documentador Progress 4GL

Aplicacao para documentacao automatizada de programas Progress 4GL usando IA.

## Arquitetura

- **Backend**: Node.js + Express (porta 3001)
- **Frontend**: Next.js com App Router, 100% SSR (porta 3000)
- **IA**: Claude (Anthropic API) para analise e documentacao do codigo

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edite .env e coloque sua ANTHROPIC_API_KEY
npm install
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Acessar

Abra http://localhost:3000

## Como Usar

1. Acesse a pagina de **Upload**
2. Arraste ou selecione arquivos Progress 4GL (.p, .w, .i, .cls)
3. Na pagina do projeto, clique em um arquivo e depois em **"Documentar este arquivo"** para documentar individualmente
4. Ou clique em **"Documentar Projeto Inteiro"** para gerar documentacao completa com analise de interdependencias

## O que a IA documenta

Para cada programa, a IA gera:

- Objetivo do programa
- Parametros de entrada/saida
- Tabelas utilizadas (leitura/escrita)
- Includes referenciados
- Procedures internas
- Functions com parametros e retorno
- Triggers
- Fluxo principal de execucao
- Dependencias externas (RUN)
- Observacoes e pontos de atencao

## Extensoes aceitas

| Extensao | Descricao |
|----------|-----------|
| .p | Programas Progress |
| .w | Windows/Telas |
| .i | Includes |
| .cls | Classes |
| .t | Triggers |
