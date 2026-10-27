"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Trash2,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { BudgetModal } from "@/components/budget-modal";
import { ExpenseModal } from "@/components/expense-modal";
import { useToast } from "@/components/toast-provider";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import {
  currentMonthKey,
  formatCurrency,
  formatDate,
  formatMonth,
  monthOffset,
  percent,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function FinancePage() {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonthKey);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (targetMonth = month) => {
      setLoading(true);
      setError("");

      try {
        const [financeData, usersData] = await Promise.all([
          apiRequest(`/finance/overview?month=${targetMonth}`),
          apiRequest("/users"),
        ]);
        setOverview(financeData);
        setUsers(usersData.users);
      } catch (loadError) {
        setError(loadError.message || "No se pudieron cargar las finanzas.");
      } finally {
        setLoading(false);
      }
    },
    [month]
  );

  useEffect(() => {
    load(month);
  }, [month, load]);

  function changeMonth(delta) {
    setMonth((current) => monthOffset(current, delta));
  }

  function openCreateExpense() {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  }

  function openEditExpense(expense) {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await apiRequest(`/finance/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast("Gasto eliminado");
      setDeleteTarget(null);
      await load(month);
    } catch (deleteError) {
      toast(deleteError.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  const budget = overview?.budget?.amount ?? null;
  const expensesTotal = overview?.expensesTotal ?? 0;
  const expenseCount = overview?.expenseCount ?? 0;
  const remaining = overview?.remaining;
  const budgetProgress = percent(expensesTotal, budget);
  const overBudget = budget !== null && remaining < 0;
  const paidBy = overview?.byUser || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Finanzas de casa"
        title="Finanzas"
        description="Presupuesto mensual, gastos comunes y quién ha pagado qué."
        action={
          <Button onClick={openCreateExpense}>
            <Plus className="h-4 w-4" />
            Añadir gasto
          </Button>
        }
      />

      <Card className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <IconButton label="Mes anterior" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <div className="min-w-[170px] text-center">
            <p className="text-sm font-bold text-ink-900">{formatMonth(month)}</p>
            <p className="text-[11px] text-ink-400">
              {expenseCount} {expenseCount === 1 ? "movimiento" : "movimientos"}
            </p>
          </div>
          <IconButton
            label="Mes siguiente"
            onClick={() => changeMonth(1)}
            disabled={month >= currentMonthKey()}
          >
            <ChevronRight className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBudgetOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <PiggyBank className="h-4 w-4" />
            {budget === null ? "Definir presupuesto" : "Editar presupuesto"}
          </Button>
          <Button
            variant="soft"
            size="sm"
            onClick={openCreateExpense}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Gasto
          </Button>
        </div>
      </Card>

      {loading && !overview ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-36 rounded-3xl" />
            ))}
          </div>
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
          <Button onClick={() => load(month)}>Reintentar</Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Wallet}
              label="Presupuesto del mes"
              value={budget === null ? "Sin definir" : formatCurrency(budget)}
              hint={
                budget === null
                  ? "Añade un límite para controlar el mes"
                  : `${Math.round(budgetProgress)} % utilizado`
              }
              tone="sage"
            />
            <StatCard
              icon={TrendingDown}
              label="Gastado"
              value={formatCurrency(expensesTotal)}
              hint={`${expenseCount} ${
                expenseCount === 1 ? "gasto registrado" : "gastos registrados"
              }`}
              tone="clay"
            />
            <StatCard
              icon={PiggyBank}
              label={overBudget ? "Excedido" : "Disponible"}
              value={
                budget === null
                  ? "—"
                  : formatCurrency(overBudget ? Math.abs(remaining) : remaining)
              }
              hint={
                budget === null
                  ? "Define un presupuesto mensual"
                  : overBudget
                    ? "Por encima del límite"
                    : "Todavía podéis gastar"
              }
              tone={overBudget ? "amber" : "sky"}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            {/* Lista de gastos */}
            <Card className="overflow-hidden xl:col-span-2">
              <div className="flex items-center justify-between gap-4 border-b border-sand-100 p-5 sm:p-6">
                <div>
                  <h2 className="font-display text-2xl text-ink-950">
                    Gastos de {formatMonth(month).toLowerCase()}
                  </h2>
                  <p className="mt-1 text-sm text-ink-400">
                    Cada gasto conserva quién lo pagó y quién lo registró.
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-500 sm:inline-flex">
                  {formatCurrency(expensesTotal)}
                </span>
              </div>

              {overview?.expenses?.length ? (
                <div className="divide-y divide-sand-100">
                  {overview.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-start gap-3 px-4 py-4 transition hover:bg-sand-50/50 sm:items-center sm:px-6"
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600 sm:mt-0">
                        <ReceiptText className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {expense.concept}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(expense.date)}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-sand-300" />
                          <span>
                            Pagó{" "}
                            <strong className="font-semibold text-ink-500">
                              {expense.paidBy?.name}
                            </strong>
                          </span>
                          <span className="hidden h-1 w-1 rounded-full bg-sand-300 sm:block" />
                          <span className="hidden sm:inline">
                            Registró {expense.createdBy?.name}
                          </span>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-ink-950">
                        {formatCurrency(expense.amount)}
                      </p>

                      <div className="flex shrink-0 items-center">
                        <IconButton
                          label="Editar gasto"
                          onClick={() => openEditExpense(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label="Eliminar gasto"
                          onClick={() => setDeleteTarget(expense)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <EmptyState
                    icon={ReceiptText}
                    title="Sin gastos en este mes"
                    description="Cuando registréis una compra o un gasto común aparecerá aquí."
                    action={
                      <Button onClick={openCreateExpense}>
                        <Plus className="h-4 w-4" />
                        Registrar el primero
                      </Button>
                    }
                  />
                </div>
              )}
            </Card>

            {/* Reparto y presupuesto */}
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-ink-400" />
                  <h2 className="font-display text-xl text-ink-950">
                    Quién ha pagado
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {users.map((member) => {
                    const memberData = paidBy.find(
                      (entry) => entry.userId === member.id
                    );
                    const total = memberData?.total ?? 0;
                    const count = memberData?.count ?? 0;
                    const share = percent(total, expensesTotal);

                    return (
                      <div key={member.id}>
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink-800">
                              {member.name}
                            </p>
                            <p className="text-[11px] text-ink-400">
                              {count} {count === 1 ? "gasto" : "gastos"}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-ink-900">
                            {formatCurrency(total)}
                          </p>
                        </div>
                        <ProgressBar
                          value={share}
                          tone={
                            member.name.toLowerCase() === "alex" ? "sky" : "clay"
                          }
                          className="mt-2"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-ink-950">
                    Estado del mes
                  </h2>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      overBudget ? "text-red-600" : "text-sage-700"
                    )}
                  >
                    {budget === null ? "Sin límite" : `${Math.round(budgetProgress)} %`}
                  </span>
                </div>

                <ProgressBar
                  value={budgetProgress}
                  tone={overBudget ? "red" : budgetProgress > 80 ? "amber" : "sage"}
                  className="mt-4 h-2.5"
                />

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-ink-500">
                    <span>Gastado</span>
                    <span className="font-semibold text-ink-800">
                      {formatCurrency(expensesTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-ink-500">
                    <span>Presupuesto</span>
                    <span className="font-semibold text-ink-800">
                      {budget === null ? "—" : formatCurrency(budget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-sand-100 pt-2.5">
                    <span className="font-semibold text-ink-700">
                      {overBudget ? "Excedido" : "Disponible"}
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        overBudget ? "text-red-600" : "text-sage-700"
                      )}
                    >
                      {budget === null
                        ? "—"
                        : formatCurrency(overBudget ? Math.abs(remaining) : remaining)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-5 w-full"
                  onClick={() => setBudgetOpen(true)}
                >
                  <PiggyBank className="h-4 w-4" />
                  {budget === null ? "Definir presupuesto" : "Ajustar presupuesto"}
                </Button>
              </Card>
            </div>
          </div>
        </>
      )}

      <BudgetModal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        month={month}
        currentAmount={budget}
        onSaved={() => load(month)}
      />

      <ExpenseModal
        open={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        users={users}
        onSaved={() => load(month)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar gasto"
        description={
          deleteTarget
            ? `Se eliminará «${deleteTarget.concept}» de ${formatCurrency(
                deleteTarget.amount
              )}. Esta acción quedará en el registro de actividad.`
            : ""
        }
        confirmLabel="Eliminar gasto"
        loading={deleting}
      />
    </div>
  );
}
