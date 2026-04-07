const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt } = require("./training");

const client = new Anthropic();

async function documentCode(code, fileName) {
  const systemPrompt = buildSystemPrompt();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Documente o seguinte programa Progress 4GL.\n\nArquivo: ${fileName}\n\n\`\`\`progress\n${code}\n\`\`\``,
      },
    ],
  });

  return message.content[0].text;
}

async function documentProject(files) {
  const systemPrompt = buildSystemPrompt();

  const filesContent = files
    .map((f) => `### Arquivo: ${f.name}\n\`\`\`progress\n${f.content}\n\`\`\``)
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Documente o seguinte projeto Progress 4GL. Analise todos os arquivos e suas interdependências.\n\n${filesContent}`,
      },
    ],
  });

  return message.content[0].text;
}

module.exports = { documentCode, documentProject };
