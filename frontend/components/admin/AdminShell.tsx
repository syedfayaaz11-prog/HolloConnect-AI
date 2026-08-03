"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthUser, clearToken } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ai-usage", label: "AI Usage" },
  { href: "/admin/memory", label: "Memory" },
  { href: "/admin/agents", label: "AI Agents" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/ocr-jobs", label: "OCR Jobs" },
  { href: "/admin/product-scans", label: "Product Scan Analytics" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/error-logs", label: "Error Logs" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 glass hidden md:flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="mb-1 px-2">
            <span className="text-white font-semibold">HolloConnect AI</span>
            <span className="ml-2 text-[10px] rounded-full bg-accent-purple/30 text-accent-purple px-2 py-0.5 align-middle">
              ADMIN
            </span>
          </div>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 px-2 transition">
            ← Back to app
          </Link>
          <nav className="space-y-1 mt-4">
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="px-2">
          <p className="text-xs text-gray-500 mb-2 truncate">{user?.email}</p>
          <button
            className="text-xs text-gray-400 hover:text-white transition"
            onClick={() => {
              clearToken();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto">{children}</main>
    </div>
  );
}
