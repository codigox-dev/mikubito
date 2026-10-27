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
import { dateInputValue } from "@/lib/format";

const emptyForm = {
  name: "",
  totalBudget: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export function TripModal({ open, onClose, trip, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(trip);

  useEffect(() => {
    if (!open) return;

    setForm(
      trip
        ? {
            name: trip.name || "",
            totalBudget: String(trip.totalBudget ?? ""),
            startDate: dateInputValue(trip.startDate),
            endDate: dateInputValue(trip.endDate),
            notes: trip.notes || "",
          }
        : emptyForm
    );
    setError("");
  }, [open, trip]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        totalBudget: Number(form.totalBudget),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        await apiRequest(`/trips/${trip.id}`, {
          method: "PATCH",
          body: payload,
        });
        toast("Viaje actualizado");
      } else {
        await apiRequest("/trips", { method: "POST", body: payload });
        toast("Viaje creado");
      }

      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el viaje.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar viaje" : "Nuevo viaje"}
      description="Presupuesto y fechas para tener el viaje bajo control."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="trip-form" loading={saving}>
            <Save className="h-4 w-4" />
            {editing ? "Guardar cambios" : "Crear viaje"}
          </Button>
        </div>
      }
    >
      <form id="trip-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? <FormError>{error}</FormError> : null}

        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <Field label="Nombre del viaje" htmlFor="trip-name">
            <Input
              id="trip-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Ej. Viaje a Albania"
              maxLength={120}
              autoFocus
              required
            />
          </Field>

          <Field label="Presupuesto total (€)" htmlFor="trip-budget">
            <Input
              id="trip-budget"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={form.totalBudget}
              onChange={(event) => update("totalBudget", event.target.value)}
              placeholder="0,00"
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de inicio" htmlFor="trip-start">
            <Input
              id="trip-start"
              type="date"
              value={form.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
          </Field>

          <Field label="Fecha de fin" htmlFor="trip-end">
            <Input
              id="trip-end"
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(event) => update("endDate", event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Notas"
          htmlFor="trip-notes"
          hint="Opcional: vuelos, alojamiento, ideas..."
        >
          <Textarea
            id="trip-notes"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Detalles que queráis recordar del viaje"
            maxLength={2000}
          />
        </Field>
      </form>
    </Modal>
  );
}
