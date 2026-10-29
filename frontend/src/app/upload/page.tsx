"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFiles } from "@/lib/api";

// Constrói árvore de arquivos a partir de File[] com webkitRelativePath
type TreeNode =
  | { type: "dir"; name: string; path: string; children: TreeNode[] }
  | { type: "file"; name: string; file: File };

function buildTree(files: File[]): TreeNode[] {
  const root: Record<string, any> = {};
  for (const f of files) {
    const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    const parts = wp ? wp.split("/").slice(1) : [f.name]; // strip root folder
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = { __dir: true, __children: {} };
      cur = cur[parts[i]].__children;
    }
    cur[parts[parts.length - 1]] = { __file: f };
  }

  function toNodes(obj: Record<string, any>, prefix = ""): TreeNode[] {
    return Object.entries(obj)
      .map(([key, val]) => {
        if (val.__dir) {
          const p = prefix ? `${prefix}/${key}` : key;
          return { type: "dir" as const, name: key, path: p, children: toNodes(val.__children, p) };
        }
        return { type: "file" as const, name: key, file: val.__file as File };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }
  return toNodes(root);
}

function countFiles(nodes: TreeNode[]): number {
  return nodes.reduce((n, node) => n + (node.type === "file" ? 1 : countFiles(node.children)), 0);
}

const ALLOWED = new Set([".p", ".py", ".w", ".i", ".cls", ".t"]);
function isAllowed(name: string) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return ALLOWED.has(ext) || /^\.i\d+$/.test(ext);
}

function TreeView({
  nodes,
  expanded,
  toggle,
}: {
  nodes: TreeNode[];
  expanded: Set<string>;
  toggle: (path: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) =>
        node.type === "dir" ? (
          <li key={node.path}>
            <button
              onClick={() => toggle(node.path)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition py-0.5 w-full text-left"
            >
              <svg className={`w-3.5 h-3.5 shrink-0 transition-transform text-gray-400 ${expanded.has(node.path) ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 5l6 5-6 5V5z" />
              </svg>
              <svg className="w-4 h-4 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span>{node.name}</span>
              <span className="text-xs text-gray-400 font-normal">({countFiles(node.children)})</span>
            </button>
            {expanded.has(node.path) && (
              <div className="pl-5 border-l border-gray-100 ml-2">
                <TreeView nodes={node.children} expanded={expanded} toggle={toggle} />
              </div>
            )}
          </li>
        ) : (
          <li key={node.name} className="flex items-center gap-1.5 text-sm text-gray-600 py-0.5 pl-1">
            <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-mono">{node.name}</span>
          </li>
        )
      )}
    </ul>
  );
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming).filter((f) => isAllowed(f.name));
    setFiles((prev) => {
      const existingKeys = new Set(prev.map(getFileKey));
      const novos = arr.filter((f) => !existingKeys.has(getFileKey(f)));
      return [...prev, ...novos];
    });
  }

  function getFileKey(f: File) {
    const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
    return wp && wp.includes("/") ? wp.split("/").slice(1).join("/") : f.name;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function toggle(p: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFiles(files, projectName.trim() || undefined);
      router.push(`/projects/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  const hasTree = files.some((f) => {
    const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    return wp.split("/").length > 2; // raiz + dir + arquivo
  });
  const tree = buildTree(files);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Upload de Arquivos</h1>
      <p className="text-gray-600 mb-8">
        Envie arquivos soltos ou uma pasta com subdiretórios de programas Progress 4GL.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Projeto <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Ex: Sistema de Faturamento"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Área de drop / botões de seleção */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {/* input arquivos individuais */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".p,.w,.i,.i1,.i2,.i3,.i4,.i5,.i6,.i7,.i8,.i9,.cls,.t"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />
        {/* input pasta */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory não é atributo TS padrão
          webkitdirectory="true"
          mozdirectory="true"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />

        <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 mb-4">
          Arraste arquivos aqui ou selecione:
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Arquivos
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Selecionar Pasta
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Extensões aceitas: .p, .w, .i, .i1~.iN, .cls, .t</p>
      </div>

      {/* Preview dos arquivos selecionados */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-gray-800">
              {files.length} arquivo(s) selecionado(s)
            </h3>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-500 hover:text-red-700 transition"
            >
              Limpar tudo
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 max-h-72 overflow-y-auto">
            {hasTree ? (
              <TreeView nodes={tree} expanded={expanded} toggle={toggle} />
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li key={file.name} className="flex items-center justify-between text-sm">
                    <span className="font-mono truncate mr-4">{file.name}</span>
                    <span className="text-gray-400 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Enviando..." : `Enviar ${files.length} arquivo${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
