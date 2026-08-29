import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { LogoutButton } from "@/app/(dashboard)/logout-button";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/categories", label: "Categorias" },
  { href: "/admin/content", label: "Conteúdo" },
  { href: "/admin/payments", label: "Pagamentos" },
  { href: "/admin/settings", label: "Config" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium">OmniMedia — Admin</span>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-zinc-200">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{admin.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
