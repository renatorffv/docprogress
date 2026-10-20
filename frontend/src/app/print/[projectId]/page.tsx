import { fetchDocumentation, fetchSettings, fetchProject } from "@/lib/api";
import PrintContent from "./PrintContent";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ doc?: string }>;
}

export default async function PrintPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { doc } = await searchParams;

  if (!doc) {
    return (
      <div className="p-8 text-gray-500 text-sm">
        Nenhum documento selecionado. Use o parâmetro <code>?doc=arquivo.md</code>.
      </div>
    );
  }

  let docContent: string | null = null;
  let settings = { companyName: "", logoBase64: null as string | null };

  try {
    const [{ docs }, fetchedSettings, project] = await Promise.all([
      fetchDocumentation(projectId),
      fetchSettings(),
      fetchProject(projectId),
    ]);
    const found = (docs as { fileName: string; content: string }[]).find(
      (d) => d.fileName === doc
    );
    if (found) docContent = found.content;
    settings = fetchedSettings;
    // Logo do projeto tem prioridade sobre o logo global
    if (project?.logoBase64) settings = { ...settings, logoBase64: project.logoBase64 };
  } catch {
    return (
      <div className="p-8 text-red-600 text-sm">
        Erro ao carregar documento. Verifique se o backend está rodando.
      </div>
    );
  }

  if (!docContent) {
    return (
      <div className="p-8 text-gray-500 text-sm">
        Documento <code>{doc}</code> não encontrado.
      </div>
    );
  }

  return (
    <PrintContent
      docName={doc}
      content={docContent}
      settings={settings}
    />
  );
}
