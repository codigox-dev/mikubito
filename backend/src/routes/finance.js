const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { ACTIONS } = require("../lib/activity-actions");
const { recordActivity } = require("../lib/audit");
const { getMonthRange } = require("../lib/dates");
const {
  roundMoney,
  serializeBudget,
  serializeExpense,
  userSummarySelect,
} = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const expenseInclude = {
  paidBy: userSummarySelect,
  createdBy: userSummarySelect,
};

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El mes debe tener el formato YYYY-MM");

const budgetSchema = z.object({
  month: monthSchema,
  amount: z.coerce
    .number()
    .positive("El presupuesto debe ser mayor que cero")
    .max(99999999),
});

const createExpenseSchema = z.object({
  concept: z.string().trim().min(1, "El concepto es obligatorio").max(160),
  amount: z.coerce
    .number()
    .positive("El importe debe ser mayor que cero")
    .max(99999999),
  paidById: z.string().min(1, "Selecciona quién ha pagado"),
  date: z.coerce.date(),
  category: z.string().trim().max(60).optional().default("General"),
});

const updateExpenseSchema = z
  .object({
    concept: z.string().trim().min(1).max(160).optional(),
    amount: z.coerce.number().positive().max(99999999).optional(),
    paidById: z.string().min(1).optional(),
    date: z.coerce.date().optional(),
    category: z.string().trim().max(60).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios que guardar",
  });

async function assertUserExists(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new AppError("El usuario seleccionado no existe", 422);
  }

  return user;
}

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const month = getMonthRange(req.query.month);

    const [budget, expenses] = await Promise.all([
      prisma.monthlyBudget.findUnique({
        where: { year_month: { year: month.year, month: month.month } },
        include: { createdBy: userSummarySelect },
      }),
      prisma.expense.findMany({
        where: { date: { gte: month.start, lt: month.end } },
        include: expenseInclude,
        orderBy: { date: "desc" },
      }),
    ]);

    const expensesTotal = roundMoney(
      expenses.reduce((total, expense) => total + Number(expense.amount), 0)
    );
    const budgetAmount = budget ? roundMoney(budget.amount) : null;
    const remaining = budgetAmount === null ? null : roundMoney(budgetAmount - expensesTotal);

    const byUserMap = new Map();

    for (const expense of expenses) {
      const current = byUserMap.get(expense.paidBy.id) || {
        userId: expense.paidBy.id,
        name: expense.paidBy.name,
        total: 0,
        count: 0,
      };

      current.total = roundMoney(current.total + Number(expense.amount));
      current.count += 1;
      byUserMap.set(expense.paidBy.id, current);
    }

    res.json({
      month: month.key,
      budget: serializeBudget(budget),
      expensesTotal,
      remaining,
      expenseCount: expenses.length,
      byUser: Array.from(byUserMap.values()).sort((a, b) => b.total - a.total),
      expenses: expenses.map(serializeExpense),
    });
  })
);

router.put(
  "/budget",
  asyncHandler(async (req, res) => {
    const data = parse(budgetSchema, req.body, "Revisa el presupuesto");
    const month = getMonthRange(data.month);

    const budget = await prisma.$transaction(async (tx) => {
      const saved = await tx.monthlyBudget.upsert({
        where: { year_month: { year: month.year, month: month.month } },
        update: { amount: data.amount },
        create: {
          year: month.year,
          month: month.month,
          amount: data.amount,
          createdById: req.user.id,
        },
        include: { createdBy: userSummarySelect },
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.BUDGET_SET,
        entityType: "FINANCE",
        entityId: saved.id,
        description: `${req.user.name} fijó el presupuesto de ${month.label} en ${roundMoney(
          saved.amount
        ).toFixed(2)} €`,
        metadata: { month: month.key, amount: roundMoney(saved.amount) },
      });

      return saved;
    });

    res.json({ budget: serializeBudget(budget) });
  })
);

router.post(
  "/expenses",
  asyncHandler(async (req, res) => {
    const data = parse(createExpenseSchema, req.body, "Revisa los datos del gasto");
    const paidBy = await assertUserExists(data.paidById);

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          concept: data.concept,
          amount: data.amount,
          paidById: data.paidById,
          date: data.date,
          category: data.category || "General",
          createdById: req.user.id,
        },
        include: expenseInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.EXPENSE_CREATED,
        entityType: "FINANCE",
        entityId: created.id,
        description: `${req.user.name} registró el gasto «${created.concept}» pagado por ${paidBy.name}`,
        metadata: {
          concept: created.concept,
          amount: roundMoney(created.amount),
          paidById: paidBy.id,
        },
      });

      return created;
    });

    res.status(201).json({ expense: serializeExpense(expense) });
  })
);

router.patch(
  "/expenses/:id",
  asyncHandler(async (req, res) => {
    const data = parse(updateExpenseSchema, req.body, "Revisa los datos del gasto");
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw new AppError("El gasto no existe", 404);
    }

    if (data.paidById) {
      await assertUserExists(data.paidById);
    }

    const updateData = {};

    if (data.concept !== undefined) updateData.concept = data.concept;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.paidById !== undefined) updateData.paidById = data.paidById;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.category !== undefined) updateData.category = data.category;

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: updateData,
        include: expenseInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.EXPENSE_UPDATED,
        entityType: "FINANCE",
        entityId: updated.id,
        description: `${req.user.name} editó el gasto «${updated.concept}»`,
        metadata: {
          concept: updated.concept,
          amount: roundMoney(updated.amount),
        },
      });

      return updated;
    });

    res.json({ expense: serializeExpense(expense) });
  })
);

router.delete(
  "/expenses/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: expenseInclude,
    });

    if (!existing) {
      throw new AppError("El gasto no existe", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id: existing.id } });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.EXPENSE_DELETED,
        entityType: "FINANCE",
        entityId: existing.id,
        description: `${req.user.name} eliminó el gasto «${existing.concept}»`,
        metadata: {
          concept: existing.concept,
          amount: roundMoney(existing.amount),
        },
      });
    });

    res.status(204).end();
  })
);

module.exports = router;
