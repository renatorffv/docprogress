import Link from "next/link";
import { fetchProjects } from "@/lib/api";
import ProjectsList from "./ProjectsList";

interface Project {
  id: string;
  name?: string | null;
  createdAt: string;
  files: { name: string; size: number }[];
  documented: boolean;
  docsCount: number;
}

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    const data = await fetchProjects();
    projects = data.projects;
  } catch {
    error = "Nao foi possivel conectar ao backend. Verifique se o servidor esta rodando.";
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Link
          href="/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Novo Upload
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm mb-6">
          {error}
        </div>
      )}

      {projects.length === 0 && !error ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">Nenhum projeto encontrado</p>
          <p className="text-sm">
            Faca upload de arquivos Progress 4GL para comecar.
          </p>
        </div>
      ) : (
        <ProjectsList initialProjects={projects} />
      )}
    </div>
  );
}
