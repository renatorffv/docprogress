const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt } = require("./training");

const client = new Anthropic();

// Rate limit: 50.000 tokens input/min. Chunks de ~35K tokens deixam margem segura.
const MAX_CHUNK_CHARS = 35_000 * 4; // ~140K chars ≈ 35K tokens

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayForChars(chars) {
  const estimatedTokens = chars / 4;
  const msNeeded = (estimatedTokens / 50_000) * 60_000;
  return Math.max(msNeeded + 3_000, 5_000);
}

async function callWithRetry(fn, onProgress, retryMessage, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && attempt < maxRetries) {
        const waitMs = 65_000 * (attempt + 1);
        console.warn(`Rate limit atingido (tentativa ${attempt + 1}). Aguardando ${waitMs / 1000}s...`);
        await sleepWithCountdown(waitMs, (remaining) => {
          onProgress?.({ message: `Rate limit atingido — aguardando ${remaining}s para tentar novamente...` });
        });
      } else {
        throw err;
      }
    }
  }
}

// Executa o sleep em fatias de 3s atualizando o progresso com countdown
async function sleepWithCountdown(totalMs, onTick) {
  const tick = 3_000;
  let elapsed = 0;
  while (elapsed < totalMs) {
    const remaining = Math.ceil((totalMs - elapsed) / 1000);
    onTick?.(remaining);
    const step = Math.min(tick, totalMs - elapsed);
    await sleep(step);
    elapsed += step;
  }
}

async function documentCode(code, fileName) {
  const systemPrompt = buildSystemPrompt();

  const message = await callWithRetry(
    () => client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Documente o seguinte programa Progress 4GL seguindo TODAS as seções definidas no system prompt.\n\nIMPORTANTE: Inclua obrigatoriamente:\n- "Visão Geral": explicação em linguagem de negócio, sem jargão técnico\n- "Sugestões de Melhoria": com as 4 categorias (Hard Code, Performance, Manutenibilidade, Boas Práticas)\n\nArquivo: ${fileName}\n\n\`\`\`progress\n${code}\n\`\`\``,
      }],
    }),
    null
  );

  return message.content[0].text;
}

function splitIntoChunks(files) {
  const chunks = [];
  let current = [];
  let size = 0;

  for (const file of files) {
    const block = `### Arquivo: ${file.name}\n\`\`\`progress\n${file.content}\n\`\`\``;
    if (size + block.length > MAX_CHUNK_CHARS && current.length > 0) {
      chunks.push({ files: current, size });
      current = [file];
      size = block.length;
    } else {
      current.push(file);
      size += block.length;
    }
  }
  if (current.length > 0) chunks.push({ files: current, size });
  return chunks;
}

async function documentProject(files, onProgress) {
  const report = (data) => onProgress?.(data);
  const systemPrompt = buildSystemPrompt();
  const systemBlock = [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];

  report({ percent: 2, message: `Analisando ${files.length} arquivo(s)...` });
  const chunks = splitIntoChunks(files);
  console.log(`Documentando projeto: ${files.length} arquivo(s) em ${chunks.length} lote(s).`);

  // Projeto cabe em um único lote
  if (chunks.length === 1) {
    const filesContent = chunks[0].files
      .map((f) => `### Arquivo: ${f.name}\n\`\`\`progress\n${f.content}\n\`\`\``)
      .join("\n\n");

    report({ percent: 10, message: `Documentando ${chunks[0].files.length} arquivo(s)...` });
    const message = await callWithRetry(
      () => client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: systemBlock,
        messages: [{
          role: "user",
          content: `Documente o seguinte projeto Progress 4GL. Analise todos os arquivos e suas interdependências.\n\nIMPORTANTE: Inclua obrigatoriamente "Visão Geral" (linguagem de negócio) e "Sugestões de Melhoria" (Hard Code, Performance, Manutenibilidade, Boas Práticas) para cada programa.\n\n${filesContent}`,
        }],
      }),
      report
    );
    report({ percent: 98, message: "Salvando documentação..." });
    return message.content[0].text;
  }

  // Projeto grande: documenta cada lote com delay entre chamadas
  // Percentual: lotes ocupam 0–80%, síntese ocupa 80–98%
  const totalSteps = chunks.length + 1; // lotes + síntese
  const chunkDocs = [];

  for (let i = 0; i < chunks.length; i++) {
    const percentAtChunkStart = Math.round(5 + (i / totalSteps) * 75);
    const percentAtChunkEnd   = Math.round(5 + ((i + 1) / totalSteps) * 75);

    if (i > 0) {
      const waitMs = delayForChars(chunks[i - 1].size);
      console.log(`Lote ${i}/${chunks.length} concluído. Aguardando ${Math.round(waitMs / 1000)}s...`);
      await sleepWithCountdown(waitMs, (remaining) => {
        report({
          percent: percentAtChunkStart,
          message: `Lote ${i} de ${chunks.length} concluído — aguardando ${remaining}s (limite de taxa da API)...`,
        });
      });
    }

    report({
      percent: percentAtChunkStart + Math.round((percentAtChunkEnd - percentAtChunkStart) * 0.3),
      message: `Documentando lote ${i + 1} de ${chunks.length} (${chunks[i].files.length} arquivo(s))...`,
    });

    const filesContent = chunks[i].files
      .map((f) => `### Arquivo: ${f.name}\n\`\`\`progress\n${f.content}\n\`\`\``)
      .join("\n\n");

    console.log(`Processando lote ${i + 1}/${chunks.length} (${chunks[i].files.length} arquivo(s))...`);
    const message = await callWithRetry(
      () => client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: systemBlock,
        messages: [{
          role: "user",
          content: `Documente os arquivos abaixo (lote ${i + 1} de ${chunks.length}). Analise cada arquivo e suas dependências internas.\n\n${filesContent}`,
        }],
      }),
      report
    );
    chunkDocs.push(message.content[0].text);

    report({ percent: percentAtChunkEnd, message: `Lote ${i + 1} de ${chunks.length} concluído.` });
  }

  // Aguarda antes da síntese
  const lastChunkWait = delayForChars(chunks[chunks.length - 1].size);
  const percentBeforeSynthesis = Math.round(5 + (chunks.length / totalSteps) * 75);
  console.log(`Todos os lotes processados. Aguardando ${Math.round(lastChunkWait / 1000)}s antes da síntese...`);
  await sleepWithCountdown(lastChunkWait, (remaining) => {
    report({
      percent: percentBeforeSynthesis,
      message: `Todos os lotes concluídos — aguardando ${remaining}s antes de gerar a síntese...`,
    });
  });

  report({ percent: 82, message: "Gerando documentação consolidada do projeto..." });

  const combined = chunkDocs
    .map((doc, i) => `## Lote ${i + 1}\n\n${doc}`)
    .join("\n\n---\n\n");

  console.log("Gerando síntese final do projeto...");
  const synthesis = await callWithRetry(
    () => client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: systemBlock,
      messages: [{
        role: "user",
        content: `Com base nas documentações parciais abaixo (${chunks.length} lotes, ${files.length} arquivos no total), crie uma documentação consolidada do projeto Progress 4GL. Descreva a arquitetura geral, as interdependências entre os módulos e um resumo executivo do sistema.\n\n${combined}`,
      }],
    }),
    report
  );

  report({ percent: 98, message: "Salvando documentação..." });
  return synthesis.content[0].text;
}

/**
 * Analisa todos os arquivos do projeto e identifica grupos de programas.
 * Retorna array de grupos conforme convenções do ERP Datasul.
 */
async function analyzeProjectGroups(files, dependencyGraph, onProgress) {
  const report = (data) => onProgress?.(data);
  const systemPrompt = buildSystemPrompt();

  report({ percent: 15, message: "Preparando dados para análise..." });

  // Monta o grafo de dependências em texto
  const graphLines = [];
  for (const [key, node] of dependencyGraph.entries()) {
    const parts = [];
    if (node.runs.length > 0) parts.push(`chama: [${node.runs.join(", ")}]`);
    if (node.includes.length > 0) parts.push(`inclui: [${node.includes.join(", ")}]`);
    graphLines.push(`- ${node.name}${parts.length ? " → " + parts.join(" | ") : " → (sem referências)"}`);
  }

  // Resumo do conteúdo de cada arquivo (primeiras 20 linhas não vazias)
  const { fileSummary } = require("./analyzer");
  const summaries = files
    .map((f) => `### ${f.name}\n${fileSummary(f.content, 20)}`)
    .join("\n\n");

  const prompt = `Você é um especialista em Progress 4GL para o ERP Datasul.

Analise os arquivos abaixo e agrupe-os em "programas" lógicos distintos.

CONVENÇÕES DO DATASUL:
- Arquivos com o mesmo prefixo de nome geralmente pertencem ao mesmo programa
  (ex: esft0001.w + esft0001rp.p + esft0001.i → programa "esft0001")
- Sufixos comuns: "rp" = procedure de relatório, "v" = viewer, "b" = business object,
  "f" = filtro/frame, "00"/"01" = subprogramas sequenciais
- Arquivos .i são includes — inclua no grupo que mais os usa ou que os chama diretamente
- Um relatório: normalmente 1 .w (tela de parâmetros) + 1 .p com sufixo "rp"
- Uma tela/manutenção: normalmente 1 .w container + 1 ou mais .w viewers

DEPENDÊNCIAS DETECTADAS ESTATICAMENTE:
${graphLines.join("\n")}

RESUMO DO CONTEÚDO DOS ARQUIVOS:
${summaries}

Retorne APENAS um JSON válido, sem markdown, sem explicações, no formato:
{
  "groups": [
    {
      "id": "identificador_sem_extensao",
      "name": "Nome descritivo em português",
      "type": "relatorio|tela|procedure|util|outro",
      "mainFile": "arquivo_principal.ext",
      "files": ["arquivo1.ext", "arquivo2.ext"],
      "description": "Descrição breve do que este programa faz (1-2 frases)"
    }
  ]
}`;

  report({ percent: 30, message: "Enviando análise para a IA..." });

  const message = await callWithRetry(
    () => client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    }),
    report
  );

  report({ percent: 80, message: "Processando resultado da análise..." });

  const text = message.content[0].text.trim();
  // Remove possíveis blocos markdown se Claude os incluir mesmo com instrução
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  try {
    const result = JSON.parse(clean);
    return result.groups || [];
  } catch {
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }
}

/**
 * Documenta um conjunto de arquivos como um único programa Datasul.
 */
async function documentGroup(groupFiles, groupName, groupType, groupDescription, onProgress) {
  const report = (data) => onProgress?.(data);
  const systemPrompt = buildSystemPrompt();
  const systemBlock = [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];

  const typeLabel = {
    relatorio: "Relatório",
    tela: "Tela / Manutenção",
    procedure: "Procedure",
    util: "Utilitário",
    outro: "Programa",
  }[groupType] || "Programa";

  report({ percent: 5, message: `Preparando documentação do programa ${groupName}...` });

  const chunks = splitIntoChunks(groupFiles);
  const totalSteps = chunks.length + (chunks.length > 1 ? 1 : 0);

  if (chunks.length === 1) {
    const filesContent = chunks[0].files
      .map((f) => `### Arquivo: ${f.name}\n\`\`\`progress\n${f.content}\n\`\`\``)
      .join("\n\n");

    report({ percent: 20, message: `Documentando ${groupFiles.length} arquivo(s) do programa...` });

    const message = await callWithRetry(
      () => client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: systemBlock,
        messages: [{
          role: "user",
          content: `Documente o programa "${groupName}" (${typeLabel}) do ERP Datasul.\n\nDescrição: ${groupDescription}\n\nAnalise todos os arquivos abaixo como uma unidade funcional única e gere documentação seguindo TODAS as seções do system prompt.\n\nIMPORTANTE — inclua obrigatoriamente:\n1. "Visão Geral": explicação em linguagem de negócio, sem jargão técnico, para usuários finais\n2. "Objetivo Técnico": tipo, módulo e responsabilidades\n3. Seções técnicas resumidas (Parâmetros, Tabelas, Procedures, Fluxo, etc.)\n4. "Sugestões de Melhoria": analise o código e liste achados nas 4 categorias — (a) Dados Fixos/Hard Code encontrados, (b) Problemas de Performance, (c) Manutenibilidade, (d) Boas Práticas. Se não houver ocorrências em uma categoria, escreva "Nenhuma ocorrência identificada."\n\n${filesContent}`,
        }],
      }),
      report
    );

    report({ percent: 95, message: "Salvando documentação..." });
    return message.content[0].text;
  }

  // Múltiplos lotes
  const chunkDocs = [];
  for (let i = 0; i < chunks.length; i++) {
    const basePercent = Math.round(10 + (i / totalSteps) * 70);
    if (i > 0) {
      const waitMs = delayForChars(chunks[i - 1].size);
      await sleepWithCountdown(waitMs, (remaining) => {
        report({ percent: basePercent, message: `Lote ${i} concluído — aguardando ${remaining}s...` });
      });
    }
    report({ percent: basePercent + 5, message: `Documentando lote ${i + 1} de ${chunks.length}...` });
    const filesContent = chunks[i].files
      .map((f) => `### Arquivo: ${f.name}\n\`\`\`progress\n${f.content}\n\`\`\``)
      .join("\n\n");
    const message = await callWithRetry(
      () => client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: systemBlock,
        messages: [{
          role: "user",
          content: `Documente os arquivos abaixo (lote ${i + 1}/${chunks.length}) do programa "${groupName}" (${typeLabel}) do ERP Datasul. Inclua Visão Geral em linguagem de negócio e Sugestões de Melhoria com Hard Code, Performance, Manutenibilidade e Boas Práticas.\n\n${filesContent}`,
        }],
      }),
      report
    );
    chunkDocs.push(message.content[0].text);
  }

  const lastWait = delayForChars(chunks[chunks.length - 1].size);
  await sleepWithCountdown(lastWait, (remaining) => {
    report({ percent: 82, message: `Preparando síntese — aguardando ${remaining}s...` });
  });

  report({ percent: 87, message: "Gerando documentação consolidada do programa..." });
  const combined = chunkDocs.map((d, i) => `## Parte ${i + 1}\n\n${d}`).join("\n\n---\n\n");
  const synthesis = await callWithRetry(
    () => client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: systemBlock,
      messages: [{
        role: "user",
        content: `Com base nas partes abaixo, crie a documentação completa e consolidada do programa "${groupName}" (${typeLabel}) do ERP Datasul.\n\nDescrição: ${groupDescription}\n\nIMPORTANTE: A documentação final deve incluir obrigatoriamente:\n1. "Visão Geral": linguagem de negócio, sem jargão técnico, para o usuário final\n2. Seções técnicas consolidadas e resumidas\n3. "Sugestões de Melhoria" consolidadas com as 4 categorias: Hard Code, Performance, Manutenibilidade, Boas Práticas\n\n${combined}`,
      }],
    }),
    report
  );
  report({ percent: 98, message: "Salvando..." });
  return synthesis.content[0].text;
}

module.exports = { documentCode, documentProject, analyzeProjectGroups, documentGroup };
