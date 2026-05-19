"use client";

import { useRef, useState } from "react";
import { saveCompanySettings } from "@/lib/api";

interface Settings {
  companyName: string;
  logoBase64: string | null;
}

export default function SettingsEditor({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings((prev) => ({ ...prev, logoBase64: ev.target?.result as string }));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveCompanySettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Identidade Visual do PDF</h2>
        <p className="text-sm text-gray-500 mb-6">
          O logo e o nome da empresa aparecem no cabeçalho de cada documento exportado.
        </p>

        {/* Logo upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo da Empresa
          </label>

          {settings.logoBase64 ? (
            <div className="flex items-start gap-5">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-w-[160px] h-24">
                <img
                  src={settings.logoBase64}
                  alt="Logo"
                  className="max-h-16 max-w-[144px] object-contain"
                />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 text-left"
                >
                  Trocar imagem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettings((prev) => ({ ...prev, logoBase64: null }));
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-sm text-red-600 hover:text-red-700 text-left"
                >
                  Remover logo
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition">
              <svg
                className="w-9 h-9 text-gray-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-600">Clique para selecionar uma imagem</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, SVG — até 5MB</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
          )}

          {settings.logoBase64 && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          )}
        </div>

        {/* Company name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Empresa
          </label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, companyName: e.target.value }))
            }
            placeholder="Ex: Acme Sistemas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </section>

      {/* Preview */}
      {(settings.logoBase64 || settings.companyName) && (
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Pré-visualização do Cabeçalho
          </h2>
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="flex items-center gap-4 pb-5 border-b-2 border-gray-800">
              {settings.logoBase64 && (
                <img
                  src={settings.logoBase64}
                  alt="Logo"
                  className="max-h-14 max-w-[180px] object-contain"
                />
              )}
              {settings.companyName && (
                <span className="text-lg font-bold text-gray-800">
                  {settings.companyName}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Este cabeçalho aparecerá no topo de cada documento PDF exportado.
            </p>
          </div>
        </section>
      )}

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Configurações salvas!
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
