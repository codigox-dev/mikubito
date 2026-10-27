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
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/toast-provider";
import { apiRequest } from "@/lib/api";

const emptyForm = {
  title: "",
  description: "",
  assignee: "BOTH",
};

export function TaskModal({ open, onClose, task, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(task);

  useEffect(() => {
    if (!open) return;

    setForm(
      task
        ? {
            title: task.title || "",
            description: task.description || "",
            assignee: task.assignee || "BOTH",
          }
        : emptyForm
    );
    setError("");
  }, [open, task]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignee: form.assignee,
      };

      if (editing) {
        await apiRequest(`/tasks/${task.id}`, {
          method: "PATCH",
          body: payload,
        });
        toast("Tarea actualizada");
      } else {
        await apiRequest("/tasks", { method: "POST", body: payload });
        toast("Tarea creada");
      }

      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la tarea.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar tarea" : "Nueva tarea"}
      description={
        editing
          ? "Ajusta los detalles de esta tarea de casa."
          : "Añade algo que haya que resolver en casa."
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            <Save className="h-4 w-4" />
            {editing ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? <FormError>{error}</FormError> : null}

        <Field label="Título" htmlFor="task-title">
          <Input
            id="task-title"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Ej. Cambiar las bombillas del salón"
            maxLength={160}
            autoFocus
            required
          />
        </Field>

        <Field
          label="Descripción"
          htmlFor="task-description"
          hint="Opcional. Añade contexto para que quede claro."
        >
          <Textarea
            id="task-description"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Qué hay que hacer, dónde, alguna referencia..."
            maxLength={2000}
          />
        </Field>

        <Field label="Asignada a" htmlFor="task-assignee">
          <Select
            id="task-assignee"
            value={form.assignee}
            onChange={(event) => update("assignee", event.target.value)}
          >
            <option value="ALEX">Alex</option>
            <option value="SANDRA">Sandra</option>
            <option value="BOTH">Ambos</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
