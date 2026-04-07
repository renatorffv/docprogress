"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFiles } from "@/lib/api";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFiles(selectedFiles);
      router.push(`/projects/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setSelectedFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Upload de Arquivos</h1>
      <p className="text-gray-600 mb-8">
        Envie arquivos Progress 4GL (.p, .w, .i, .cls) para documentacao.
      </p>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".p,.w,.i,.cls,.t"
          className="hidden"
          onChange={(e) => setSelectedFiles(e.target.files)}
        />
        <div className="text-gray-500">
          <p className="text-lg font-medium mb-1">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-sm">Extensoes aceitas: .p, .w, .i, .cls, .t</p>
        </div>
      </div>

      {selectedFiles && selectedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-3">
            {selectedFiles.length} arquivo(s) selecionado(s):
          </h3>
          <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {Array.from(selectedFiles).map((file, i) => (
              <li
                key={i}
                className="px-4 py-2 flex justify-between text-sm"
              >
                <span className="font-mono">{file.name}</span>
                <span className="text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Enviando..." : "Enviar e Documentar"}
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
