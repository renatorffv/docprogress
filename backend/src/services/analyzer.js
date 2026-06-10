const path = require("path");

/**
 * Extrai referências estáticas (RUN e includes) de um arquivo Progress 4GL.
 */
function extractReferences(content, fileName) {
  const runs = new Set();
  const includes = new Set();
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // RUN filename.p / RUN filename.w  (ignora RUN SUPER, RUN VALUE, RUN STORED-PROCEDURE)
  const runRe = /\bRUN\s+(?!SUPER\b|VALUE\b|STORED-PROCEDURE\b)"?'?([A-Za-z0-9_\-./\\]+\.(?:p|w|r))["']?\s*(?:[.(,\s]|$)/gim;
  let m;
  while ((m = runRe.exec(text)) !== null) {
    runs.add(path.basename(m[1]).toLowerCase());
  }

  // {filename.i}  ou  {path/filename.i &PARAM=x}
  const inclRe = /\{\s*([A-Za-z0-9_\-./\\]+\.i\d*)\s*(?:[^}]*)?\}/gi;
  while ((m = inclRe.exec(text)) !== null) {
    includes.add(path.basename(m[1]).toLowerCase());
  }

  return { runs: [...runs], includes: [...includes] };
}

/**
 * Constrói um grafo de dependências para todos os arquivos do projeto.
 * Retorna Map<nomeArquivo.toLowerCase(), { name, runs[], includes[] }>
 */
function buildDependencyGraph(files) {
  const graph = new Map();
  for (const file of files) {
    const refs = extractReferences(file.content, file.name);
    graph.set(file.name.toLowerCase(), {
      name: file.name,
      runs: refs.runs,
      includes: refs.includes,
    });
  }
  return graph;
}

/**
 * Retorna as primeiras N linhas não vazias de um conteúdo, como resumo.
 */
function fileSummary(content, lines = 20) {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(0, lines)
    .join("\n");
}

module.exports = { buildDependencyGraph, fileSummary };
