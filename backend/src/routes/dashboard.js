const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { asyncHandler } = require("../lib/async-handler");
const { getMonthRange } = require("../lib/dates");
const { requireAuth } = require("../middleware/auth");
const {
  roundMoney,
  serializeActivity,
  serializeShoppingList,
  serializeTask,
  serializeTrip,
  userSummarySelect,
} = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = getMonthRange(req.query.month);

    const [
      openTaskCount,
      openTasks,
      budget,
      expenses,
      activeList,
      latestTrip,
      recentActivity,
    ] = await Promise.all([
      prisma.task.count({ where: { status: "OPEN" } }),
      prisma.task.findMany({
        where: { status: "OPEN" },
        include: {
          createdBy: userSummarySelect,
          closedBy: userSummarySelect,
        },
        orderBy: [
          { dueDate: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 5,
      }),
      prisma.monthlyBudget.findUnique({
        where: { year_month: { year: month.year, month: month.month } },
        include: { createdBy: userSummarySelect },
      }),
      prisma.expense.findMany({
        where: { date: { gte: month.start, lt: month.end } },
        select: { amount: true },
      }),
      prisma.shoppingList.findFirst({
        where: { status: "ACTIVE" },
        include: {
          createdBy: userSummarySelect,
          closedBy: userSummarySelect,
          items: {
            include: { addedBy: userSummarySelect },
            orderBy: [{ purchased: "asc" }, { createdAt: "desc" }],
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.trip.findFirst({
        include: {
          createdBy: userSummarySelect,
          expenses: {
            include: { createdBy: userSummarySelect },
            orderBy: { date: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findMany({
        include: { user: userSummarySelect },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const monthlyExpenseTotal = roundMoney(
      expenses.reduce((total, expense) => total + Number(expense.amount), 0)
    );
    const monthlyBudget = budget ? roundMoney(budget.amount) : null;
    const remainingBudget =
      monthlyBudget === null ? null : roundMoney(monthlyBudget - monthlyExpenseTotal);

    res.json({
      month: month.key,
      stats: {
        openTasks: openTaskCount,
        pendingItems: activeList ? serializeShoppingList(activeList).pendingCount : 0,
        monthlyExpenseTotal,
        monthlyBudget,
        remainingBudget,
        activeListName: activeList?.name || null,
        tripsCount: await prisma.trip.count(),
      },
      openTasks: openTasks.map(serializeTask),
      activeList: activeList ? serializeShoppingList(activeList) : null,
      latestTrip: latestTrip ? serializeTrip(latestTrip) : null,
      recentActivity: recentActivity.map(serializeActivity),
    });
  })
);

module.exports = router;



