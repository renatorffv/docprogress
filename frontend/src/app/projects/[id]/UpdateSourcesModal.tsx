"use client";

import { useRef, useState } from "react";
import { updateProjectFiles } from "@/lib/api";

interface Result {
  added: string[];
  changed: string[];
  affectedGroups: string[];
}

interface Props {
  projectId: string;
  onClose: () => void;
  onDone: (result: Result) => void;
}

export default function UpdateSourcesModal({ projectId, onClose, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function processFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await updateProjectFiles(projectId, files);
      setResult(res);
      onDone(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar fontes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Atualizar Fontes</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Envie arquivos novos ou alterados. O sistema detecta as mudanças automaticamente.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  processFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".p,.w,.i,.cls,.t,.r"
                  className="hidden"
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                />
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm text-gray-600">Analisando arquivos...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">Arraste os arquivos ou clique para selecionar</p>
                    <p className="text-xs text-gray-400 mt-1">.p .w .i .cls .t .r</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Resultado */
            <div className="space-y-4">
              {result.changed.length === 0 && result.added.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Nenhuma alteração detectada</p>
                  <p className="text-xs text-gray-400 mt-1">Os arquivos enviados são idênticos aos já armazenados.</p>
                </div>
              ) : (
                <>
                  {result.added.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                        {result.added.length} arquivo{result.added.length !== 1 ? "s" : ""} novo{result.added.length !== 1 ? "s" : ""}
                      </p>
                      <ul className="space-y-1">
                        {result.added.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-1.5 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span className="font-mono">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.changed.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">
                        {result.changed.length} arquivo{result.changed.length !== 1 ? "s" : ""} alterado{result.changed.length !== 1 ? "s" : ""}
                      </p>
                      <ul className="space-y-1">
                        {result.changed.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-gray-700 bg-yellow-50 px-3 py-1.5 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                            <span className="font-mono">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.affectedGroups.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        Programas marcados para re-documentação:
                      </p>
                      <p className="text-sm text-blue-800">{result.affectedGroups.length} grupo{result.affectedGroups.length !== 1 ? "s" : ""} afetado{result.affectedGroups.length !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-blue-600 mt-1">Acesse a aba Programas para re-documentar apenas o necessário.</p>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
