"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ListTodo,
  Pencil,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { TaskModal } from "@/components/task-modal";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { ASSIGNEE_LABELS, ASSIGNEE_STYLES } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const filters = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "closed", label: "Cerradas" },
];

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [busyId, setBusyId] = useState(null);

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

  const counts = useMemo(
    () => ({
      all: tasks.length,
      open: tasks.filter((task) => task.status === "OPEN").length,
      closed: tasks.filter((task) => task.status === "CLOSED").length,
    }),
    [tasks]
  );

  const visibleTasks = useMemo(
    () =>
      filter === "all"
        ? tasks
        : tasks.filter((task) =>
            filter === "open" ? task.status === "OPEN" : task.status === "CLOSED"
          ),
    [tasks, filter]
  );

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
              filter === "closed"
                ? "Todavía no hay tareas cerradas"
                : filter === "open"
                  ? "No hay tareas abiertas"
                  : "Casa tranquila, no hay tareas"
            }
            description={
              filter === "closed"
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
    </div>
  );
}
