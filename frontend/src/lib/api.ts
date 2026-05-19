const API_URL = process.env.API_URL || "http://localhost:3001";

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

// Client-side functions
const CLIENT_API = "http://localhost:3001";

export async function uploadFiles(files: FileList) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  const res = await fetch(`${CLIENT_API}/api/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha no upload");
  }
  return res.json();
}

export async function generateDocFile(projectId: string, fileName: string) {
  const res = await fetch(`${CLIENT_API}/api/document/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, fileName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha ao gerar documentação");
  }
  return res.json();
}

export async function generateDocProject(projectId: string) {
  const res = await fetch(`${CLIENT_API}/api/document/project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha ao gerar documentação");
  }
  return res.json();
}

export async function saveTraining(data: unknown) {
  const res = await fetch(`${CLIENT_API}/api/training`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
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
  });
  if (!res.ok) throw new Error("Falha ao resetar treinamento");
  return res.json();
}

export async function fetchTrainingPreviewClient() {
  const res = await fetch(`${CLIENT_API}/api/training/preview`);
  if (!res.ok) throw new Error("Falha ao buscar preview");
  return res.json();
}

export async function saveCompanySettings(data: unknown) {
  const res = await fetch(`${CLIENT_API}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Falha ao salvar configurações");
  }
  return res.json();
}
