const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

export async function fetchProjects() {
  const res = await fetch(`${API_URL}/api/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar projetos");
  return res.json();
}

export async function fetchProject(id: string) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Projeto não encontrado");
  return res.json();
}

export async function fetchProjectFiles(id: string) {
  const res = await fetch(`${API_URL}/api/projects/${id}/files`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Falha ao buscar arquivos");
  return res.json();
}

export async function fetchDocumentation(projectId: string) {
  const res = await fetch(`${API_URL}/api/document/${projectId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Falha ao buscar documentação");
  return res.json();
}

export async function fetchTraining() {
  const res = await fetch(`${API_URL}/api/training`, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar treinamento");
  return res.json();
}

export async function fetchTrainingPreview() {
  const res = await fetch(`${API_URL}/api/training/preview`, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar preview");
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_URL}/api/settings`, { cache: "no-store" });
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

export async function uploadFiles(files: File[] | FileList, name?: string) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  if (name) formData.append("name", name);
  const res = await fetch(`${CLIENT_API}/api/upload`, {
    method: "POST",
    body: formData,
    headers: authHeaders(),
  });
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
  return res.json();
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
  const res = await fetch(`${API_URL}/api/document/analysis/${projectId}`, { cache: "no-store" });
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
