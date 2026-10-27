const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { ACTIONS } = require("../lib/activity-actions");
const { recordActivity } = require("../lib/audit");
const {
  serializeTask,
  userSummarySelect,
} = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const taskInclude = {
  createdBy: userSummarySelect,
  closedBy: userSummarySelect,
};

const assigneeSchema = z.enum(["ALEX", "SANDRA", "BOTH"]);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  assignee: assigneeSchema.optional().default("BOTH"),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    assignee: assigneeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios que guardar",
  });

const listQuerySchema = z.object({
  status: z.enum(["all", "open", "closed"]).optional().default("all"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = parse(listQuerySchema, req.query);

    const tasks = await prisma.task.findMany({
      where: status === "all" ? {} : { status: status === "open" ? "OPEN" : "CLOSED" },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    res.json({ tasks: tasks.map(serializeTask) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    if (!task) {
      throw new AppError("La tarea no existe", 404);
    }

    res.json({ task: serializeTask(task) });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(createTaskSchema, req.body, "Revisa los datos de la tarea");

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: data.title,
          description: data.description || null,
          assignee: data.assignee,
          createdById: req.user.id,
        },
        include: taskInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TASK_CREATED,
        entityType: "TASK",
        entityId: created.id,
        description: `${req.user.name} creó la tarea «${created.title}»`,
        metadata: { assignee: created.assignee, title: created.title },
      });

      return created;
    });

    res.status(201).json({ task: serializeTask(task) });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parse(updateTaskSchema, req.body, "Revisa los datos de la tarea");

    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw new AppError("La tarea no existe", 404);
    }

    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.assignee !== undefined) updateData.assignee = data.assignee;

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: updateData,
        include: taskInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TASK_UPDATED,
        entityType: "TASK",
        entityId: updated.id,
        description: `${req.user.name} editó la tarea «${updated.title}»`,
        metadata: { title: updated.title, assignee: updated.assignee },
      });

      return updated;
    });

    res.json({ task: serializeTask(task) });
  })
);

router.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    if (!existing) {
      throw new AppError("La tarea no existe", 404);
    }

    if (existing.status === "CLOSED") {
      return res.json({ task: serializeTask(existing) });
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: {
          status: "CLOSED",
          closedById: req.user.id,
          closedAt: new Date(),
        },
        include: taskInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TASK_CLOSED,
        entityType: "TASK",
        entityId: updated.id,
        description: `${req.user.name} cerró la tarea «${updated.title}»`,
        metadata: { title: updated.title },
      });

      return updated;
    });

    res.json({ task: serializeTask(task) });
  })
);

router.post(
  "/:id/reopen",
  asyncHandler(async (req, res) => {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    if (!existing) {
      throw new AppError("La tarea no existe", 404);
    }

    if (existing.status === "OPEN") {
      return res.json({ task: serializeTask(existing) });
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: {
          status: "OPEN",
          closedById: null,
          closedAt: null,
        },
        include: taskInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TASK_REOPENED,
        entityType: "TASK",
        entityId: updated.id,
        description: `${req.user.name} reabrió la tarea «${updated.title}»`,
        metadata: { title: updated.title },
      });

      return updated;
    });

    res.json({ task: serializeTask(task) });
  })
);

module.exports = router;
