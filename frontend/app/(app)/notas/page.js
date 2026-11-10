"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Send,
  StickyNote,
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
  PageHeader,
  Textarea,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { formatDateTime, relativeTime } from "@/lib/format";

const MAX_LENGTH = 2000;

export default function NotesPage() {
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/notes");
      setNotes(data.notes);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar las notas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trimmed = content.trim();
  const canSave = trimmed.length > 0 && !saving;

  async function handleSubmit(event) {
    event?.preventDefault();
    if (!canSave) return;

    setSaving(true);

    try {
      const data = await apiRequest("/notes", {
        method: "POST",
        body: { content: trimmed },
      });

      setNotes((current) => [data.note, ...current]);
      setContent("");
      toast("Nota guardada");
    } catch (saveError) {
      toast(saveError.message || "No se pudo guardar la nota.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  }

  async function deleteNote() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await apiRequest(`/notes/${deleteTarget.id}`, { method: "DELETE" });
      setNotes((current) =>
        current.filter((note) => note.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      toast("Nota eliminada");
    } catch (deleteError) {
      toast(deleteError.message || "No se pudo eliminar la nota.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Ideas y recordatorios"
        title="Notas"
        description="Un tablón para lo que no puede esperar: listas sueltas, avisos o cualquier cosa que pegaréis aquí."
        action={
          <Badge tone="violet" className="px-3 py-1 text-sm">
            {notes.length} {notes.length === 1 ? "nota" : "notas"}
          </Badge>
        }
      />

      <Card className="mb-6 p-4 sm:p-5">
        <form onSubmit={handleSubmit}>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe o pega una nota rápida aquí..."
            maxLength={MAX_LENGTH}
            rows={3}
            className="min-h-[104px] resize-y border-sand-200 bg-sand-50/50 text-[15px] focus:bg-white"
            aria-label="Contenido de la nota"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-400">
              <span className="hidden sm:inline">
                Pulsa{" "}
                <kbd className="rounded border border-sand-200 bg-sand-50 px-1 py-0.5 font-sans text-[10px] font-semibold text-ink-500">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-sand-200 bg-sand-50 px-1 py-0.5 font-sans text-[10px] font-semibold text-ink-500">
                  Enter
                </kbd>{" "}
                para guardar.{" "}
              </span>
              {content.length}/{MAX_LENGTH}
            </p>

            <Button type="submit" loading={saving} disabled={!canSave}>
              <Send className="h-4 w-4" />
              Guardar nota
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="skeleton h-4 w-3/4" />
              <div className="mt-2 skeleton h-4 w-1/2" />
              <div className="mt-6 flex items-center gap-2">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="skeleton h-3 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">{error}</p>
          <Button onClick={load}>
            <Loader2 className="h-4 w-4" />
            Reintentar
          </Button>
        </Card>
      ) : notes.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={StickyNote}
            title="El tablón está vacío"
            description="Escribe la primera nota arriba. Todo lo que guardéis quedará ordenado de lo más reciente a lo más antiguo."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="group flex flex-col p-4 transition hover:border-sand-300 hover:shadow-lift"
            >
              <p className="max-h-72 flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-6 text-ink-800">
                {note.content}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-sand-100 pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={note.createdBy?.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-700">
                      {note.createdBy?.name || "Alguien"}
                    </p>
                    <p
                      className="truncate text-[11px] text-ink-400"
                      title={formatDateTime(note.createdAt)}
                    >
                      {formatDateTime(note.createdAt)} ·{" "}
                      {relativeTime(note.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(note)}
                  aria-label={`Eliminar la nota de ${
                    note.createdBy?.name || "este autor"
                  }`}
                  className="focus-ring shrink-0 rounded-lg p-2 text-ink-300 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteNote}
        loading={deleting}
        title="¿Eliminar esta nota?"
        description={
          deleteTarget
            ? `Se borrará «${deleteTarget.content
                .replace(/\s+/g, " ")
                .slice(0, 120)}${
                deleteTarget.content.length > 120 ? "…" : ""
              }» del tablón.`
            : ""
        }
        confirmLabel="Eliminar nota"
      />
    </div>
  );
}
