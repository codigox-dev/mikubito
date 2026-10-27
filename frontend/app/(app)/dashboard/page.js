"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ListTodo,
  PiggyBank,
  Plane,
  Plus,
  ShoppingBasket,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { ASSIGNEE_LABELS, ASSIGNEE_STYLES, ENTITY_COLORS } from "@/lib/constants";
import {
  currentMonthKey,
  formatCurrency,
  formatMonth,
  greetingForNow,
  percent,
  relativeTime,
} from "@/lib/format";
import { cn, firstName } from "@/lib/utils";

function todayLabel() {
  const label = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LoadingBlock rows={4} />
        </div>
        <LoadingBlock rows={3} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closingId, setClosingId] = useState(null);

  const month = useMemo(() => currentMonthKey(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(`/dashboard?month=${month}`);
      setData(response);
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar el resumen de casa.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function completeTask(taskId) {
    setClosingId(taskId);

    try {
      await apiRequest(`/tasks/${taskId}/close`, { method: "POST" });
      toast("Tarea cerrada. ¡Una menos!");
      await load();
    } catch (taskError) {
      toast(taskError.message, "error");
    } finally {
      setClosingId(null);
    }
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader
          eyebrow={todayLabel()}
          title={`${greetingForNow()}, ${firstName(user?.name)}`}
          description="Este es el pulso de casa hoy."
        />
        <DashboardSkeleton />
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <PageHeader
          eyebrow="Inicio"
          title="No hemos podido cargar el resumen"
          description={error}
        />
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">
            Comprueba que la API esté disponible y vuelve a intentarlo.
          </p>
          <Button onClick={load}>Reintentar</Button>
        </Card>
      </>
    );
  }

  const stats = data?.stats || {};
  const activeList = data?.activeList;
  const latestTrip = data?.latestTrip;
  const openTasks = data?.openTasks || [];
  const recentActivity = data?.recentActivity || [];
  const budgetProgress = percent(stats.monthlyExpenseTotal, stats.monthlyBudget);
  const overBudget =
    stats.monthlyBudget !== null &&
    Number(stats.remainingBudget) < 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greetingForNow()}, ${firstName(user?.name)}`}
        description="Este es el pulso de casa hoy. Todo lo importante, de un vistazo."
        action={
          <Link href="/tareas">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ListTodo}
          label="Tareas abiertas"
          value={stats.openTasks ?? 0}
          hint={
            stats.openTasks === 0
              ? "Todo al día"
              : stats.openTasks === 1
                ? "Una cosa pendiente"
                : "Cosas por resolver"
          }
          tone="sage"
        />
        <StatCard
          icon={Wallet}
          label={`Gastos de ${formatMonth(month).toLowerCase()}`}
          value={formatCurrency(stats.monthlyExpenseTotal || 0)}
          hint={`Presupuesto: ${
            stats.monthlyBudget !== null
              ? formatCurrency(stats.monthlyBudget)
              : "sin definir"
          }`}
          tone="clay"
        />
        <StatCard
          icon={PiggyBank}
          label="Queda de presupuesto"
          value={
            stats.monthlyBudget === null
              ? "Sin definir"
              : formatCurrency(stats.remainingBudget)
          }
          hint={
            overBudget
              ? "Habéis superado el presupuesto"
              : "Disponible este mes"
          }
          tone={overBudget ? "amber" : "sky"}
        />
        <StatCard
          icon={ShoppingBasket}
          label="En la lista de compra"
          value={stats.pendingItems ?? 0}
          hint={stats.activeListName || "No hay lista activa"}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* Tareas pendientes */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink-950">
                  Pendientes de casa
                </h2>
                <p className="mt-1 text-sm text-ink-400">
                  Lo que aún necesita una mano.
                </p>
              </div>
              <Link
                href="/tareas"
                className="focus-ring inline-flex items-center gap-1 rounded-lg text-xs font-bold text-sage-700 hover:text-sage-900"
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {openTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No queda nada pendiente"
                description="Disfrutad del sofá: todas las tareas están cerradas."
                className="mt-5"
              />
            ) : (
              <div className="mt-5 divide-y divide-sand-100">
                {openTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <button
                      type="button"
                      onClick={() => completeTask(task.id)}
                      disabled={closingId === task.id}
                      className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sand-200 bg-sand-50 text-transparent transition hover:border-sage-300 hover:bg-sage-50 hover:text-sage-600 disabled:opacity-50"
                      aria-label={`Cerrar tarea ${task.title}`}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          closingId === task.id && "animate-pulse"
                        )}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800">
                        {task.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-400">
                        {task.description || `Creada por ${task.createdBy?.name}`} ·{" "}
                        {relativeTime(task.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                        ASSIGNEE_STYLES[task.assignee] || ASSIGNEE_STYLES.BOTH
                      )}
                    >
                      {ASSIGNEE_LABELS[task.assignee] || "Ambos"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Lista de compra activa */}
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-sand-100 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl text-ink-950">
                    Lista de compra
                  </h2>
                  {activeList ? (
                    <Badge tone="sage">Activa</Badge>
                  ) : (
                    <Badge>Sin lista</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-400">
                  {activeList
                    ? `${activeList.purchasedCount} de ${activeList.itemCount} ${
                        activeList.itemCount === 1 ? "producto" : "productos"
                      } ya en la cesta`
                    : "Crea una lista cuando toque bajar al súper."}
                </p>
              </div>
              <Link href="/supermercado">
                <Button variant="secondary" size="sm">
                  Abrir
                </Button>
              </Link>
            </div>

            {activeList ? (
              <div className="p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ProgressBar
                    value={percent(activeList.purchasedCount, activeList.itemCount)}
                    tone="sage"
                    className="flex-1"
                  />
                  <span className="text-xs font-bold text-ink-500">
                    {activeList.itemCount > 0
                      ? Math.round(
                          percent(
                            activeList.purchasedCount,
                            activeList.itemCount
                          )
                        )
                      : 0}
                    %
                  </span>
                </div>

                {activeList.items.length === 0 ? (
                  <p className="rounded-2xl bg-sand-50 px-4 py-6 text-center text-sm text-ink-400">
                    La lista está vacía. Añade el primer producto desde
                    Supermercado.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeList.items.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border border-sand-100 px-3 py-2.5 text-sm",
                          item.purchased && "bg-sand-50 text-ink-400"
                        )}
                      >
                        {item.purchased ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-500" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-ink-200" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            item.purchased && "line-through"
                          )}
                        >
                          {item.name}
                        </span>
                        {item.quantity ? (
                          <span className="text-[11px] text-ink-400">
                            {item.quantity}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {activeList.items.length > 6 ? (
                  <Link
                    href="/supermercado"
                    className="focus-ring mt-4 inline-flex items-center gap-1 rounded-lg text-xs font-bold text-sage-700"
                  >
                    {activeList.items.length === 1
                      ? "Ver el producto"
                      : `Ver los ${activeList.items.length} productos`}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <EmptyState
                  icon={ShoppingBasket}
                  title="Sin lista activa"
                  description="Cuando hagáis la compra, podéis crear una lista y marcarla juntos."
                  action={
                    <Link href="/supermercado">
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                        Crear lista
                      </Button>
                    </Link>
                  }
                />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Presupuesto */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink-950">Presupuesto</h2>
              <Link
                href="/finanzas"
                className="focus-ring rounded-lg text-xs font-bold text-sage-700"
              >
                Gestionar
              </Link>
            </div>

            {stats.monthlyBudget === null ? (
              <div className="mt-4 rounded-2xl bg-sand-50 p-4">
                <p className="text-sm leading-6 text-ink-500">
                  Aún no hay presupuesto para {formatMonth(month).toLowerCase()}.
                </p>
                <Link href="/finanzas">
                  <Button variant="soft" size="sm" className="mt-3">
                    Definir presupuesto
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold text-ink-950">
                      {formatCurrency(stats.remainingBudget)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">disponible</p>
                  </div>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      overBudget ? "text-red-600" : "text-sage-700"
                    )}
                  >
                    {Math.round(budgetProgress)} % usado
                  </p>
                </div>
                <ProgressBar
                  value={budgetProgress}
                  tone={overBudget ? "red" : "sage"}
                  className="mt-3"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
                  <span>{formatCurrency(stats.monthlyExpenseTotal)} gastado</span>
                  <span>{formatCurrency(stats.monthlyBudget)} total</span>
                </div>
              </>
            )}
          </Card>

          {/* Viaje más reciente */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink-950">Último viaje</h2>
              <Link
                href="/viajes"
                className="focus-ring rounded-lg text-xs font-bold text-sage-700"
              >
                Ver todos
              </Link>
            </div>

            {latestTrip ? (
              <Link
                href={`/viajes/${latestTrip.id}`}
                className="focus-ring group mt-4 block rounded-2xl border border-sand-100 bg-sand-50/60 p-4 transition hover:border-sage-200 hover:bg-sage-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <Plane className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">
                      {latestTrip.name}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatCurrency(latestTrip.totalSpent)} de{" "}
                      {formatCurrency(latestTrip.totalBudget)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-sage-600" />
                </div>
                <ProgressBar
                  value={percent(
                    latestTrip.totalSpent,
                    latestTrip.totalBudget
                  )}
                  tone={
                    latestTrip.remaining < 0
                      ? "red"
                      : percent(
                            latestTrip.totalSpent,
                            latestTrip.totalBudget
                          ) > 80
                        ? "amber"
                        : "sky"
                  }
                  className="mt-4"
                />
                <p className="mt-2 text-xs text-ink-400">
                  {latestTrip.remaining >= 0
                    ? `${formatCurrency(latestTrip.remaining)} restantes`
                    : `${formatCurrency(Math.abs(latestTrip.remaining))} por encima`}
                </p>
              </Link>
            ) : (
              <div className="mt-4 rounded-2xl bg-sand-50 p-4">
                <p className="text-sm leading-6 text-ink-500">
                  Todavía no habéis creado ningún viaje.
                </p>
                <Link href="/viajes">
                  <Button variant="soft" size="sm" className="mt-3">
                    <Plus className="h-4 w-4" />
                    Crear viaje
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Actividad */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink-950">Últimos movimientos</h2>
              <Link
                href="/actividad"
                className="focus-ring rounded-lg text-xs font-bold text-sage-700"
              >
                Ver log
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Aún no hay actividad"
                description="En cuanto creéis una tarea o un gasto, aparecerá aquí."
                className="mt-4 border-0 bg-transparent px-0 py-6"
              />
            ) : (
              <div className="mt-4 space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <Avatar
                      name={activity.user?.name}
                      size="sm"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-5 text-ink-600">
                        {activity.description}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            ENTITY_COLORS[activity.entityType] ||
                              "bg-sand-100 text-ink-500"
                          )}
                        >
                          {activity.entityType}
                        </span>
                        <span className="text-[10px] text-ink-300">
                          {relativeTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
