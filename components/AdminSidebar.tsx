"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  BedDouble,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/admin",           label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: "/admin/rooms",     label: "Rooms & Beds", icon: BedDouble },
  { href: "/admin/residents", label: "Residents",    icon: Users },
  { href: "/admin/payments",  label: "Payments",     icon: CreditCard },
  { href: "/admin/settings",  label: "Settings",     icon: Settings },
  { href: "/admin/users",     label: "Admin Users",  icon: ShieldCheck },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 bg-sidebar flex flex-col h-full shrink-0 border-r border-sidebar-border">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-sidebar-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-sidebar-foreground leading-tight">Crown Hostel</p>
          <p className="text-[11px] text-sidebar-foreground/50 leading-tight mt-0.5">Admin Panel</p>
        </div>
      </div>

      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 pb-2 pt-1">
          Navigation
        </p>
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3 w-3 text-sidebar-primary/70" />}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Logout */}
      <div className="px-3 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
