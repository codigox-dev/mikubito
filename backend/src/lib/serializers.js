const userSummary = {
  id: true,
  name: true,
  email: true,
};

const userSummarySelect = {
  select: userSummary,
};

function roundMoney(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function serializeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignee: task.assignee,
    status: task.status,
    closedAt: task.closedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    createdBy: serializeUser(task.createdBy),
    closedBy: serializeUser(task.closedBy),
  };
}

function serializeExpense(expense) {
  return {
    id: expense.id,
    concept: expense.concept,
    amount: roundMoney(expense.amount),
    date: expense.date,
    category: expense.category,
    paidBy: serializeUser(expense.paidBy),
    createdBy: serializeUser(expense.createdBy),
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

function serializeBudget(budget) {
  if (!budget) return null;

  return {
    id: budget.id,
    year: budget.year,
    month: budget.month,
    amount: roundMoney(budget.amount),
    createdBy: serializeUser(budget.createdBy),
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

function serializeTripExpense(expense) {
  return {
    id: expense.id,
    concept: expense.concept,
    amount: roundMoney(expense.amount),
    date: expense.date,
    createdBy: serializeUser(expense.createdBy),
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

function serializeTrip(trip) {
  const expenses = (trip.expenses || []).map(serializeTripExpense);
  const totalSpent = roundMoney(
    expenses.reduce((total, expense) => total + expense.amount, 0)
  );

  return {
    id: trip.id,
    name: trip.name,
    totalBudget: roundMoney(trip.totalBudget),
    totalSpent,
    remaining: roundMoney(Number(trip.totalBudget) - totalSpent),
    expenseCount: expenses.length,
    startDate: trip.startDate,
    endDate: trip.endDate,
    notes: trip.notes,
    createdBy: serializeUser(trip.createdBy),
    expenses,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

function serializeShoppingItem(item) {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    purchased: item.purchased,
    purchasedAt: item.purchasedAt,
    addedBy: serializeUser(item.addedBy),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeShoppingList(list) {
  const items = (list.items || []).map(serializeShoppingItem);
  const purchasedCount = items.filter((item) => item.purchased).length;

  return {
    id: list.id,
    name: list.name,
    status: list.status,
    closedAt: list.closedAt,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    createdBy: serializeUser(list.createdBy),
    closedBy: serializeUser(list.closedBy),
    items,
    itemCount: items.length,
    purchasedCount,
    pendingCount: items.length - purchasedCount,
  };
}

function serializeActivity(activity) {
  return {
    id: activity.id,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    description: activity.description,
    metadata: activity.metadata,
    user: serializeUser(activity.user),
    createdAt: activity.createdAt,
  };
}

module.exports = {
  userSummary,
  userSummarySelect,
  roundMoney,
  serializeUser,
  serializeTask,
  serializeExpense,
  serializeBudget,
  serializeTrip,
  serializeShoppingItem,
  serializeShoppingList,
  serializeActivity,
};
