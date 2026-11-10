const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { ACTIONS } = require("../lib/activity-actions");
const { recordActivity } = require("../lib/audit");
const { parseDateOnly, formatDateLabel } = require("../lib/dates");
const { serializeMeal, userSummarySelect } = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const mealInclude = {
  createdBy: userSummarySelect,
};

const MEAL_PHRASES = {
  DESAYUNO: "el desayuno",
  ALMUERZO: "el almuerzo",
  CENA: "la cena",
};

const MAX_RANGE_DAYS = 62;

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato YYYY-MM-DD")
  .refine((value) => parseDateOnly(value) !== null, "La fecha no es válida");

const rangeSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "La fecha inicial no puede ser posterior a la final",
  })
  .refine(
    (data) =>
      (parseDateOnly(data.endDate) - parseDateOnly(data.startDate)) /
        (1000 * 60 * 60 * 24) <=
      MAX_RANGE_DAYS,
    { message: `El rango no puede superar ${MAX_RANGE_DAYS} días` }
  );

const saveMealSchema = z.object({
  date: dateSchema,
  mealType: z.enum(["DESAYUNO", "ALMUERZO", "CENA"], {
    message: "La comida debe ser desayuno, almuerzo o cena",
  }),
  title: z
    .string()
    .trim()
    .min(1, "El título del plato es obligatorio")
    .max(160, "El título no puede superar 160 caracteres"),
  notes: z
    .string()
    .trim()
    .max(1000, "Las notas no pueden superar 1000 caracteres")
    .optional()
    .nullable(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = parse(
      rangeSchema,
      req.query,
      "El rango de fechas no es válido"
    );

    const meals = await prisma.mealPlan.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: mealInclude,
      orderBy: [{ date: "asc" }, { mealType: "asc" }],
    });

    res.set("Cache-Control", "no-store");
    res.json({
      range: { startDate, endDate },
      meals: meals.map(serializeMeal),
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(saveMealSchema, req.body, "Revisa los datos de la comida");

    const existing = await prisma.mealPlan.findUnique({
      where: { date_mealType: { date: data.date, mealType: data.mealType } },
    });

    const meal = await prisma.$transaction(async (tx) => {
      const saved = await tx.mealPlan.upsert({
        where: { date_mealType: { date: data.date, mealType: data.mealType } },
        update: {
          title: data.title,
          notes: data.notes || null,
        },
        create: {
          date: data.date,
          mealType: data.mealType,
          title: data.title,
          notes: data.notes || null,
          createdById: req.user.id,
        },
        include: mealInclude,
      });

      const mealPhrase = MEAL_PHRASES[saved.mealType];
      const dateLabel = formatDateLabel(saved.date);

      await recordActivity({
        tx,
        userId: req.user.id,
        action: existing ? ACTIONS.MEAL_UPDATED : ACTIONS.MEAL_CREATED,
        entityType: "MEAL",
        entityId: saved.id,
        description: existing
          ? `${req.user.name} actualizó ${mealPhrase} del ${dateLabel}: «${saved.title}»`
          : `${req.user.name} planificó ${mealPhrase} del ${dateLabel}: «${saved.title}»`,
        metadata: {
          date: saved.date,
          mealType: saved.mealType,
          title: saved.title,
        },
      });

      return saved;
    });

    res.status(existing ? 200 : 201).json({ meal: serializeMeal(meal) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.mealPlan.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError("La comida no existe", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.mealPlan.delete({ where: { id: existing.id } });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.MEAL_DELETED,
        entityType: "MEAL",
        entityId: existing.id,
        description: `${req.user.name} quitó ${MEAL_PHRASES[existing.mealType]} del ${formatDateLabel(existing.date)}: «${existing.title}»`,
        metadata: {
          date: existing.date,
          mealType: existing.mealType,
          title: existing.title,
        },
      });
    });

    res.status(204).end();
  })
);

module.exports = router;
