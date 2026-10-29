"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFiles } from "@/lib/api";

// ── Palavras-chave que enviam arquivos para a Lixeira ──────────────────────
const DEFAULT_KEYWORDS = ["BKP", "OLD", "BAK", "BACK", "TEMP", "TMP", "_ZZ", "_XX", "LIXO", "OBSOLETO"];

function matchesKeyword(filename: string, keywords: string[]): string | null {
  const upper = filename.toUpperCase();
  for (const kw of keywords) {
    if (kw.trim() && upper.includes(kw.trim().toUpperCase())) return kw.trim();
  }
  return null;
}

// ── Árvore de arquivos ─────────────────────────────────────────────────────
type TreeNode =
  | { type: "dir"; name: string; path: string; children: TreeNode[] }
  | { type: "file"; name: string; file: File };

function buildTree(files: File[]): TreeNode[] {
  const root: Record<string, any> = {};
  for (const f of files) {
    const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    const parts = wp ? wp.split("/").slice(1) : [f.name];
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
function isAllowedExt(name: string) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return ALLOWED.has(ext) || /^\.i\d+$/.test(ext);
}

function getFileKey(f: File) {
  const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
  return wp && wp.includes("/") ? wp.split("/").slice(1).join("/") : f.name;
}

function getBaseName(f: File) {
  const key = getFileKey(f);
  return key.split("/").pop() ?? f.name;
}

// ── Componente árvore ──────────────────────────────────────────────────────
function TreeView({ nodes, expanded, toggle }: {
  nodes: TreeNode[];
  expanded: Set<string>;
  toggle: (p: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) =>
        node.type === "dir" ? (
          <li key={node.path}>
            <button onClick={() => toggle(node.path)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition py-0.5 w-full text-left">
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

// ── Página principal ───────────────────────────────────────────────────────
export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);           // aceitos
  const [trash, setTrash] = useState<{ file: File; reason: string }[]>([]); // lixeira
  const [projectName, setProjectName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [trashOpen, setTrashOpen] = useState(true);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKw, setNewKw] = useState("");
  const [showKwEditor, setShowKwEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function classify(incoming: File[], currentFiles: File[], currentTrash: { file: File; reason: string }[]) {
    const existingKeys = new Set([...currentFiles, ...currentTrash.map((t) => t.file)].map(getFileKey));
    const toAdd: File[] = [];
    const toTrash: { file: File; reason: string }[] = [];

    for (const f of incoming) {
      if (!isAllowedExt(f.name)) continue;
      if (existingKeys.has(getFileKey(f))) continue;
      existingKeys.add(getFileKey(f));
      const hit = matchesKeyword(getBaseName(f), keywords);
      if (hit) toTrash.push({ file: f, reason: hit });
      else toAdd.push(f);
    }
    return { toAdd, toTrash };
  }

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      setTrash((prevTrash) => {
        const { toAdd, toTrash } = classify(arr, prev, prevTrash);
        if (toTrash.length > 0) setTrashOpen(true);
        setTimeout(() => setTrash((t) => [...t, ...toTrash]), 0);
        return prevTrash;
      });
      const { toAdd } = classify(arr, prev, []);
      return [...prev, ...toAdd];
    });
  }

  // Versão síncrona correta (React setState batching pode causar stale)
  function processIncoming(incoming: FileList | File[]) {
    const arr = Array.from(incoming).filter((f) => isAllowedExt(f.name));
    setFiles((prevFiles) => {
      setTrash((prevTrash) => {
        const existingKeys = new Set([...prevFiles, ...prevTrash.map((t) => t.file)].map(getFileKey));
        const newFiles: File[] = [];
        const newTrash: { file: File; reason: string }[] = [];
        for (const f of arr) {
          if (existingKeys.has(getFileKey(f))) continue;
          existingKeys.add(getFileKey(f));
          const hit = matchesKeyword(getBaseName(f), keywords);
          if (hit) newTrash.push({ file: f, reason: hit });
          else newFiles.push(f);
        }
        if (newTrash.length > 0) setTrashOpen(true);
        return [...prevTrash, ...newTrash];
      });
      // files updated outside of trash setter; compute again
      const existingKeys = new Set(prevFiles.map(getFileKey));
      const toAdd = arr.filter((f) => {
        if (existingKeys.has(getFileKey(f))) return false;
        return !matchesKeyword(getBaseName(f), keywords);
      });
      return [...prevFiles, ...toAdd];
    });
  }

  // Restaura um arquivo da lixeira para a lista de aceitos
  function restore(key: string) {
    setTrash((prev) => {
      const item = prev.find((t) => getFileKey(t.file) === key);
      if (item) setFiles((f) => [...f, item.file]);
      return prev.filter((t) => getFileKey(t.file) !== key);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) processIncoming(e.dataTransfer.files);
  }

  function toggle(p: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }

  function addKeyword() {
    const kw = newKw.trim().toUpperCase();
    if (kw && !keywords.includes(kw)) setKeywords((k) => [...k, kw]);
    setNewKw("");
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setBatchProgress(null);
    setError(null);
    try {
      const result = await uploadFiles(files, projectName.trim() || undefined, (done, total) => {
        setBatchProgress({ done, total });
      });
      router.push(`/projects/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      setBatchProgress(null);
    }
  }

  const hasTree = files.some((f) => {
    const wp = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    return wp.split("/").length > 2;
  });
  const tree = buildTree(files);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Upload de Arquivos</h1>
      <p className="text-gray-600 mb-8">
        Envie arquivos soltos ou uma pasta com subdiretórios de programas Progress 4GL.
      </p>

      {/* Nome do projeto */}
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

      {/* Filtro de palavras-chave */}
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <button
          onClick={() => setShowKwEditor((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm font-medium text-amber-800">Filtro de Lixeira</span>
            <span className="text-xs text-amber-600">— arquivos com estas palavras serão separados</span>
          </div>
          <svg className={`w-4 h-4 text-amber-500 transition-transform ${showKwEditor ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {keywords.map((kw) => (
            <span key={kw} className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-mono font-medium">
              {kw}
              <button
                onClick={() => setKeywords((k) => k.filter((x) => x !== kw))}
                className="text-amber-400 hover:text-amber-700 transition"
                title="Remover"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {showKwEditor && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="Nova palavra-chave..."
              className="flex-1 border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={addKeyword}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
            >
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Área de drop */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" multiple
          accept=".p,.w,.i,.i1,.i2,.i3,.i4,.i5,.i6,.i7,.i8,.i9,.cls,.t"
          className="hidden"
          onChange={(e) => { if (e.target.files) processIncoming(e.target.files); e.target.value = ""; }}
        />
        <input ref={folderInputRef} type="file"
          // @ts-expect-error webkitdirectory
          webkitdirectory="true" mozdirectory="true" multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) processIncoming(e.target.files); e.target.value = ""; }}
        />

        <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 mb-4">Arraste arquivos aqui ou selecione:</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Arquivos
          </button>
          <button type="button" onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Selecionar Pasta
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Extensões aceitas: .p, .w, .i, .i1~.iN, .cls, .t</p>
      </div>

      {/* Arquivos aceitos */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm text-gray-800 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {files.length} arquivo{files.length !== 1 ? "s" : ""} para enviar
            </h3>
            <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 transition">
              Limpar tudo
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 max-h-64 overflow-y-auto">
            {hasTree ? (
              <TreeView nodes={tree} expanded={expanded} toggle={toggle} />
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li key={getFileKey(file)} className="flex items-center justify-between text-sm">
                    <span className="font-mono truncate mr-4">{getFileKey(file)}</span>
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
            {uploading
              ? batchProgress && batchProgress.total > 1
                ? `Enviando lote ${batchProgress.done} de ${batchProgress.total}...`
                : "Enviando..."
              : `Enviar ${files.length} arquivo${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Lixeira */}
      {trash.length > 0 && (
        <div className="mt-5 border border-red-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setTrashOpen((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3 bg-red-50 hover:bg-red-100 transition text-left"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm font-semibold text-red-700">Lixeira</span>
              <span className="text-xs text-red-500">— {trash.length} arquivo{trash.length !== 1 ? "s" : ""} filtrado{trash.length !== 1 ? "s" : ""}</span>
            </div>
            <svg className={`w-4 h-4 text-red-400 transition-transform ${trashOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {trashOpen && (
            <ul className="divide-y divide-red-100 max-h-56 overflow-y-auto">
              {trash.map(({ file, reason }) => (
                <li key={getFileKey(file)} className="flex items-center justify-between px-4 py-2 bg-white">
                  <div className="min-w-0">
                    <span className="font-mono text-sm text-gray-700 block truncate">{getFileKey(file)}</span>
                    <span className="text-xs text-red-500">contém &quot;{reason}&quot;</span>
                  </div>
                  <button
                    onClick={() => restore(getFileKey(file))}
                    className="ml-3 shrink-0 text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition"
                    title="Restaurar para a lista de envio"
                  >
                    Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
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
