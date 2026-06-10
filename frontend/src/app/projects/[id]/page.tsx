import { fetchProject, fetchProjectFiles, fetchDocumentation, fetchAnalysis } from "@/lib/api";
import ProjectDetail from "./ProjectDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;

  let project = null;
  let files: { name: string; content: string; lines: number }[] = [];
  let docs: { fileName: string; content: string }[] = [];
  let analysis = null;
  let error: string | null = null;

  try {
    [project, { files }, { docs }, analysis] = await Promise.all([
      fetchProject(id),
      fetchProjectFiles(id),
      fetchDocumentation(id),
      fetchAnalysis(id),
    ]);
  } catch {
    error = "Erro ao carregar projeto. Verifique se o backend esta rodando.";
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Projeto nao encontrado"}
        </div>
      </div>
    );
  }

  return (
    <ProjectDetail
      projectId={id}
      project={project}
      files={files}
      initialDocs={docs}
      initialAnalysis={analysis}
    />
  );
}
