const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value, { compact = false } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return (compact ? compactCurrencyFormatter : currencyFormatter).format(amount);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthOffset(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(monthKey) {
  if (!monthKey) return "—";
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthShort(monthKey) {
  if (!monthKey) return "—";
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatTripDates(startDate, endDate) {
  if (!startDate && !endDate) return "Fechas por definir";
  if (startDate && !endDate) return `Desde ${formatShortDate(startDate)}`;
  if (!startDate && endDate) return `Hasta ${formatShortDate(endDate)}`;
  return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
}

export function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const abs = Math.abs(seconds);

  if (abs < 45) return "ahora mismo";
  if (abs < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  if (abs < 604800) return formatter.format(Math.round(seconds / 86400), "day");
  return formatDate(value);
}

/* Fechas de calendario (YYYY-MM-DD) tratadas siempre en hora local. */

export function parseDateOnlyLocal(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISODateLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysISO(value, days) {
  const date = parseDateOnlyLocal(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toISODateLocal(date);
}

/** Lunes de la semana a la que pertenece `value` (por defecto, hoy). */
export function startOfWeekISO(value = todayInputValue()) {
  const date = parseDateOnlyLocal(value);
  if (!date) return value;

  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toISODateLocal(date);
}

export function isSameWeekISO(value, reference = todayInputValue()) {
  return startOfWeekISO(value) === startOfWeekISO(reference);
}

export function formatWeekdayShort(value) {
  const date = parseDateOnlyLocal(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("es-ES", { weekday: "short" })
    .format(date)
    .replace(".", "");
}

export function formatDayNumber(value) {
  const date = parseDateOnlyLocal(value);
  if (!date) return "";
  return String(date.getDate());
}

export function formatLongDateISO(value) {
  const date = parseDateOnlyLocal(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatWeekRange(startValue, endValue) {
  const start = parseDateOnlyLocal(startValue);
  const end = parseDateOnlyLocal(endValue);
  if (!start || !end) return "";

  const monthShort = new Intl.DateTimeFormat("es-ES", { month: "short" });
  const startMonth = monthShort.format(start).replace(".", "");
  const endMonth = monthShort.format(end).replace(".", "");
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  return `${start.getDate()} ${startMonth} ${start.getFullYear()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function percent(part, total) {
  const numerator = Number(part);
  const denominator = Number(total);
  if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return 0;
  }
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
}
