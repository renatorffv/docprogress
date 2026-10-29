const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

// Lê o token JWT do cookie para chamadas SSR (Server Components não têm localStorage)
async function ssrAuthHeader(): Promise<Record<string, string>> {
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchProjects() {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/projects`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Falha ao buscar projetos");
  return res.json();
}

export async function fetchProject(id: string) {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/projects/${id}`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Projeto não encontrado");
  return res.json();
}

export async function fetchProjectFiles(id: string) {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/projects/${id}/files`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Falha ao buscar arquivos");
  return res.json();
}

export async function fetchDocumentation(projectId: string) {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/document/${projectId}`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Falha ao buscar documentação");
  return res.json();
}

export async function fetchTraining() {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/training`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Falha ao buscar treinamento");
  return res.json();
}

export async function fetchTrainingPreview() {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/training/preview`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Falha ao buscar preview");
  return res.json();
}

export async function fetchSettings() {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/settings`, { cache: "no-store", headers });
  if (!res.ok) throw new Error("Falha ao buscar configurações");
  return res.json();
}

// Client-side: usa URL relativa para passar pelo proxy do Vercel (evita mixed-content HTTPS→HTTP)
// Em desenvolvimento local continua apontando direto para localhost:3001
const CLIENT_API = typeof window !== "undefined" && window.location.protocol === "https:"
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

// Divide arquivos em lotes de até 3 MB ou 100 arquivos para contornar o limite de proxy do Vercel (~4.5 MB)
const MAX_BATCH_BYTES = 3 * 1024 * 1024;
const MAX_BATCH_FILES = 100;

function buildBatches(files: File[], relPaths: string[]): Array<{ files: File[]; relPaths: string[] }> {
  const batches: Array<{ files: File[]; relPaths: string[] }> = [];
  let bFiles: File[] = [];
  let bPaths: string[] = [];
  let bSize = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (bFiles.length > 0 && (bSize + f.size > MAX_BATCH_BYTES || bFiles.length >= MAX_BATCH_FILES)) {
      batches.push({ files: bFiles, relPaths: bPaths });
      bFiles = [];
      bPaths = [];
      bSize = 0;
    }
    bFiles.push(f);
    bPaths.push(relPaths[i]);
    bSize += f.size;
  }
  if (bFiles.length > 0) batches.push({ files: bFiles, relPaths: bPaths });
  return batches;
}

function extractRelPath(f: File): string {
  const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
  if (wp) {
    const parts = wp.split("/");
    return parts.length > 1 ? parts.slice(1).join("/") : f.name;
  }
  return f.name;
}

export async function uploadFiles(
  files: File[] | FileList,
  name?: string,
  onProgress?: (done: number, total: number) => void
) {
  const allFiles = Array.from(files) as File[];
  const relPaths = allFiles.map(extractRelPath);
  const batches = buildBatches(allFiles, relPaths);
  let projectId: string | null = null;

  for (let b = 0; b < batches.length; b++) {
    const { files: bFiles, relPaths: bPaths } = batches[b];
    const formData = new FormData();
    const meta = bFiles.map((f) => ({ name: f.name, lastModified: f.lastModified }));
    bFiles.forEach((f) => formData.append("files", f));
    formData.append("filesMetadata", JSON.stringify(meta));
    formData.append("filesRelativePaths", JSON.stringify(bPaths));

    let res: Response;
    if (projectId === null) {
      if (name) formData.append("name", name);
      res = await fetch(`${CLIENT_API}/api/upload`, {
        method: "POST",
        body: formData,
        headers: authHeaders(),
      });
    } else {
      res = await fetch(`${CLIENT_API}/api/upload/${projectId}/update`, {
        method: "POST",
        body: formData,
        headers: authHeaders(),
      });
    }

    if (!res.ok) {
      let msg = "Falha no upload";
      try {
        const err = await res.json();
        msg = err.error || msg;
      } catch {
        msg = `Erro ${res.status}: verifique se o backend está rodando`;
      }
      throw new Error(msg);
    }

    const data = await res.json();
    if (projectId === null) projectId = data.projectId;
    onProgress?.(b + 1, batches.length);
  }

  return { projectId };
}

export async function generateDocFile(projectId: string, fileName: string) {
  const res = await fetch(`${CLIENT_API}/api/document/file`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ projectId, fileName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha ao gerar documentação");
  }
  return res.json();
}

export async function startDocProject(projectId: string): Promise<string> {
  const res = await fetch(`${CLIENT_API}/api/document/project`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) {
    let msg = "Falha ao iniciar documentação";
    try { const e = await res.json(); msg = e.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const { jobId } = await res.json();
  return jobId;
}

export async function pollDocProject(jobId: string): Promise<{
  status: string;
  percent?: number;
  message?: string;
  fileName?: string;
  documentation?: string;
  error?: string;
}> {
  const res = await fetch(`${CLIENT_API}/api/document/project/status/${jobId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Job não encontrado. O servidor pode ter reiniciado durante o processamento — clique em 'Re-documentar' para tentar novamente.");
    }
    throw new Error("Erro ao consultar status do job");
  }
  return res.json();
}

// Mantido para compatibilidade — usa polling internamente
export async function generateDocProject(projectId: string) {
  const jobId = await startDocProject(projectId);
  while (true) {
    await new Promise((r) => setTimeout(r, 4000));
    const job = await pollDocProject(jobId);
    if (job.status === "done") return job;
    if (job.status === "error") throw new Error(job.error || "Erro ao documentar projeto");
  }
}

export async function saveTraining(data: unknown) {
  const res = await fetch(`${CLIENT_API}/api/training`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha ao salvar treinamento");
  }
  return res.json();
}

export async function resetTraining() {
  const res = await fetch(`${CLIENT_API}/api/training/reset`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Falha ao resetar treinamento");
  return res.json();
}

export async function fetchTrainingPreviewClient() {
  const res = await fetch(`${CLIENT_API}/api/training/preview`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Falha ao buscar preview");
  return res.json();
}

export async function updateProjectFiles(
  projectId: string,
  files: File[] | FileList,
  onProgress?: (done: number, total: number) => void
): Promise<{ added: string[]; changed: string[]; affectedGroups: string[] }> {
  const allFiles = Array.from(files) as File[];
  const relPaths = allFiles.map(extractRelPath);
  const batches = buildBatches(allFiles, relPaths);
  const result = { added: [] as string[], changed: [] as string[], affectedGroups: [] as string[] };

  for (let b = 0; b < batches.length; b++) {
    const { files: bFiles, relPaths: bPaths } = batches[b];
    const formData = new FormData();
    const meta = bFiles.map((f) => ({ name: f.name, lastModified: f.lastModified }));
    bFiles.forEach((f) => formData.append("files", f));
    formData.append("filesMetadata", JSON.stringify(meta));
    formData.append("filesRelativePaths", JSON.stringify(bPaths));

    const res = await fetch(`${CLIENT_API}/api/upload/${projectId}/update`, {
      method: "POST",
      body: formData,
      headers: authHeaders(),
    });
    if (!res.ok) {
      let msg = "Falha na atualização";
      try { const err = await res.json(); msg = err.error || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    const data = await res.json();
    result.added.push(...(data.added || []));
    result.changed.push(...(data.changed || []));
    const newGroups = (data.affectedGroups || []) as string[];
    newGroups.forEach((g: string) => { if (!result.affectedGroups.includes(g)) result.affectedGroups.push(g); });
    onProgress?.(b + 1, batches.length);
  }

  return result;
}

export async function saveProjectLogo(projectId: string, logoBase64: string | null) {
  const res = await fetch(`${CLIENT_API}/api/projects/${projectId}/logo`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ logoBase64 }),
  });
  if (!res.ok) throw new Error("Falha ao salvar logo");
  return res.json();
}

export async function saveProjectShowConfigLogo(projectId: string, showConfigLogo: boolean) {
  const res = await fetch(`${CLIENT_API}/api/projects/${projectId}/show-config-logo`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ showConfigLogo }),
  });
  if (!res.ok) throw new Error("Falha ao salvar configuração de logo");
  return res.json();
}

export async function saveProjectIncludeSuggestions(projectId: string, includeSuggestions: boolean) {
  const res = await fetch(`${CLIENT_API}/api/projects/${projectId}/include-suggestions`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ includeSuggestions }),
  });
  if (!res.ok) throw new Error("Falha ao salvar configuração de sugestões");
  return res.json();
}

export async function saveProjectDescription(projectId: string, description: string) {
  const res = await fetch(`${CLIENT_API}/api/projects/${projectId}/description`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw new Error("Falha ao salvar descrição");
  return res.json();
}

export async function saveGroupDescription(projectId: string, groupId: string, description: string) {
  const res = await fetch(`${CLIENT_API}/api/document/analysis/${projectId}/groups/${groupId}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw new Error("Falha ao salvar descrição do grupo");
  return res.json();
}

export async function renameProject(projectId: string, name: string) {
  const res = await fetch(`${CLIENT_API}/api/projects/${projectId}/name`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Falha ao renomear projeto");
  return res.json();
}

export async function fetchAnalysis(projectId: string) {
  const headers = await ssrAuthHeader();
  const res = await fetch(`${API_URL}/api/document/analysis/${projectId}`, { cache: "no-store", headers });
  if (!res.ok) return null;
  return res.json();
}

export async function startAnalysis(projectId: string): Promise<string> {
  const res = await fetch(`${CLIENT_API}/api/document/analyze/${projectId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Falha ao iniciar análise");
  const { jobId } = await res.json();
  return jobId;
}

export async function startDocGroup(
  projectId: string,
  groupId: string,
  fileNames: string[],
  groupName: string,
  groupType: string,
  groupDescription: string
): Promise<string> {
  const res = await fetch(`${CLIENT_API}/api/document/group`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ projectId, groupId, fileNames, groupName, groupType, groupDescription }),
  });
  if (!res.ok) {
    let msg = "Falha ao iniciar documentação do grupo";
    try { const e = await res.json(); msg = e.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const { jobId } = await res.json();
  return jobId;
}

export async function saveCompanySettings(data: unknown) {
  const res = await fetch(`${CLIENT_API}/api/settings`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha ao salvar configurações");
  }
  return res.json();
}
