const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { ACTIONS } = require("../lib/activity-actions");
const { recordActivity } = require("../lib/audit");
const { serializeNote, userSummarySelect } = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const noteInclude = {
  createdBy: userSummarySelect,
};

const createNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "La nota no puede estar vacía")
    .max(2000, "La nota no puede superar 2000 caracteres"),
});

const EXCERPT_LENGTH = 80;

/** Fragmento de una nota para descripciones y metadatos de auditoría. */
function excerpt(content) {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (singleLine.length <= EXCERPT_LENGTH) return singleLine;
  return `${singleLine.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notes = await prisma.quickNote.findMany({
      include: noteInclude,
      orderBy: { createdAt: "desc" },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      notes: notes.map(serializeNote),
      total: notes.length,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(createNoteSchema, req.body, "Revisa la nota");

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.quickNote.create({
        data: {
          content: data.content,
          createdById: req.user.id,
        },
        include: noteInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.NOTE_CREATED,
        entityType: "NOTE",
        entityId: created.id,
        description: `${req.user.name} añadió una nota rápida: «${excerpt(created.content)}»`,
        metadata: {
          excerpt: excerpt(created.content),
          length: created.content.length,
        },
      });

      return created;
    });

    res.status(201).json({ note: serializeNote(note) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.quickNote.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError("La nota no existe", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.quickNote.delete({ where: { id: existing.id } });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.NOTE_DELETED,
        entityType: "NOTE",
        entityId: existing.id,
        description: `${req.user.name} eliminó una nota rápida: «${excerpt(existing.content)}»`,
        metadata: {
          excerpt: excerpt(existing.content),
          length: existing.content.length,
        },
      });
    });

    res.status(204).end();
  })
);

module.exports = router;
