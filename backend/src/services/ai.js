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
        content: `Documente o seguinte programa Progress 4GL.\n\nArquivo: ${fileName}\n\n\`\`\`progress\n${code}\n\`\`\``,
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
          content: `Documente o seguinte projeto Progress 4GL. Analise todos os arquivos e suas interdependências.\n\n${filesContent}`,
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

module.exports = { documentCode, documentProject };
