"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  History,
  Lock,
  Plus,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  FormError,
  IconButton,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  ProgressBar,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { formatDate, percent, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function recalculateList(list) {
  const purchasedCount = list.items.filter((item) => item.purchased).length;
  return {
    ...list,
    itemCount: list.items.length,
    purchasedCount,
    pendingCount: list.items.length - purchasedCount,
  };
}

export default function ShoppingPage() {
  const { toast } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", quantity: "" });
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const data = await apiRequest("/shopping/lists?status=all");
      setLists(data.lists);
      setLastSync(new Date());
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message || "No se pudo cargar la compra.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh({ silent: true });
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [refresh]);

  const activeList = lists.find((list) => list.status === "ACTIVE") || null;
  const history = lists.filter((list) => list.status === "CLOSED");

  async function addItem(event) {
    event.preventDefault();
    if (!activeList) return;

    setAdding(true);

    try {
      await apiRequest(`/shopping/lists/${activeList.id}/items`, {
        method: "POST",
        body: {
          name: newItem.name.trim(),
          quantity: newItem.quantity.trim() || null,
        },
      });
      setNewItem({ name: "", quantity: "" });
      toast("Producto añadido a la lista");
      await refresh({ silent: true });
    } catch (addError) {
      toast(addError.message, "error");
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(item) {
    if (!activeList) return;
    if (togglingId) return;

    const nextPurchased = !item.purchased;
    setTogglingId(item.id);

    setLists((current) =>
      current.map((list) => {
        if (list.id !== activeList.id) return list;
        return recalculateList({
          ...list,
          items: list.items.map((currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  purchased: nextPurchased,
                  purchasedAt: nextPurchased
                    ? new Date().toISOString()
                    : null,
                }
              : currentItem
          ),
        });
      })
    );

    try {
      const data = await apiRequest(`/shopping/items/${item.id}`, {
        method: "PATCH",
        body: { purchased: nextPurchased },
      });

      setLists((current) =>
        current.map((list) => {
          if (list.id !== activeList.id) return list;
          return recalculateList({
            ...list,
            items: list.items.map((currentItem) =>
              currentItem.id === item.id ? data.item : currentItem
            ),
          });
        })
      );
      setLastSync(new Date());
    } catch (toggleError) {
      toast(toggleError.message, "error");
      await refresh({ silent: true });
    } finally {
      setTogglingId(null);
    }
  }

  async function closeList() {
    if (!activeList) return;
    setClosing(true);

    try {
      await apiRequest(`/shopping/lists/${activeList.id}/close`, {
        method: "POST",
      });
      toast("Lista cerrada y guardada en el historial");
      setCloseOpen(false);
      setExpandedId(activeList.id);
      await refresh({ silent: true });
    } catch (closeError) {
      toast(closeError.message, "error");
    } finally {
      setClosing(false);
    }
  }

  async function createList(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      await apiRequest("/shopping/lists", {
        method: "POST",
        body: { name: createName.trim() },
      });
      toast("Lista de compra creada");
      setCreateOpen(false);
      setCreateName("");
      await refresh({ silent: true });
    } catch (createListError) {
      setCreateError(
        createListError.message || "No se pudo crear la lista."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await apiRequest(`/shopping/items/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast("Producto eliminado");
      setDeleteTarget(null);
      await refresh({ silent: true });
    } catch (deleteError) {
      toast(deleteError.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="La compra de la semana"
        title="Supermercado"
        description="Añadid productos, marcadlos al comprarlos y cerrad la lista para guardarla en el historial."
        action={
          !activeList && !loading ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva lista
            </Button>
          ) : null
        }
      />

      {loading && lists.length === 0 ? (
        <div className="space-y-5">
          <Card className="p-5">
            <LoadingBlock rows={5} />
          </Card>
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">{error}</p>
          <Button onClick={() => refresh()}>Reintentar</Button>
        </Card>
      ) : activeList ? (
        <Card className="overflow-hidden">
          <div className="border-b border-sand-100 bg-gradient-to-r from-sage-50/70 to-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl text-ink-950 sm:text-3xl">
                    {activeList.name}
                  </h2>
                  <Badge tone="sage">Lista activa</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                  <Avatar name={activeList.createdBy?.name} size="sm" />
                  <span>Creada por {activeList.createdBy?.name}</span>
                  <span className="h-1 w-1 rounded-full bg-sand-300" />
                  <span>{relativeTime(activeList.createdAt)}</span>
                  <span className="h-1 w-1 rounded-full bg-sand-300" />
                  <span className="inline-flex items-center gap-1 text-sage-600">
                    <RefreshCw className="h-3 w-3" />
                    Sincronización automática
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCloseOpen(true)}
              >
                <Lock className="h-4 w-4" />
                Cerrar lista
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <ProgressBar
                value={percent(activeList.purchasedCount, activeList.itemCount)}
                tone="sage"
                className="h-2.5 flex-1"
              />
              <span className="shrink-0 text-xs font-bold text-ink-500">
                {activeList.purchasedCount}/{activeList.itemCount}{" "}
                {activeList.itemCount === 1 ? "comprado" : "comprados"}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <form
              onSubmit={addItem}
              className="grid gap-2.5 rounded-2xl bg-sand-50 p-3 sm:grid-cols-[1fr_150px_auto]"
            >
              <Input
                value={newItem.name}
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Añadir producto..."
                maxLength={160}
                aria-label="Nombre del producto"
                required
              />
              <Input
                value={newItem.quantity}
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                placeholder="Cantidad (opcional)"
                maxLength={40}
                aria-label="Cantidad"
              />
              <Button type="submit" loading={adding} className="sm:w-auto">
                <Plus className="h-4 w-4" />
                Añadir
              </Button>
            </form>

            {activeList.items.length === 0 ? (
              <EmptyState
                icon={ShoppingBasket}
                title="La lista está vacía"
                description="Añade el primer producto con el formulario de arriba."
                className="mt-5"
              />
            ) : (
              <div className="mt-5 space-y-2">
                {activeList.items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition sm:px-4",
                      item.purchased
                        ? "border-sand-100 bg-sand-50/80"
                        : "border-sand-200 bg-white hover:border-sage-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      disabled={togglingId === item.id}
                      className={cn(
                        "focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50",
                        item.purchased
                          ? "border-sage-300 bg-sage-500 text-white"
                          : "border-sand-300 bg-white text-transparent hover:border-sage-400 hover:text-sage-500"
                      )}
                      aria-label={
                        item.purchased
                          ? `Desmarcar ${item.name}`
                          : `Marcar ${item.name} como comprado`
                      }
                    >
                      {item.purchased ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-semibold transition",
                          item.purchased
                            ? "text-ink-400 line-through"
                            : "text-ink-900"
                        )}
                      >
                        {item.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-ink-400">
                        <span>Añadido por {item.addedBy?.name}</span>
                        {item.quantity ? (
                          <>
                            <span className="h-1 w-1 rounded-full bg-sand-300" />
                            <span>{item.quantity}</span>
                          </>
                        ) : null}
                        {item.purchased && item.purchasedAt ? (
                          <>
                            <span className="h-1 w-1 rounded-full bg-sand-300" />
                            <span>Comprado {relativeTime(item.purchasedAt)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <IconButton
                      label={`Eliminar ${item.name}`}
                      onClick={() => setDeleteTarget(item)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            {activeList.items.length > 0 &&
            activeList.pendingCount === 0 ? (
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800">
                <Sparkles className="h-4 w-4" />
                ¡Todo comprado! Ya podéis cerrar la lista.
              </div>
            ) : null}

            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-300">
              <Clock3 className="h-3 w-3" />
              {lastSync
                ? `Última sincronización a las ${lastSync.toLocaleTimeString(
                    "es-ES",
                    { hour: "2-digit", minute: "2-digit" }
                  )}`
                : "Sincronizando..."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <EmptyState
            icon={ShoppingBasket}
            title="No hay ninguna lista activa"
            description="Cread una lista para la próxima compra. Podréis marcar los productos desde el móvil."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Crear lista
              </Button>
            }
          />
        </Card>
      )}

      {history.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-ink-400" />
            <h2 className="font-display text-2xl text-ink-950">Historial</h2>
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-bold text-ink-400">
              {history.length}
            </span>
          </div>

          <div className="space-y-3">
            {history.map((list) => {
              const expanded = expandedId === list.id;

              return (
                <Card key={list.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((current) =>
                        current === list.id ? null : list.id
                      )
                    }
                    className="focus-ring flex w-full items-center gap-3 p-4 text-left transition hover:bg-sand-50/60 sm:p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-ink-500">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-ink-900">
                          {list.name}
                        </p>
                        <Badge>Cerrada</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {list.purchasedCount} de {list.itemCount}{" "}
                        {list.itemCount === 1 ? "comprado" : "comprados"} ·{" "}
                        {list.closedBy?.name
                          ? `Cerrada por ${list.closedBy.name}`
                          : "Cerrada"}{" "}
                        {list.closedAt ? `· ${formatDate(list.closedAt)}` : ""}
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-ink-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
                    )}
                  </button>

                  {expanded ? (
                    <div className="border-t border-sand-100 bg-sand-50/40 px-4 py-3 sm:px-5">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {list.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                          >
                            {item.purchased ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-500" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-ink-200" />
                            )}
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate",
                                item.purchased
                                  ? "text-ink-400 line-through"
                                  : "text-ink-500"
                              )}
                            >
                              {item.name}
                            </span>
                            {item.quantity ? (
                              <span className="text-[10px] text-ink-400">
                                {item.quantity}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {list.items.length === 0 ? (
                        <p className="py-3 text-center text-xs text-ink-400">
                          Esta lista se cerró sin productos.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError("");
        }}
        title="Nueva lista de compra"
        description="Ponle un nombre para reconocerla después en el historial."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="submit" form="create-list-form" loading={creating}>
              <Plus className="h-4 w-4" />
              Crear lista
            </Button>
          </div>
        }
      >
        <form id="create-list-form" onSubmit={createList} className="space-y-4">
          {createError ? <FormError>{createError}</FormError> : null}
          <Field label="Nombre de la lista" htmlFor="list-name">
            <Input
              id="list-name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Ej. Compra semanal"
              maxLength={120}
              autoFocus
              required
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={closeList}
        title="Cerrar la lista"
        description={
          activeList
            ? `Se guardará «${activeList.name}» en el historial. ${
                activeList.pendingCount > 0
                  ? `Quedan ${activeList.pendingCount} ${
                      activeList.pendingCount === 1 ? "producto" : "productos"
                    } sin marcar como comprados. `
                  : ""
              }Después podréis crear una lista nueva.`
            : ""
        }
        confirmLabel="Cerrar lista"
        tone="primary"
        loading={closing}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteItem}
        title="Quitar producto"
        description={
          deleteTarget
            ? `Se quitará «${deleteTarget.name}» de la lista.`
            : ""
        }
        confirmLabel="Quitar"
        loading={deleting}
      />
    </div>
  );
}
