"use client";

import { useState } from "react";
import Link from "next/link";
import { renameProject } from "@/lib/api";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-3">
      {projects.map((project) => (
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
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
