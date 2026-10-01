"use client";

import { useState } from "react";
import { authHeader } from "@/lib/auth";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function UsersAdmin({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o usuário "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao remover");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setDeleting(null);
    }
  }

  async function handleReset(id: string, name: string) {
    if (!confirm(`Redefinir a senha de "${name}"? Uma senha temporária será gerada.`)) return;
    setResetting(id);
    setError(null);
    // gera senha aleatória: 4 palavras/segmentos legíveis
    const tmp = Math.random().toString(36).slice(2, 6).toUpperCase() +
      "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ password: tmp }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao redefinir");
      setTempPasswords((prev) => ({ ...prev, [id]: tmp }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setResetting(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuários Cadastrados</h1>
        <p className="text-sm text-gray-500 mt-1">
          {users.length} {users.length === 1 ? "usuário" : "usuários"} registrado{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum usuário cadastrado.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Cadastro</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Senha temp.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-blue-700">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {tempPasswords[u.id] ? (
                      <span className="inline-flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-mono">
                        {tempPasswords[u.id]}
                        <button
                          onClick={() => navigator.clipboard.writeText(tempPasswords[u.id])}
                          title="Copiar"
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          📋
                        </button>
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleReset(u.id, u.name)}
                        disabled={resetting === u.id}
                        className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50 transition"
                      >
                        {resetting === u.id ? "Gerando..." : "Redefinir senha"}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={deleting === u.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition"
                      >
                        {deleting === u.id ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Após redefinir, compartilhe a senha temporária com o usuário. Ele poderá trocá-la em{" "}
        <strong>Minha Conta</strong>.
      </p>
    </div>
  );
}
