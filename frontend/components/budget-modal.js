"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  Button,
  Field,
  FormError,
  Input,
  Modal,
} from "@/components/ui";
import { useToast } from "@/components/toast-provider";
import { apiRequest } from "@/lib/api";
import { formatMonth } from "@/lib/format";

export function BudgetModal({ open, onClose, month, currentAmount, onSaved }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(currentAmount ? String(currentAmount) : "");
    setError("");
  }, [open, currentAmount]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiRequest("/finance/budget", {
        method: "PUT",
        body: {
          month,
          amount: Number(amount),
        },
      });
      toast("Presupuesto actualizado");
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Presupuesto mensual"
      description={`Define cuánto queréis destinar a los gastos de ${formatMonth(
        month
      ).toLowerCase()}.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="budget-form" loading={saving}>
            <Save className="h-4 w-4" />
            Guardar presupuesto
          </Button>
        </div>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? <FormError>{error}</FormError> : null}

        <Field
          label="Importe total (€)"
          htmlFor="budget-amount"
          hint="Podéis cambiarlo cuando queráis; se guarda por mes."
        >
          <Input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Ej. 2500"
            autoFocus
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
