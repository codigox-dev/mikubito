export const ASSIGNEE_LABELS = {
  ALEX: "Alex",
  SANDRA: "Sandra",
  BOTH: "Ambos",
};

export const ASSIGNEE_STYLES = {
  ALEX: "bg-sky-50 text-sky-700 border-sky-200",
  SANDRA: "bg-clay-50 text-clay-700 border-clay-200",
  BOTH: "bg-sage-50 text-sage-700 border-sage-200",
};

export const ENTITY_LABELS = {
  ALL: "Todo",
  TASK: "Tareas",
  FINANCE: "Finanzas",
  TRIP: "Viajes",
  SHOPPING: "Supermercado",
  MEAL: "Comidas",
  NOTE: "Notas",
};

export const ENTITY_COLORS = {
  TASK: "bg-sage-100 text-sage-700",
  FINANCE: "bg-clay-100 text-clay-700",
  TRIP: "bg-sky-100 text-sky-700",
  SHOPPING: "bg-amber-100 text-amber-700",
  MEAL: "bg-rose-100 text-rose-700",
  NOTE: "bg-violet-100 text-violet-700",
};

export const MEAL_TYPES = [
  { value: "DESAYUNO", label: "Desayuno" },
  { value: "ALMUERZO", label: "Almuerzo" },
  { value: "CENA", label: "Cena" },
];

export const MEAL_TYPE_LABELS = MEAL_TYPES.reduce((labels, meal) => {
  labels[meal.value] = meal.label;
  return labels;
}, {});

export const PURCHASE_HISTORY_PAGE_SIZE = 20;
