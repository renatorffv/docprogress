"use client";

import { useState } from "react";
import { authHeader, getUser } from "@/lib/auth";

export default function MinhaContaPage() {
  const user = getUser();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPass !== confirm) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPass.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao trocar senha");
      setSuccess(true);
      setCurrent("");
      setNewPass("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              {user.name} — {user.email}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Trocar Senha</h2>

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              Senha alterada com sucesso!
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Sua senha atual"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition mt-2"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
