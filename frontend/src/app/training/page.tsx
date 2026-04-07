import { fetchTraining, fetchTrainingPreview } from "@/lib/api";
import TrainingEditor from "./TrainingEditor";

export default async function TrainingPage() {
  let training = null;
  let preview = "";
  let error: string | null = null;

  try {
    [training, { prompt: preview }] = await Promise.all([
      fetchTraining(),
      fetchTrainingPreview(),
    ]);
  } catch {
    error = "Erro ao carregar configuracao de treinamento. Verifique se o backend esta rodando.";
  }

  if (error || !training) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Erro ao carregar treinamento"}
        </div>
      </div>
    );
  }

  return <TrainingEditor initialTraining={training} initialPreview={preview} />;
}
