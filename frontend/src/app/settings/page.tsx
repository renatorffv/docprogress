import { fetchSettings } from "@/lib/api";
import SettingsEditor from "./SettingsEditor";

export default async function SettingsPage() {
  let settings = { companyName: "", logoBase64: null as string | null };
  try {
    settings = await fetchSettings();
  } catch {
    // backend offline — editor inicia com valores padrão
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Configurações</h1>
      <p className="text-gray-500 text-sm mb-10">
        Personalize a identidade visual dos documentos exportados em PDF.
      </p>
      <SettingsEditor initialSettings={settings} />
    </div>
  );
}
