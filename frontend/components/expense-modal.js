"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  Button,
  Field,
  FormError,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { apiRequest } from "@/lib/api";
import { dateInputValue, todayInputValue } from "@/lib/format";

const emptyForm = {
  concept: "",
  amount: "",
  paidById: "",
  date: "",
};

export function ExpenseModal({ open, onClose, expense, users, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(expense);

  useEffect(() => {
    if (!open) return;

    const fallbackPayer =
      user?.id && users.some((item) => item.id === user.id)
        ? user.id
        : users[0]?.id || "";

    setForm(
      expense
        ? {
            concept: expense.concept || "",
            amount: String(expense.amount ?? ""),
            paidById: expense.paidBy?.id || fallbackPayer,
            date: dateInputValue(expense.date) || todayInputValue(),
          }
        : {
            ...emptyForm,
            paidById: fallbackPayer,
            date: todayInputValue(),
          }
    );
    setError("");
  }, [open, expense, users, user?.id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        concept: form.concept.trim(),
        amount: Number(form.amount),
        paidById: form.paidById,
        date: form.date,
      };

      if (editing) {
        await apiRequest(`/finance/expenses/${expense.id}`, {
          method: "PATCH",
          body: payload,
        });
        toast("Gasto actualizado");
      } else {
        await apiRequest("/finance/expenses", {
          method: "POST",
          body: payload,
        });
        toast("Gasto registrado");
      }

      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el gasto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar gasto" : "Nuevo gasto"}
      description="Gastos comunes de casa, con quién los pagó y cuándo."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            <Save className="h-4 w-4" />
            {editing ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? <FormError>{error}</FormError> : null}

        <Field label="Concepto" htmlFor="expense-concept">
          <Input
            id="expense-concept"
            value={form.concept}
            onChange={(event) => update("concept", event.target.value)}
            placeholder="Ej. Compra semanal"
            maxLength={160}
            autoFocus
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monto (€)" htmlFor="expense-amount">
            <Input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => update("amount", event.target.value)}
              placeholder="0,00"
              required
            />
          </Field>

          <Field label="Fecha" htmlFor="expense-date">
            <Input
              id="expense-date"
              type="date"
              value={form.date}
              onChange={(event) => update("date", event.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Pagado por" htmlFor="expense-paid-by">
          <Select
            id="expense-paid-by"
            value={form.paidById}
            onChange={(event) => update("paidById", event.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona quién pagó
            </option>
            {users.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
