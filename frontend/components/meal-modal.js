"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  Button,
  Field,
  FormError,
  Input,
  Modal,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/toast-provider";
import { apiRequest } from "@/lib/api";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatLongDateISO } from "@/lib/format";

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MealModal({ open, onClose, date, mealType, meal, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(meal);
  const mealLabel = MEAL_TYPE_LABELS[mealType] || "Comida";

  useEffect(() => {
    if (!open) return;

    setForm({
      title: meal?.title || "",
      notes: meal?.notes || "",
    });
    setError("");
  }, [open, meal]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiRequest("/meals", {
        method: "POST",
        body: {
          date,
          mealType,
          title: form.title.trim(),
          notes: form.notes.trim() || null,
        },
      });

      toast(editing ? "Comida actualizada" : "Comida añadida al menú");
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la comida.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar ${mealLabel.toLowerCase()}` : `Añadir ${mealLabel.toLowerCase()}`}
      description={capitalize(formatLongDateISO(date))}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="meal-form" loading={saving}>
            <Save className="h-4 w-4" />
            {editing ? "Guardar cambios" : "Guardar comida"}
          </Button>
        </div>
      }
    >
      <form id="meal-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? <FormError>{error}</FormError> : null}

        <Field label="Plato" htmlFor="meal-title">
          <Input
            id="meal-title"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Ej. Lentejas con verduras"
            maxLength={160}
            autoFocus
            required
          />
        </Field>

        <Field
          label="Notas"
          htmlFor="meal-notes"
          hint="Opcional. Ingredientes, quién cocina o cualquier detalle."
        >
          <Textarea
            id="meal-notes"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Ej. Sacar el pan del congelador por la mañana"
            maxLength={1000}
            className="min-h-[92px]"
          />
        </Field>
      </form>
    </Modal>
  );
}
