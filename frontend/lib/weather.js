import { parseDateOnlyLocal } from "./format";

export const WEATHER_DEFAULT_CITIES = [
  {
    name: "Arganda del Rey",
    province: "Madrid",
    note: "Donde trabaja Sandra",
    tone: "sky",
  },
  {
    name: "Rivas-Vaciamadrid",
    province: "Madrid",
    note: "Vuestra zona",
    tone: "sage",
  },
];

export const WEATHER_TONES = {
  clear: {
    icon: "bg-amber-100 text-amber-700",
    gradient: "from-amber-50/80 via-white to-white",
  },
  partly: {
    icon: "bg-sky-100 text-sky-700",
    gradient: "from-sky-50/80 via-white to-white",
  },
  cloudy: {
    icon: "bg-sand-200 text-ink-600",
    gradient: "from-sand-100/80 via-white to-white",
  },
  rain: {
    icon: "bg-sky-100 text-sky-700",
    gradient: "from-sky-50/80 via-white to-white",
  },
  storm: {
    icon: "bg-violet-100 text-violet-700",
    gradient: "from-violet-50/80 via-white to-white",
  },
  snow: {
    icon: "bg-sky-50 text-sky-600",
    gradient: "from-sky-50/80 via-white to-white",
  },
  fog: {
    icon: "bg-sand-200 text-ink-500",
    gradient: "from-sand-100/80 via-white to-white",
  },
};

export function weatherTone(condition) {
  return WEATHER_TONES[condition] || WEATHER_TONES.partly;
}

/** La previsión de mañana; si faltara, usa el primer día disponible. */
export function getTomorrowForecast(data) {
  const daily = data?.daily || [];
  return daily[1] || daily[0] || null;
}

export function normalizeWeatherName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatTemperature(value) {
  const number = toFiniteNumber(value);
  if (number === null) return "—";
  return `${Math.round(number)}°`;
}

export function formatRain(value) {
  const number = toFiniteNumber(value);
  if (number === null) return "—";
  return `${Math.round(number)}%`;
}

export function formatWind(speed, direction) {
  const number = toFiniteNumber(speed);
  if (number === null) return "—";
  return `${Math.round(number)} km/h${direction ? ` ${direction}` : ""}`;
}

export function weatherHourLabel(value) {
  if (!value) return "—";
  if (value.includes("T")) return value.slice(11, 16);
  return value.slice(0, 5);
}

export function weatherDayLabel(date, index) {
  if (index === 0) return "Hoy";
  if (index === 1) return "Mañana";

  const parsed = parseDateOnlyLocal(date);
  if (!parsed) return "—";

  const label = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
  }).format(parsed);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weatherDateLabel(date) {
  const parsed = parseDateOnlyLocal(date);
  if (!parsed) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  })
    .format(parsed)
    .replace(".", "");
}

export function weatherUpdatedLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function providerLabel(provider) {
  return provider === "aemet" ? "AEMET" : "Open-Meteo";
}
