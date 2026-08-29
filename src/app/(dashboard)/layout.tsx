import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { LogoutButton } from "./logout-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <span className="text-sm font-medium">OmniMedia — Cortes</span>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
