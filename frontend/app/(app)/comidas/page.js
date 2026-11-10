"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Moon,
  Pencil,
  Plus,
  Sunrise,
  Sun,
  Trash2,
} from "lucide-react";
import { MealModal } from "@/components/meal-modal";
import { useToast } from "@/components/toast-provider";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { MEAL_TYPES } from "@/lib/constants";
import {
  addDaysISO,
  formatDayNumber,
  formatLongDateISO,
  formatWeekRange,
  formatWeekdayShort,
  parseDateOnlyLocal,
  startOfWeekISO,
  todayInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const mealIcons = {
  DESAYUNO: Sunrise,
  ALMUERZO: Sun,
  CENA: Moon,
};

const mealDeletePhrases = {
  DESAYUNO: "del desayuno",
  ALMUERZO: "del almuerzo",
  CENA: "de la cena",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function weekOffsetLabel(weekStart) {
  const currentStart = startOfWeekISO();
  const offset = Math.round(
    (parseDateOnlyLocal(weekStart) - parseDateOnlyLocal(currentStart)) / WEEK_MS
  );

  if (offset === 0) return "Semana actual";
  if (offset === -1) return "Semana anterior";
  if (offset === 1) return "Semana siguiente";
  return offset < 0 ? `Hace ${Math.abs(offset)} semanas` : `Dentro de ${offset} semanas`;
}

export default function MealsPage() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO());
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slot, setSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requestRef = useRef(0);

  const weekEnd = addDaysISO(weekStart, 6);
  const today = todayInputValue();

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        `/meals?startDate=${weekStart}&endDate=${weekEnd}`
      );
      if (requestId !== requestRef.current) return;
      setMeals(data.meals);
    } catch (loadError) {
      if (requestId !== requestRef.current) return;
      setError(loadError.message || "No se pudieron cargar las comidas.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDaysISO(weekStart, index);
        return {
          date,
          weekday: capitalize(formatWeekdayShort(date)),
          dayNumber: formatDayNumber(date),
          isToday: date === today,
        };
      }),
    [weekStart, today]
  );

  const mealsBySlot = useMemo(() => {
    const map = new Map();
    for (const meal of meals) map.set(`${meal.date}:${meal.mealType}`, meal);
    return map;
  }, [meals]);

  const currentWeek = weekStart === startOfWeekISO();

  function goToWeek(offset) {
    setWeekStart((current) => addDaysISO(current, offset * 7));
  }

  function openSlot(date, mealType, meal = null) {
    setSlot({ date, mealType, meal });
  }

  function closeSlot() {
    setSlot(null);
  }

  async function deleteMeal() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await apiRequest(`/meals/${deleteTarget.id}`, { method: "DELETE" });
      toast("Comida quitada del menú");
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      toast(deleteError.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="La semana en la mesa"
        title="Comidas"
        description="Planificad desayuno, almuerzo y cena de lunes a domingo. Los huecos vacíos pueden quedarse así."
        action={
          <Badge tone="sage" className="px-3 py-1 text-sm">
            {meals.length} {meals.length === 1 ? "comida" : "comidas"}
          </Badge>
        }
      />

      <Card className="mb-5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <IconButton
            label="Semana anterior"
            onClick={() => goToWeek(-1)}
            className="border border-sand-200 bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-bold text-ink-900 sm:text-base">
              {formatWeekRange(weekStart, weekEnd)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {weekOffsetLabel(weekStart)}
            </p>
          </div>

          <IconButton
            label="Semana siguiente"
            onClick={() => goToWeek(1)}
            className="border border-sand-200 bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1">
          <button
            type="button"
            onClick={() => goToWeek(-1)}
            className="focus-ring rounded-lg px-2 py-2 text-xs font-semibold text-ink-500 transition hover:bg-white hover:text-ink-800"
          >
            Semana anterior
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeekISO())}
            className={cn(
              "focus-ring rounded-lg px-2 py-2 text-xs font-semibold transition",
              currentWeek
                ? "bg-ink-900 text-white shadow-sm"
                : "text-ink-500 hover:bg-white hover:text-ink-800"
            )}
          >
            Semana actual
          </button>
          <button
            type="button"
            onClick={() => goToWeek(1)}
            className="focus-ring rounded-lg px-2 py-2 text-xs font-semibold text-ink-500 transition hover:bg-white hover:text-ink-800"
          >
            Semana siguiente
          </button>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Card key={index} className="p-3">
              <div className="skeleton h-8 w-16" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((__, slotIndex) => (
                  <div key={slotIndex} className="skeleton h-14 w-full" />
                ))}
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
          <Button onClick={load}>Reintentar</Button>
        </Card>
      ) : meals.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={Sunrise}
            title="Esta semana está por llenar"
            description={`Todavía no hay comidas planificadas. Toca «Añadir» en cualquier hueco del ${formatWeekRange(weekStart, weekEnd)} para empezar.`}
          />
        </Card>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((day) => (
            <Card
              key={day.date}
              className={cn(
                "flex flex-col p-3 transition",
                day.isToday && "border-sage-300 bg-sage-50/50 ring-1 ring-sage-200"
              )}
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    {day.weekday}
                  </p>
                  <p className="font-display text-xl leading-tight text-ink-950">
                    {day.dayNumber}
                  </p>
                </div>
                {day.isToday ? <Badge tone="sage">Hoy</Badge> : null}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {MEAL_TYPES.map((type) => {
                  const meal = mealsBySlot.get(`${day.date}:${type.value}`);
                  const Icon = mealIcons[type.value];

                  if (!meal) {
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => openSlot(day.date, type.value)}
                        aria-label={`Añadir ${type.label.toLowerCase()} del ${day.weekday} ${day.dayNumber}`}
                        className="focus-ring flex min-h-[58px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-sand-200 bg-sand-50/40 px-2 py-2 text-[10px] font-semibold text-ink-300 transition hover:border-sage-300 hover:bg-sage-50 hover:text-sage-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {type.label}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={type.value}
                      className="rounded-xl border border-sand-200 bg-white p-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-ink-300">
                          <Icon className="h-3 w-3" />
                          {type.label}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openSlot(day.date, type.value, meal)}
                            aria-label={`Editar ${type.label.toLowerCase()} del ${day.dayNumber}`}
                            className="focus-ring rounded-md p-1 text-ink-300 transition hover:bg-sand-100 hover:text-ink-700"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(meal)}
                            aria-label={`Quitar ${type.label.toLowerCase()} del ${day.dayNumber}`}
                            className="focus-ring rounded-md p-1 text-ink-300 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSlot(day.date, type.value, meal)}
                        className="mt-1 block w-full text-left"
                      >
                        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900">
                          {meal.title}
                        </span>
                        {meal.notes ? (
                          <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-ink-400">
                            {meal.notes}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <MealModal
        open={Boolean(slot)}
        onClose={closeSlot}
        date={slot?.date}
        mealType={slot?.mealType}
        meal={slot?.meal}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteMeal}
        loading={deleting}
        title="¿Quitar esta comida?"
        description={
          deleteTarget
            ? `Se quitará «${deleteTarget.title}» ${
                mealDeletePhrases[deleteTarget.mealType]
              } del ${formatLongDateISO(deleteTarget.date)}.`
            : ""
        }
        confirmLabel="Quitar del menú"
      />
    </div>
  );
}
