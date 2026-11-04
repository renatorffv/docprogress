"use client";

import { useState } from "react";
import Link from "next/link";
import { renameProject, deleteProject } from "@/lib/api";

interface Project {
  id: string;
  name?: string | null;
  createdAt: string;
  files: { name: string; size: number }[];
  documented: boolean;
  docsCount: number;
}

export default function ProjectsList({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = filter.trim()
    ? projects.filter((p) => {
        const q = filter.trim().toLowerCase();
        return (
          (p.name || "").toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      })
    : projects;

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditValue(project.name || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(projectId: string) {
    setSaving(true);
    try {
      await renameProject(projectId, editValue);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, name: editValue.trim() || null } : p))
      );
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, projectId: string) {
    if (e.key === "Enter") saveEdit(projectId);
    if (e.key === "Escape") cancelEdit();
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteProject(deleteConfirm.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Filtro */}
      <div className="mb-5 relative">
        <svg
          className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nome ou ID..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          {filter ? `Nenhum projeto encontrado para "${filter}"` : "Nenhum projeto"}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between gap-3">
              <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                <div>
                  {editingId !== project.id && (
                    <p className="font-medium text-gray-900 truncate">
                      {project.name || (
                        <span className="font-mono text-sm text-gray-400">
                          {project.id.slice(0, 8)}...
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">
                    {project.files.length} arquivo(s)
                    {project.documented && (
                      <span className="ml-2 text-green-600 font-medium">
                        · {project.docsCount} doc(s)
                      </span>
                    )}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2 shrink-0">
                {editingId === project.id ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, project.id)}
                      placeholder="Nome do projeto"
                      className="border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                    />
                    <button
                      onClick={() => saveEdit(project.id)}
                      disabled={saving}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                      title="Salvar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition"
                      title="Cancelar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-400">
                      {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); startEdit(project); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
                      title="Renomear projeto"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteConfirm(project); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                      title="Deletar projeto"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmação de deleção */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Deletar projeto?</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5">
              <p className="text-sm font-medium text-gray-800 truncate">
                {deleteConfirm.name || (
                  <span className="font-mono text-gray-500">{deleteConfirm.id.slice(0, 8)}...</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {deleteConfirm.files.length} arquivo(s) · todos os dados e documentações serão apagados
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Apagando..." : "Sim, apagar tudo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
