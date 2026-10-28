"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ListTodo,
  ShoppingBasket,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const typeMeta = {
  TASK_ASSIGNED: {
    icon: ListTodo,
    wrapper: "bg-sage-100 text-sage-700",
    href: "/tareas",
  },
  SHOPPING_ITEM_ADDED: {
    icon: ShoppingBasket,
    wrapper: "bg-amber-100 text-amber-700",
    href: "/supermercado",
  },
  SHOPPING_LIST_CLOSED: {
    icon: ShoppingBasket,
    wrapper: "bg-sand-100 text-ink-600",
    href: "/supermercado",
  },
};

const FALLBACK_META = {
  icon: Bell,
  wrapper: "bg-sand-100 text-ink-500",
  href: "/dashboard",
};

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest("/notifications?limit=20");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silencioso: la campana no debe interrumpir la navegación.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    load();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20000);

    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, load]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleOpenNotification(notification) {
    setOpen(false);

    if (!notification.readAt) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      apiRequest(`/notifications/${notification.id}/read`, {
        method: "POST",
      }).catch(() => {});
    }

    router.push(typeMeta[notification.type]?.href || FALLBACK_META.href);
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.readAt ? item : { ...item, readAt: now }))
      );
      setUnreadCount(0);
    } catch {
      // Si falla, la próxima sincronización recupera el estado real.
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
        aria-expanded={open}
        className={cn(
          "focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-ink-500 shadow-sm transition hover:border-sand-300 hover:text-ink-800",
          open ? "border-sand-300 text-ink-900" : "border-sand-200"
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-sand-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink-900">Notificaciones</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-clay-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || markingAll}
              className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-500 transition hover:bg-sand-100 hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </button>
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-14 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="rounded-2xl bg-sand-100 p-3 text-ink-300">
                  <CheckCheck className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-ink-700">Todo al día</p>
                <p className="text-xs text-ink-400">
                  Aquí aparecerán las tareas que te asignen y los cambios en la compra.
                </p>
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => {
                  const meta = typeMeta[notification.type] || FALLBACK_META;
                  const Icon = meta.icon;
                  const unread = !notification.readAt;

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className={cn(
                          "focus-ring flex w-full items-start gap-3 border-b border-sand-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-sand-50",
                          unread && "bg-sage-50/50"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            meta.wrapper
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-ink-900">
                              {notification.title}
                            </span>
                            {unread ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                            ) : null}
                          </span>
                          {notification.body ? (
                            <span className="mt-0.5 block text-xs leading-5 text-ink-500">
                              {notification.body}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[10px] font-medium text-ink-300">
                            {relativeTime(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
