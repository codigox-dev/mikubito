"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plane,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { TripModal } from "@/components/trip-modal";
import { useToast } from "@/components/toast-provider";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  FormError,
  IconButton,
  Input,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  formatTripDates,
  percent,
  todayInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const tripId = params?.id;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTripOpen, setDeleteTripOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    concept: "",
    amount: "",
    date: todayInputValue(),
  });
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  const load = useCallback(async () => {
    if (!tripId) return;

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/trips/${tripId}`);
      setTrip(data.trip);
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar el viaje.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateExpense(field, value) {
    setExpenseForm((current) => ({ ...current, [field]: value }));
  }

  async function addExpense(event) {
    event.preventDefault();
    setExpenseSaving(true);
    setExpenseError("");

    try {
      const data = await apiRequest(`/trips/${tripId}/expenses`, {
        method: "POST",
        body: {
          concept: expenseForm.concept.trim(),
          amount: Number(expenseForm.amount),
          date: expenseForm.date,
        },
      });
      setTrip(data.trip);
      setExpenseForm({
        concept: "",
        amount: "",
        date: expenseForm.date || todayInputValue(),
      });
      toast("Gasto añadido al viaje");
    } catch (saveError) {
      setExpenseError(saveError.message || "No se pudo añadir el gasto.");
    } finally {
      setExpenseSaving(false);
    }
  }

  async function deleteTrip() {
    setDeletingTrip(true);

    try {
      await apiRequest(`/trips/${tripId}`, { method: "DELETE" });
      toast("Viaje eliminado");
      router.replace("/viajes");
    } catch (deleteError) {
      toast(deleteError.message, "error");
      setDeletingTrip(false);
    }
  }

  async function deleteExpense() {
    if (!deleteExpenseTarget) return;
    setDeletingExpense(true);

    try {
      await apiRequest(
        `/trips/${tripId}/expenses/${deleteExpenseTarget.id}`,
        { method: "DELETE" }
      );
      toast("Gasto eliminado");
      setDeleteExpenseTarget(null);
      await load();
    } catch (deleteError) {
      toast(deleteError.message, "error");
    } finally {
      setDeletingExpense(false);
    }
  }

  if (loading && !trip) {
    return (
      <div>
        <Link
          href="/viajes"
          className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-ink-400 hover:text-ink-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a viajes
        </Link>
        <div className="skeleton mb-6 h-24 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-36 rounded-3xl" />
          ))}
        </div>
        <Card className="mt-5 p-5">
          <LoadingBlock rows={4} />
        </Card>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div>
        <Link
          href="/viajes"
          className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-ink-400 hover:text-ink-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a viajes
        </Link>
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">
            {error || "Este viaje ya no existe."}
          </p>
          <Button onClick={load}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  const progress = percent(trip.totalSpent, trip.totalBudget);
  const over = trip.remaining < 0;

  return (
    <div className="animate-fade-in">
      <Link
        href="/viajes"
        className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-ink-400 hover:text-ink-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a viajes
      </Link>

      <PageHeader
        eyebrow={formatTripDates(trip.startDate, trip.endDate)}
        title={trip.name}
        description={
          trip.notes ||
          "Presupuesto y gastos del viaje. Todo se actualiza al momento."
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <IconButton
              label="Eliminar viaje"
              onClick={() => setDeleteTripOpen(true)}
              className="border border-sand-200 bg-white hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Plane}
          label="Presupuesto total"
          value={formatCurrency(trip.totalBudget)}
          hint={`${trip.expenseCount} ${
            trip.expenseCount === 1 ? "gasto registrado" : "gastos registrados"
          }`}
          tone="sky"
        />
        <StatCard
          icon={ReceiptText}
          label="Gastado"
          value={formatCurrency(trip.totalSpent)}
          hint={`${Math.round(progress)} % del presupuesto`}
          tone="clay"
        />
        <StatCard
          icon={CalendarDays}
          label={over ? "Excedido" : "Restante"}
          value={formatCurrency(over ? Math.abs(trip.remaining) : trip.remaining)}
          hint={over ? "Habéis superado el límite" : "Disponible para el viaje"}
          tone={over ? "amber" : "sage"}
        />
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-800">
              Cómo va el presupuesto
            </p>
            <p className="mt-0.5 text-xs text-ink-400">
              {formatCurrency(trip.totalSpent)} de {formatCurrency(trip.totalBudget)}
            </p>
          </div>
          <p
            className={cn(
              "text-sm font-bold",
              over ? "text-red-600" : "text-sage-700"
            )}
          >
            {Math.round(progress)} % utilizado
          </p>
        </div>
        <ProgressBar
          value={progress}
          tone={over ? "red" : progress > 80 ? "amber" : "sky"}
          className="mt-4 h-2.5"
        />
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="border-b border-sand-100 p-5 sm:p-6">
            <h2 className="font-display text-2xl text-ink-950">
              Gastos del viaje
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Gastos fijos y compras puntuales, ordenados por fecha.
            </p>
          </div>

          {trip.expenses.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                icon={ReceiptText}
                title="Todavía no hay gastos"
                description="Añade el primer gasto del viaje desde el formulario de al lado."
              />
            </div>
          ) : (
            <div className="divide-y divide-sand-100">
              {trip.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 px-4 py-4 transition hover:bg-sand-50/50 sm:px-6"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <ReceiptText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {expense.concept}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-400">
                      <span>{formatDate(expense.date)}</span>
                      <span className="h-1 w-1 rounded-full bg-sand-300" />
                      <span>Añadido por {expense.createdBy?.name}</span>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-ink-950">
                    {formatCurrency(expense.amount)}
                  </p>
                  <IconButton
                    label="Eliminar gasto"
                    onClick={() => setDeleteExpenseTarget(expense)}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="h-fit p-5 sm:p-6 xl:sticky xl:top-6">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-sage-100 p-2 text-sage-700">
              <Plus className="h-4 w-4" />
            </span>
            <h2 className="font-display text-xl text-ink-950">Añadir gasto</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-400">
            Se descontará automáticamente del presupuesto restante.
          </p>

          <form onSubmit={addExpense} className="mt-5 space-y-4">
            {expenseError ? <FormError>{expenseError}</FormError> : null}

            <Field label="Concepto" htmlFor="trip-expense-concept">
              <Input
                id="trip-expense-concept"
                value={expenseForm.concept}
                onChange={(event) => updateExpense("concept", event.target.value)}
                placeholder="Ej. Vuelos"
                maxLength={160}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Importe (€)" htmlFor="trip-expense-amount">
                <Input
                  id="trip-expense-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(event) => updateExpense("amount", event.target.value)}
                  placeholder="0,00"
                  required
                />
              </Field>
              <Field label="Fecha" htmlFor="trip-expense-date">
                <Input
                  id="trip-expense-date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(event) => updateExpense("date", event.target.value)}
                  required
                />
              </Field>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={expenseSaving}
            >
              <Plus className="h-4 w-4" />
              Añadir al viaje
            </Button>
          </form>

          <div className="mt-5 flex items-center gap-2 border-t border-sand-100 pt-4">
            <Avatar name={trip.createdBy?.name} size="sm" />
            <p className="text-[11px] text-ink-400">
              Viaje creado por {trip.createdBy?.name}
            </p>
          </div>
        </Card>
      </div>

      <TripModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        trip={trip}
        onSaved={load}
      />

      <ConfirmDialog
        open={deleteTripOpen}
        onClose={() => setDeleteTripOpen(false)}
        onConfirm={deleteTrip}
        title="Eliminar viaje"
        description={`Se eliminará «${trip.name}» junto con ${
          trip.expenseCount === 1
            ? "su gasto"
            : `sus ${trip.expenseCount} gastos`
        }. Esta acción no se puede deshacer y quedará registrada.`}
        confirmLabel="Eliminar viaje"
        loading={deletingTrip}
      />

      <ConfirmDialog
        open={Boolean(deleteExpenseTarget)}
        onClose={() => setDeleteExpenseTarget(null)}
        onConfirm={deleteExpense}
        title="Eliminar gasto del viaje"
        description={
          deleteExpenseTarget
            ? `Se eliminará «${deleteExpenseTarget.concept}» de ${formatCurrency(
                deleteExpenseTarget.amount
              )}.`
            : ""
        }
        confirmLabel="Eliminar gasto"
        loading={deletingExpense}
      />
    </div>
  );
}
