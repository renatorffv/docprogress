"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  docName: string;
  content: string;
  settings: { companyName: string; logoBase64: string | null; configLogoBase64?: string | null };
  projectName?: string | null;
}

export default function PrintContent({ docName, content, settings, projectName }: Props) {
  const displayName = projectName || settings.companyName;
  const hasHeader = !!(settings.logoBase64 || displayName);
  const title = docName.replace(/\.md$/, "");

  return (
    <>
      {/* Barra de controles — visível apenas na tela */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Exportar:{" "}
          <span className="text-white font-mono text-sm">{docName}</span>
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => window.close()}
            className="px-4 py-1.5 text-sm border border-gray-600 rounded hover:bg-gray-800 transition"
          >
            Fechar
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 rounded font-medium transition"
          >
            Imprimir / Salvar como PDF
          </button>
        </div>
      </div>

      {/* Área de preview na tela (fundo cinza + página branca centralizada) */}
      <div className="print:contents bg-gray-200 min-h-screen py-10 px-4 flex flex-col items-center">
        <div className="print:contents bg-white w-full max-w-[794px] shadow-xl rounded-sm px-16 py-14">
          <DocumentBody
            hasHeader={hasHeader}
            settings={settings}
            displayName={displayName}
            title={title}
            content={content}
          />
        </div>
      </div>
    </>
  );
}

function DocumentBody({
  hasHeader,
  settings,
  displayName,
  title,
  content,
}: {
  hasHeader: boolean;
  settings: { companyName: string; logoBase64: string | null; configLogoBase64?: string | null };
  displayName: string;
  title: string;
  content: string;
}) {
  const hasRightLogo = !!settings.configLogoBase64;
  return (
    <div>
      {/* Cabeçalho com logo e nome do projeto (ou empresa) */}
      {hasHeader && (
        <div className={`flex items-center pb-6 mb-8 border-b-2 border-gray-800 ${hasRightLogo ? "justify-between" : "gap-5"}`}>
          <div className="flex items-center gap-4">
            {settings.logoBase64 && (
              <img
                src={settings.logoBase64}
                alt="Logo"
                className="max-h-16 max-w-[200px] object-contain"
              />
            )}
            {displayName && (
              <span className="text-xl font-bold text-gray-800">
                {displayName}
              </span>
            )}
          </div>
          {hasRightLogo && (
            <img
              src={settings.configLogoBase64!}
              alt="Logo"
              className="max-h-14 max-w-[180px] object-contain"
            />
          )}
        </div>
      )}

      {/* Conteúdo da documentação */}
      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-code:text-sm prose-table:text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>

      {/* Rodapé */}
      <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
        <span>Elaborado por DKP Consultoria e Tecnologia &mdash; dkp-it.com.br</span>
        <span>
          Gerado em{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
