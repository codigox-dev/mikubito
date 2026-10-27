"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plane,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, IconButton } from "@/components/ui";
import { cn, firstName } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/tareas", label: "Tareas", icon: ListTodo },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/viajes", label: "Viajes", icon: Plane },
  { href: "/supermercado", label: "Compra", icon: ShoppingBasket },
  { href: "/actividad", label: "Actividad", icon: Activity },
];

function Brand() {
  return (
    <Link href="/dashboard" className="focus-ring flex items-center gap-3 rounded-xl">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-900 text-sage-100 shadow-sm">
        <span className="font-display text-xl leading-none">c</span>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-clay-400" />
      </span>
      <span>
        <span className="block font-display text-xl leading-none text-ink-950">
          cubito
        </span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
          Nuestro hogar
        </span>
      </span>
    </Link>
  );
}

function NavLink({ item, compact = false, onClick }) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  if (compact) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "focus-ring flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition",
          active ? "bg-ink-900 text-white" : "text-ink-400 hover:bg-sand-100"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "focus-ring group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-ink-900 text-white shadow-sm"
          : "text-ink-500 hover:bg-sand-100 hover:text-ink-900"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition",
          active ? "text-sage-200" : "text-ink-400 group-hover:text-ink-600"
        )}
      />
      {item.label}
      {active ? (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clay-400" />
      ) : null}
    </Link>
  );
}

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar de escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sand-200/80 bg-white/85 px-5 py-6 backdrop-blur-xl lg:flex">
        <Brand />

        <div className="mt-9">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-300">
            Espacio compartido
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </div>

        <div className="mt-auto">
          <div className="mb-3 rounded-2xl border border-sage-100 bg-sage-50/80 p-3.5">
            <p className="text-xs font-semibold text-sage-800">
              Todo queda registrado
            </p>
            <p className="mt-1 text-[11px] leading-4 text-sage-700/70">
              Cada cambio guarda quién lo hizo y cuándo.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3">
            <Avatar name={user?.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-ink-400">{user?.email}</p>
            </div>
            <IconButton label="Cerrar sesión" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-30 border-b border-sand-200/80 bg-sand-50/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between">
          <Brand />
          <div className="flex items-center gap-1.5">
            <div className="mr-1 hidden text-right sm:block">
              <p className="text-xs font-bold text-ink-800">
                {firstName(user?.name)}
              </p>
              <p className="text-[10px] text-ink-400">en casa</p>
            </div>
            <Avatar name={user?.name} size="sm" />
            <IconButton label="Cerrar sesión" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>

      {/* Navegación móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} compact />
          ))}
        </div>
      </nav>
    </div>
  );
}
