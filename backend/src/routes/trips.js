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
  roundMoney,
  serializeTrip,
  userSummarySelect,
} = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const tripInclude = {
  createdBy: userSummarySelect,
  expenses: {
    include: { createdBy: userSummarySelect },
    orderBy: { date: "desc" },
  },
};

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.date().nullable()
);

const tripBaseSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  totalBudget: z.coerce
    .number()
    .positive("El presupuesto debe ser mayor que cero")
    .max(99999999),
  startDate: optionalDate.optional(),
  endDate: optionalDate.optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const createTripSchema = tripBaseSchema.refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: "La fecha de fin no puede ser anterior a la de inicio", path: ["endDate"] }
);

const updateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    totalBudget: z.coerce.number().positive().max(99999999).optional(),
    startDate: optionalDate.optional(),
    endDate: optionalDate.optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios que guardar",
  });

const tripExpenseSchema = z.object({
  concept: z.string().trim().min(1, "El concepto es obligatorio").max(160),
  amount: z.coerce
    .number()
    .positive("El importe debe ser mayor que cero")
    .max(99999999),
  date: z.coerce.date(),
});

const updateTripExpenseSchema = z
  .object({
    concept: z.string().trim().min(1).max(160).optional(),
    amount: z.coerce.number().positive().max(99999999).optional(),
    date: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios que guardar",
  });

async function findTripOrThrow(id) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: tripInclude,
  });

  if (!trip) {
    throw new AppError("El viaje no existe", 404);
  }

  return trip;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const trips = await prisma.trip.findMany({
      include: tripInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({ trips: trips.map(serializeTrip) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const trip = await findTripOrThrow(req.params.id);
    res.json({ trip: serializeTrip(trip) });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(createTripSchema, req.body, "Revisa los datos del viaje");

    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          name: data.name,
          totalBudget: data.totalBudget,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          notes: data.notes || null,
          createdById: req.user.id,
        },
        include: tripInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TRIP_CREATED,
        entityType: "TRIP",
        entityId: created.id,
        description: `${req.user.name} creó el viaje «${created.name}»`,
        metadata: {
          tripName: created.name,
          totalBudget: roundMoney(created.totalBudget),
        },
      });

      return created;
    });

    res.status(201).json({ trip: serializeTrip(trip) });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parse(updateTripSchema, req.body, "Revisa los datos del viaje");
    const existing = await findTripOrThrow(req.params.id);

    const startDate =
      data.startDate !== undefined ? data.startDate : existing.startDate;
    const endDate = data.endDate !== undefined ? data.endDate : existing.endDate;

    if (startDate && endDate && endDate < startDate) {
      throw new AppError(
        "La fecha de fin no puede ser anterior a la de inicio",
        422
      );
    }

    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.totalBudget !== undefined) updateData.totalBudget = data.totalBudget;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const trip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: existing.id },
        data: updateData,
        include: tripInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TRIP_UPDATED,
        entityType: "TRIP",
        entityId: updated.id,
        description: `${req.user.name} editó el viaje «${updated.name}»`,
        metadata: {
          tripName: updated.name,
          totalBudget: roundMoney(updated.totalBudget),
        },
      });

      return updated;
    });

    res.json({ trip: serializeTrip(trip) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await findTripOrThrow(req.params.id);

    await prisma.$transaction(async (tx) => {
      await tx.trip.delete({ where: { id: existing.id } });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TRIP_DELETED,
        entityType: "TRIP",
        entityId: existing.id,
        description: `${req.user.name} eliminó el viaje «${existing.name}»`,
        metadata: { tripName: existing.name },
      });
    });

    res.status(204).end();
  })
);

router.post(
  "/:id/expenses",
  asyncHandler(async (req, res) => {
    const data = parse(tripExpenseSchema, req.body, "Revisa los datos del gasto");
    const trip = await findTripOrThrow(req.params.id);

    await prisma.$transaction(async (tx) => {
      const expense = await tx.tripExpense.create({
        data: {
          tripId: trip.id,
          concept: data.concept,
          amount: data.amount,
          date: data.date,
          createdById: req.user.id,
        },
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TRIP_EXPENSE_CREATED,
        entityType: "TRIP",
        entityId: trip.id,
        description: `${req.user.name} añadió «${expense.concept}» al viaje «${trip.name}»`,
        metadata: {
          tripName: trip.name,
          concept: expense.concept,
          amount: roundMoney(expense.amount),
        },
      });
    });

    const updatedTrip = await findTripOrThrow(trip.id);
    res.status(201).json({ trip: serializeTrip(updatedTrip) });
  })
);

router.patch(
  "/:id/expenses/:expenseId",
  asyncHandler(async (req, res) => {
    const data = parse(
      updateTripExpenseSchema,
      req.body,
      "Revisa los datos del gasto"
    );
    const trip = await findTripOrThrow(req.params.id);
    const existing = await prisma.tripExpense.findFirst({
      where: { id: req.params.expenseId, tripId: trip.id },
    });

    if (!existing) {
      throw new AppError("El gasto del viaje no existe", 404);
    }

    const updateData = {};

    if (data.concept !== undefined) updateData.concept = data.concept;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = data.date;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.tripExpense.update({
        where: { id: existing.id },
        data: updateData,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TRIP_EXPENSE_UPDATED,
        entityType: "TRIP",
        entityId: trip.id,
        description: `${req.user.name} editó «${updated.concept}» en el viaje «${trip.name}»`,
        metadata: {
          tripName: trip.name,
          concept: updated.concept,
          amount: roundMoney(updated.amount),
        },
      });
    });

    const updatedTrip = await findTripOrThrow(trip.id);
    res.json({ trip: serializeTrip(updatedTrip) });
  })
);

router.delete(
  "/:id/expenses/:expenseId",
  asyncHandler(async (req, res) => {
    const trip = await findTripOrThrow(req.params.id);
    const existing = await prisma.tripExpense.findFirst({
      where: { id: req.params.expenseId, tripId: trip.id },
    });

    if (!existing) {
      throw new AppError("El gasto del viaje no existe", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.tripExpense.delete({ where: { id: existing.id } });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.TRIP_EXPENSE_DELETED,
        entityType: "TRIP",
        entityId: trip.id,
        description: `${req.user.name} eliminó «${existing.concept}» del viaje «${trip.name}»`,
        metadata: { tripName: trip.name, concept: existing.concept },
      });
    });

    res.status(204).end();
  })
);

module.exports = router;
