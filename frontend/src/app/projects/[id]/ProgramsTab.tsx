"use client";

import { useState } from "react";
import { startAnalysis, startDocGroup, pollDocProject } from "@/lib/api";

interface Group {
  id: string;
  name: string;
  type: "relatorio" | "tela" | "procedure" | "util" | "outro";
  mainFile: string;
  files: string[];
  description: string;
}

interface Analysis {
  analyzedAt: string;
  groups: Group[];
}

interface Props {
  projectId: string;
  initialAnalysis: Analysis | null;
  existingDocs: { fileName: string }[];
  onDocCreated: (fileName: string, content: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  relatorio: "Relatório",
  tela: "Tela",
  procedure: "Procedure",
  util: "Utilitário",
  outro: "Programa",
};

const TYPE_COLOR: Record<string, string> = {
  relatorio: "bg-blue-100 text-blue-700",
  tela: "bg-purple-100 text-purple-700",
  procedure: "bg-orange-100 text-orange-700",
  util: "bg-teal-100 text-teal-700",
  outro: "bg-gray-100 text-gray-600",
};

const TYPE_ICON: Record<string, string> = {
  relatorio: "📊",
  tela: "🖥️",
  procedure: "⚙️",
  util: "🔧",
  outro: "📄",
};

export default function ProgramsTab({ projectId, initialAnalysis, existingDocs, onDocCreated }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(initialAnalysis);
  const [analysisJob, setAnalysisJob] = useState<{ percent: number; message: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [groupJobs, setGroupJobs] = useState<Record<string, { percent: number; message: string } | null>>({});
  const [groupErrors, setGroupErrors] = useState<Record<string, string | null>>({});

  function docFileForGroup(groupId: string) {
    return existingDocs.find((d) => d.fileName === `_grp_${groupId}.md`);
  }

  async function handleAnalyze() {
    setAnalysisError(null);
    setAnalysisJob({ percent: 0, message: "Iniciando análise..." });
    try {
      const jobId = await startAnalysis(projectId);
      await pollUntilDone(jobId, (prog) => setAnalysisJob(prog), async (result) => {
        setAnalysis(result.analysis as Analysis);
        setAnalysisJob(null);
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Erro na análise");
      setAnalysisJob(null);
    }
  }

  async function handleDocumentGroup(group: Group) {
    setGroupErrors((p) => ({ ...p, [group.id]: null }));
    setGroupJobs((p) => ({ ...p, [group.id]: { percent: 0, message: "Iniciando..." } }));
    try {
      const jobId = await startDocGroup(
        projectId, group.id, group.files,
        group.name, group.type, group.description
      );
      await pollUntilDone(jobId,
        (prog) => setGroupJobs((p) => ({ ...p, [group.id]: prog })),
        async (result) => {
          setGroupJobs((p) => ({ ...p, [group.id]: null }));
          onDocCreated(result.fileName as string, result.documentation as string);
        }
      );
    } catch (err) {
      setGroupErrors((p) => ({ ...p, [group.id]: err instanceof Error ? err.message : "Erro" }));
      setGroupJobs((p) => ({ ...p, [group.id]: null }));
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {analysis ? (
            <p className="text-sm text-gray-500">
              {analysis.groups.length} programa(s) identificado(s) •{" "}
              {new Date(analysis.analyzedAt).toLocaleDateString("pt-BR")}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Analise os arquivos para identificar os programas e gerar documentações individuais.
            </p>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analysisJob !== null}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {analysisJob ? "Analisando..." : analysis ? "Re-analisar" : "Analisar Programas"}
        </button>
      </div>

      {/* Progress da análise */}
      {analysisJob && (
        <div className="mb-5 bg-white border border-indigo-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium text-gray-700">Identificando programas...</span>
            <span className="text-sm font-bold text-indigo-600">{analysisJob.percent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${analysisJob.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{analysisJob.message}</p>
        </div>
      )}

      {analysisError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {analysisError}
        </div>
      )}

      {/* Lista de grupos */}
      {!analysis && !analysisJob && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium text-gray-600 mb-1">Nenhuma análise realizada</p>
          <p className="text-sm">Clique em "Analisar Programas" para identificar os conjuntos de arquivos.</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {analysis.groups.map((group) => {
            const job = groupJobs[group.id];
            const err = groupErrors[group.id];
            const documented = docFileForGroup(group.id);

            return (
              <div key={group.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{TYPE_ICON[group.type] ?? "📄"}</span>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[group.type] ?? TYPE_COLOR.outro}`}>
                        {TYPE_LABEL[group.type] ?? "Programa"}
                      </span>
                      {documented && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          ✓ Documentado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{group.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.files.map((f) => (
                        <span key={f} className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
                    <button
                      onClick={() => handleDocumentGroup(group)}
                      disabled={job !== null}
                      className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition text-center"
                    >
                      {job ? "Documentando..." : documented ? "Re-documentar" : "Documentar"}
                    </button>
                    {documented && (
                      <a
                        href={`#doc-${group.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onDocCreated(documented.fileName, "");
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition text-center"
                      >
                        Ver documentação
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress por grupo */}
                {job && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">{job.message}</span>
                      <span className="text-xs font-bold text-blue-600">{job.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${job.percent}%` }}
                      />
                    </div>
                  </div>
                )}
                {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Utilitário de polling compartilhado
async function pollUntilDone(
  jobId: string,
  onProgress: (p: { percent: number; message: string }) => void,
  onDone: (result: Record<string, unknown>) => Promise<void>
) {
  const { pollDocProject } = await import("@/lib/api");
  while (true) {
    await new Promise((r) => setTimeout(r, 3000));
    const job = await pollDocProject(jobId);
    if (job.percent !== undefined || job.message) {
      onProgress({ percent: job.percent ?? 0, message: job.message ?? "" });
    }
    if (job.status === "done") { await onDone(job as Record<string, unknown>); return; }
    if (job.status === "error") throw new Error(job.error || "Erro no job");
  }
}
