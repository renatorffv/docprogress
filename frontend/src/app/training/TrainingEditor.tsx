"use client";

import { useState } from "react";
import {
  saveTraining,
  resetTraining,
  fetchTrainingPreviewClient,
} from "@/lib/api";

interface Secao {
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface Training {
  role: string;
  objetivo: string;
  idioma: string;
  formatoSaida: string;
  secoes: Secao[];
  regras: string[];
  exemploFormato: string;
}

interface Props {
  initialTraining: Training;
  initialPreview: string;
}

export default function TrainingEditor({
  initialTraining,
  initialPreview,
}: Props) {
  const [training, setTraining] = useState<Training>(initialTraining);
  const [preview, setPreview] = useState(initialPreview);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "geral" | "secoes" | "regras" | "exemplo" | "preview"
  >("geral");
  const [newRegra, setNewRegra] = useState("");

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveTraining(training);
      const { prompt } = await fetchTrainingPreviewClient();
      setPreview(prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Restaurar todas as configuracoes para o padrao?")) return;
    setSaving(true);
    setError(null);
    try {
      const data = await resetTraining();
      setTraining(data);
      const { prompt } = await fetchTrainingPreviewClient();
      setPreview(prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao resetar");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof Training, value: string) {
    setTraining((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSecao(index: number) {
    setTraining((prev) => {
      const secoes = [...prev.secoes];
      secoes[index] = { ...secoes[index], ativo: !secoes[index].ativo };
      return { ...prev, secoes };
    });
  }

  function updateSecaoDescricao(index: number, descricao: string) {
    setTraining((prev) => {
      const secoes = [...prev.secoes];
      secoes[index] = { ...secoes[index], descricao };
      return { ...prev, secoes };
    });
  }

  function addRegra() {
    if (!newRegra.trim()) return;
    setTraining((prev) => ({ ...prev, regras: [...prev.regras, newRegra.trim()] }));
    setNewRegra("");
  }

  function removeRegra(index: number) {
    setTraining((prev) => ({
      ...prev,
      regras: prev.regras.filter((_, i) => i !== index),
    }));
  }

  function updateRegra(index: number, value: string) {
    setTraining((prev) => {
      const regras = [...prev.regras];
      regras[index] = value;
      return { ...prev, regras };
    });
  }

  const tabs = [
    { key: "geral" as const, label: "Geral" },
    { key: "secoes" as const, label: `Secoes (${training.secoes.filter((s) => s.ativo).length}/${training.secoes.length})` },
    { key: "regras" as const, label: `Regras (${training.regras.length})` },
    { key: "exemplo" as const, label: "Exemplo de Formato" },
    { key: "preview" as const, label: "Preview do Prompt" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Treinamento do Agente</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure como a IA deve analisar e documentar seus programas Progress 4GL
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Restaurar Padrao
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Alteracoes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Configuracoes salvas com sucesso!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Geral */}
      {activeTab === "geral" && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Papel do Agente</label>
            <textarea
              value={training.role}
              onChange={(e) => updateField("role", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Define quem o agente e e sua especialidade
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Objetivo</label>
            <textarea
              value={training.objetivo}
              onChange={(e) => updateField("objetivo", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Idioma</label>
              <input
                type="text"
                value={training.idioma}
                onChange={(e) => updateField("idioma", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Formato de Saida</label>
              <input
                type="text"
                value={training.formatoSaida}
                onChange={(e) => updateField("formatoSaida", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Secoes */}
      {activeTab === "secoes" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Ative ou desative as secoes que o agente deve gerar na documentacao. Edite a descricao para refinar o comportamento.
          </p>
          {training.secoes.map((secao, i) => (
            <div
              key={i}
              className={`border rounded-lg p-4 transition ${
                secao.ativo
                  ? "border-blue-200 bg-white"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => toggleSecao(i)}
                  className={`w-10 h-6 rounded-full transition relative ${
                    secao.ativo ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      secao.ativo ? "left-4.5" : "left-0.5"
                    }`}
                  />
                </button>
                <span className="font-medium text-sm">{secao.nome}</span>
              </div>
              <textarea
                value={secao.descricao}
                onChange={(e) => updateSecaoDescricao(i, e.target.value)}
                rows={2}
                disabled={!secao.ativo}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Tab: Regras */}
      {activeTab === "regras" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Regras e diretrizes especificas que o agente deve seguir ao analisar o codigo.
          </p>
          <div className="space-y-2 mb-4">
            {training.regras.map((regra, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={regra}
                  onChange={(e) => updateRegra(i, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => removeRegra(i)}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRegra}
              onChange={(e) => setNewRegra(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRegra()}
              placeholder="Nova regra..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={addRegra}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Tab: Exemplo */}
      {activeTab === "exemplo" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Exemplo de formato que o agente deve seguir ao gerar a documentacao. Isto serve como few-shot learning.
          </p>
          <textarea
            value={training.exemploFormato}
            onChange={(e) => updateField("exemploFormato", e.target.value)}
            rows={20}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Tab: Preview */}
      {activeTab === "preview" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Preview do prompt final que sera enviado para a IA. Salve as alteracoes para atualizar.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm leading-relaxed overflow-x-auto max-h-[70vh] overflow-y-auto whitespace-pre-wrap">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}
