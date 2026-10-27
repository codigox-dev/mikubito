"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  CheckSquare,
  History,
  Plane,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { ENTITY_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const filters = [
  { value: "ALL", label: "Todo" },
  { value: "TASK", label: "Tareas" },
  { value: "FINANCE", label: "Finanzas" },
  { value: "TRIP", label: "Viajes" },
  { value: "SHOPPING", label: "Supermercado" },
];

const entityMeta = {
  TASK: {
    icon: CheckSquare,
    wrapper: "bg-sage-100 text-sage-700",
    badge: "sage",
  },
  FINANCE: {
    icon: Wallet,
    wrapper: "bg-clay-100 text-clay-700",
    badge: "clay",
  },
  TRIP: {
    icon: Plane,
    wrapper: "bg-sky-100 text-sky-700",
    badge: "sky",
  },
  SHOPPING: {
    icon: ShoppingBasket,
    wrapper: "bg-amber-100 text-amber-700",
    badge: "amber",
  },
};

function dayKey(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(dateValue) {
  const date = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return "Hoy";
  if (dayKey(date) === dayKey(yesterday)) return "Ayer";

  return formatDate(dateValue);
}

export default function ActivityPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("ALL");
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (page, { append = false } = {}) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError("");
      }

      try {
        const data = await apiRequest(
          `/activity?page=${page}&limit=20&entityType=${filter}`
        );
        setActivities((current) =>
          append ? [...current, ...data.activities] : data.activities
        );
        setPagination(data.pagination);
      } catch (loadError) {
        if (append) {
          toast(loadError.message, "error");
        } else {
          setError(loadError.message || "No se pudo cargar la actividad.");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, toast]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const groups = useMemo(() => {
    const result = [];

    for (const activity of activities) {
      const key = dayKey(activity.createdAt);
      const last = result[result.length - 1];

      if (last && last.key === key) {
        last.items.push(activity);
      } else {
        result.push({
          key,
          label: dayLabel(activity.createdAt),
          items: [activity],
        });
      }
    }

    return result;
  }, [activities]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Historial compartido"
        title="Actividad"
        description="Quién hizo qué y cuándo. Cada tarea, gasto, viaje y cambio en la compra queda aquí."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              "focus-ring rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              filter === item.value
                ? "bg-ink-900 text-white shadow-sm"
                : "border border-sand-200 bg-white text-ink-500 hover:border-sand-300 hover:text-ink-800"
            )}
          >
            {item.label}
          </button>
        ))}
        {pagination ? (
          <span className="ml-auto text-xs text-ink-400">
            {pagination.total}{" "}
            {pagination.total === 1 ? "movimiento" : "movimientos"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <Card className="p-5">
          <LoadingBlock rows={6} />
        </Card>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">{error}</p>
          <Button onClick={() => fetchPage(1)}>Reintentar</Button>
        </Card>
      ) : activities.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={History}
            title="No hay movimientos en esta categoría"
            description="En cuanto hagáis algo en casa, aparecerá aquí con quién y cuándo."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-sand-200" />
              </div>

              <Card className="overflow-hidden">
                <div className="divide-y divide-sand-100">
                  {group.items.map((activity) => {
                    const meta =
                      entityMeta[activity.entityType] || entityMeta.TASK;
                    const Icon = meta.icon;

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3.5 px-4 py-4 transition hover:bg-sand-50/50 sm:px-6"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            meta.wrapper
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-6 text-ink-700">
                            {activity.description}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge tone={meta.badge}>
                              {ENTITY_LABELS[activity.entityType] ||
                                activity.entityType}
                            </Badge>
                            <span
                              className="text-[11px] text-ink-300"
                              title={formatDateTime(activity.createdAt)}
                            >
                              {relativeTime(activity.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Avatar name={activity.user?.name} size="sm" />
                          <div className="hidden text-right sm:block">
                            <p className="text-xs font-semibold text-ink-700">
                              {activity.user?.name}
                            </p>
                            <p className="text-[10px] text-ink-300">en casa</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          ))}

          {pagination?.hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => fetchPage(pagination.page + 1, { append: true })}
                loading={loadingMore}
              >
                <ArrowDown className="h-4 w-4" />
                Cargar más movimientos
              </Button>
            </div>
          ) : (
            <p className="text-center text-[11px] text-ink-300">
              Has llegado al principio del historial.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
