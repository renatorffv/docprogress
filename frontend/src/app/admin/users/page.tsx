import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UsersAdmin from "./UsersAdmin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

export default async function AdminUsersPage() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) redirect("/login");

  let users: { id: string; name: string; email: string; createdAt: string }[] = [];
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      users = data.users ?? [];
    }
  } catch {
    // mostra lista vazia se backend offline
  }

  return <UsersAdmin initialUsers={users} />;
}
