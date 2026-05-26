"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateDocFile, generateDocProject, renameProject } from "@/lib/api";

interface ProjectDetailProps {
  projectId: string;
  project: {
    id: string;
    name?: string | null;
    createdAt: string;
    files: { name: string; size: number }[];
  };
  files: { name: string; content: string; lines: number }[];
  initialDocs: { fileName: string; content: string }[];
}

export default function ProjectDetail({
  projectId,
  project,
  files,
  initialDocs,
}: ProjectDetailProps) {
  const [docs, setDocs] = useState(initialDocs);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(
    initialDocs.length > 0 ? initialDocs[0].fileName : null
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"files" | "docs">("files");
  const [projectName, setProjectName] = useState(project.name || "");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  async function handleSaveName() {
    setSavingName(true);
    try {
      await renameProject(projectId, projectName);
      setEditingName(false);
    } catch {
      // silently ignore — nome já está no estado local
    } finally {
      setSavingName(false);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") { setProjectName(project.name || ""); setEditingName(false); }
  }

  async function handleDocumentFile(fileName: string) {
    setLoading(fileName);
    setError(null);
    try {
      const result = await generateDocFile(projectId, fileName);
      setDocs((prev) => {
        const existing = prev.findIndex((d) => d.fileName === result.fileName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            fileName: result.fileName,
            content: result.documentation,
          };
          return updated;
        }
        return [
          ...prev,
          { fileName: result.fileName, content: result.documentation },
        ];
      });
      setSelectedDoc(result.fileName);
      setTab("docs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao documentar");
    } finally {
      setLoading(null);
    }
  }

  async function handleDocumentProject() {
    setLoading("__project__");
    setError(null);
    try {
      const result = await generateDocProject(projectId);
      setDocs((prev) => {
        const existing = prev.findIndex((d) => d.fileName === result.fileName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            fileName: result.fileName,
            content: result.documentation,
          };
          return updated;
        }
        return [
          ...prev,
          { fileName: result.fileName, content: result.documentation },
        ];
      });
      setSelectedDoc(result.fileName);
      setTab("docs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao documentar");
    } finally {
      setLoading(null);
    }
  }

  const activeFile = files.find((f) => f.name === selectedFile);
  const activeDoc = docs.find((d) => d.fileName === selectedDoc);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                autoFocus
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                placeholder="Nome do projeto"
                className="border border-blue-400 rounded px-2 py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                title="Salvar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => { setProjectName(project.name || ""); setEditingName(false); }}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition"
                title="Cancelar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">
                {projectName || "Projeto sem nome"}
              </h1>
              <button
                onClick={() => setEditingName(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
                title="Renomear projeto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
          <p className="text-sm text-gray-500 font-mono">{project.id}</p>
          <p className="text-sm text-gray-400">
            Criado em{" "}
            {new Date(project.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleDocumentProject}
            disabled={loading !== null}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
          >
            {loading === "__project__"
              ? "Documentando projeto..."
              : "Documentar Projeto Inteiro"}
          </button>
          {loading === "__project__" && (
            <p className="text-xs text-gray-400">
              Projetos grandes podem levar alguns minutos devido ao limite de tokens da API.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab("files")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === "files"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Arquivos ({files.length})
        </button>
        <button
          onClick={() => setTab("docs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === "docs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Documentacao ({docs.length})
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="col-span-1">
          {tab === "files" ? (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.name}>
                  <button
                    onClick={() => setSelectedFile(file.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedFile === file.name
                        ? "bg-blue-100 text-blue-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <span className="font-mono block">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      {file.lines} linhas
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-1">
              {docs.length === 0 ? (
                <p className="text-sm text-gray-500 px-3">
                  Nenhuma documentacao gerada ainda.
                </p>
              ) : (
                docs.map((doc) => (
                  <li key={doc.fileName}>
                    <button
                      onClick={() => setSelectedDoc(doc.fileName)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedDoc === doc.fileName
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span className="font-mono">{doc.fileName}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Content */}
        <div className="col-span-3">
          {tab === "files" ? (
            activeFile ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-mono font-medium">{activeFile.name}</h3>
                  <button
                    onClick={() => handleDocumentFile(activeFile.name)}
                    disabled={loading !== null}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {loading === activeFile.name
                      ? "Documentando..."
                      : "Documentar este arquivo"}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed max-h-[70vh] overflow-y-auto">
                  <code>{activeFile.content}</code>
                </pre>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                Selecione um arquivo para visualizar
              </div>
            )
          ) : activeDoc ? (
            <div>
              <div className="flex justify-end mb-2">
                <a
                  href={`/print/${projectId}?doc=${encodeURIComponent(activeDoc.fileName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Exportar PDF
                </a>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 prose prose-sm max-w-none max-h-[70vh] overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeDoc.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              {docs.length === 0
                ? 'Clique em "Documentar" para gerar a documentacao'
                : "Selecione uma documentacao para visualizar"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
