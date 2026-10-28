"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { TaskModal } from "@/components/task-modal";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { ASSIGNEE_LABELS, ASSIGNEE_STYLES } from "@/lib/constants";
import { formatShortDate, relativeTime, todayInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

const filters = [
  { value: "open", label: "Pendientes" },
  { value: "closed", label: "Hechas" },
  { value: "all", label: "Todas" },
];

const scopeFilters = [
  { value: "all", label: "Sin filtro" },
  { value: "mine", label: "Para mí" },
  { value: "overdue", label: "Vencidas" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [scope, setScope] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/tasks");
      setTasks(data.tasks);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar las tareas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayInputValue();
  const myKey = user?.assigneeKey || null;

  const counts = useMemo(
    () => ({
      all: tasks.length,
      open: tasks.filter((task) => task.status === "OPEN").length,
      closed: tasks.filter((task) => task.status === "CLOSED").length,
    }),
    [tasks]
  );

  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "OPEN" && task.dueDate && task.dueDate < today
      ).length,
    [tasks, today]
  );

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (
          filter !== "all" &&
          task.status !== (filter === "open" ? "OPEN" : "CLOSED")
        ) {
          return false;
        }

        if (scope === "mine") {
          if (!myKey) return true;
          return task.assignee === myKey || task.assignee === "BOTH";
        }

        if (scope === "overdue") {
          return (
            task.status === "OPEN" && task.dueDate && task.dueDate < today
          );
        }

        return true;
      }),
    [tasks, filter, scope, myKey, today]
  );

  function selectFilter(value) {
    setFilter(value);
    // El filtro «Para mí» / «Vencidas» es propio de la pestaña elegida.
    setScope("all");
  }

  async function deleteTask() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await apiRequest(`/tasks/${deleteTarget.id}`, { method: "DELETE" });
      toast("Tarea eliminada");
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      toast(deleteError.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTask(null);
  }

  async function toggleTask(task) {
    setBusyId(task.id);

    try {
      const closing = task.status === "OPEN";
      await apiRequest(`/tasks/${task.id}/${closing ? "close" : "reopen"}`, {
        method: "POST",
      });
      toast(closing ? "Tarea cerrada. ¡Bien hecho!" : "Tarea reabierta");
      await load();
    } catch (taskError) {
      toast(taskError.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Pendientes de casa"
        title="Tareas"
        description="Repartid lo que hay que hacer y cerradlo cuando esté listo. Todo cambio queda registrado."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva tarea
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectFilter(item.value)}
            className={cn(
              "focus-ring rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              filter === item.value
                ? "bg-ink-900 text-white shadow-sm"
                : "border border-sand-200 bg-white text-ink-500 hover:border-sand-300 hover:text-ink-800"
            )}
          >
            {item.label}
            <span
              className={cn(
                "ml-2 rounded-full px-1.5 py-0.5 text-[10px]",
                filter === item.value
                  ? "bg-white/15 text-white"
                  : "bg-sand-100 text-ink-400"
              )}
            >
              {counts[item.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-300">
          Filtrar
        </span>
        {scopeFilters
          .filter((item) => item.value !== "overdue" || filter !== "closed")
          .map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setScope(item.value)}
              className={cn(
                "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                scope === item.value
                  ? "border-sage-300 bg-sage-100 text-sage-800"
                  : "border-sand-200 bg-white text-ink-500 hover:border-sand-300 hover:text-ink-800"
              )}
            >
              {item.value === "overdue" ? (
                <CalendarDays className="h-3.5 w-3.5" />
              ) : null}
              {item.label}
              {item.value === "overdue" && overdueCount > 0 ? (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {overdueCount}
                </span>
              ) : null}
            </button>
          ))}
      </div>

      {loading ? (
        <Card className="p-5">
          <LoadingBlock rows={5} />
        </Card>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">{error}</p>
          <Button onClick={load}>Reintentar</Button>
        </Card>
      ) : visibleTasks.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={filter === "closed" ? CheckCircle2 : ListTodo}
            title={
              scope === "overdue"
                ? "Nada vencido"
                : scope === "mine"
                  ? "No tienes tareas en este filtro"
                  : filter === "closed"
                    ? "Todavía no hay tareas cerradas"
                    : filter === "open"
                      ? "No hay tareas pendientes"
                      : "Casa tranquila, no hay tareas"
            }
            description={
              scope === "overdue"
                ? "Todas las tareas pendientes están dentro de plazo."
                : scope === "mine"
                  ? "Prueba a quitar el filtro «Para mí» para ver el resto."
                  : filter === "closed"
                    ? "Cuando completéis una tarea aparecerá aquí."
                    : "Cread una tarea para dejar claro qué toca hacer."
            }
            action={
              filter !== "closed" ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Crear tarea
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const closed = task.status === "CLOSED";
            const busy = busyId === task.id;
            const overdue =
              !closed && Boolean(task.dueDate) && task.dueDate < today;

            return (
              <Card
                key={task.id}
                className={cn(
                  "group flex items-start gap-3.5 p-4 transition sm:items-center sm:p-5",
                  closed ? "bg-sand-50/70" : "hover:border-sand-300"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task)}
                  disabled={busy}
                  className={cn(
                    "focus-ring mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 sm:mt-0",
                    closed
                      ? "border-sage-200 bg-sage-100 text-sage-600"
                      : "border-sand-200 bg-white text-transparent hover:border-sage-300 hover:bg-sage-50 hover:text-sage-500"
                  )}
                  aria-label={
                    closed ? `Reabrir tarea ${task.title}` : `Cerrar tarea ${task.title}`
                  }
                >
                  {closed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Check className={cn("h-4 w-4", busy && "animate-pulse")} />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "min-w-0 truncate text-sm font-semibold sm:text-[15px]",
                        closed ? "text-ink-400 line-through" : "text-ink-900"
                      )}
                    >
                      {task.title}
                    </p>
                    {closed ? (
                      <Badge tone="sand">Cerrada</Badge>
                    ) : (
                      <Badge tone="sage">Abierta</Badge>
                    )}
                  </div>

                  {task.description ? (
                    <p
                      className={cn(
                        "mt-1 line-clamp-2 text-sm leading-5",
                        closed ? "text-ink-300" : "text-ink-500"
                      )}
                    >
                      {task.description}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
                    <span>
                      Creada por <strong className="font-semibold">{task.createdBy?.name}</strong>
                    </span>
                    <span className="hidden h-1 w-1 rounded-full bg-sand-300 sm:block" />
                    <span>{relativeTime(task.createdAt)}</span>
                    {task.dueDate ? (
                      <>
                        <span className="hidden h-1 w-1 rounded-full bg-sand-300 sm:block" />
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-semibold",
                            overdue
                              ? "text-red-500"
                              : closed
                                ? "text-ink-300"
                                : "text-ink-500"
                          )}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {overdue ? "Venció" : "Vence"}{" "}
                          {formatShortDate(task.dueDate)}
                        </span>
                      </>
                    ) : null}
                    {closed && task.closedBy ? (
                      <>
                        <span className="hidden h-1 w-1 rounded-full bg-sand-300 sm:block" />
                        <span>
                          Cerrada por{" "}
                          <strong className="font-semibold">{task.closedBy.name}</strong>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                      ASSIGNEE_STYLES[task.assignee] || ASSIGNEE_STYLES.BOTH
                    )}
                  >
                    {ASSIGNEE_LABELS[task.assignee] || "Ambos"}
                  </span>
                  {!closed ? (
                    <IconButton
                      label="Editar tarea"
                      onClick={() => openEdit(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    label={`Eliminar tarea ${task.title}`}
                    onClick={() => setDeleteTarget(task)}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        task={editingTask}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteTask}
        title="Eliminar tarea"
        description={
          deleteTarget
            ? `Se eliminará «${deleteTarget.title}» definitivamente. El registro de Actividad se conservará.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
