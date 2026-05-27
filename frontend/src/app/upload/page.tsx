"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFiles } from "@/lib/api";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function mergeFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const novos = arr.filter((f) => !existingNames.has(f.name));
      return [...prev, ...novos];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) mergeFiles(e.dataTransfer.files);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Upload de Arquivos</h1>
      <p className="text-gray-600 mb-8">
        Envie arquivos Progress 4GL (.p, .w, .i, .cls) para documentacao.
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

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition cursor-pointer ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".p,.w,.i,.i1,.i2,.i3,.i4,.i5,.i6,.i7,.i8,.i9,.cls,.t,.r"
          className="hidden"
          onChange={(e) => { if (e.target.files) mergeFiles(e.target.files); e.target.value = ""; }}
        />
        <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-base font-medium text-gray-600 mb-1">
          {files.length > 0 ? "Arraste mais arquivos ou clique para adicionar" : "Arraste arquivos aqui ou clique para selecionar"}
        </p>
        <p className="text-sm text-gray-400">Extensoes aceitas: .p, .w, .i, .i1~.iN, .cls, .t, .r</p>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {files.length} arquivo(s) selecionado(s)
            </h3>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-500 hover:text-red-700 transition"
            >
              Remover todos
            </button>
          </div>

          <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {files.map((file) => (
              <li key={file.name} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="font-mono truncate mr-4">{file.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="text-gray-300 hover:text-red-500 transition"
                    title="Remover arquivo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Enviando..." : `Enviar e Documentar (${files.length} arquivo${files.length !== 1 ? "s" : ""})`}
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
