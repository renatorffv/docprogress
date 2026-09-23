"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearAuth } from "@/lib/auth";

export default function NavUser() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-xs font-semibold text-blue-700">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-gray-700 hidden sm:block">{user.name}</span>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-red-600 transition"
        title="Sair"
      >
        Sair
      </button>
    </div>
  );
}
