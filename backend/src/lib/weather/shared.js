function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

/** Minúsculas, sin acentos y con espacios normalizados para comparar nombres. */
function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Fecha y hora actuales en la península, independientes de la zona del servidor. */
function nowInMadrid() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

const AEMET_RAIN_WORDS = [
  "lluvia",
  "llovizna",
  "chubasco",
  "precipitacion",
  "tormenta",
];

/** Traduce las descripciones de AEMET a un código común para la UI. */
function conditionFromAemetText(text = "") {
  const value = normalizeText(text);

  if (value.includes("tormenta")) return "storm";
  if (value.includes("nieve") || value.includes("nevada")) return "snow";
  if (AEMET_RAIN_WORDS.some((word) => value.includes(word))) return "rain";
  if (
    value.includes("niebla") ||
    value.includes("bruma") ||
    value.includes("calima") ||
    value.includes("polvo")
  ) {
    return "fog";
  }
  if (value.includes("cubierto") || value.includes("muy nuboso")) return "cloudy";
  if (
    value.includes("nuboso") ||
    value.includes("nubes") ||
    value.includes("intervalos")
  ) {
    return "partly";
  }
  if (value.includes("despejado")) return "clear";

  return "partly";
}

/** Códigos WMO de Open-Meteo traducidos a descripción e icono común. */
const WMO_CONDITIONS = {
  0: ["clear", "Despejado"],
  1: ["partly", "Mayormente despejado"],
  2: ["partly", "Parcialmente nuboso"],
  3: ["cloudy", "Nublado"],
  45: ["fog", "Niebla"],
  48: ["fog", "Niebla con escarcha"],
  51: ["rain", "Llovizna ligera"],
  53: ["rain", "Llovizna moderada"],
  55: ["rain", "Llovizna intensa"],
  56: ["rain", "Llovizna helada ligera"],
  57: ["rain", "Llovizna helada intensa"],
  61: ["rain", "Lluvia ligera"],
  63: ["rain", "Lluvia moderada"],
  65: ["rain", "Lluvia intensa"],
  66: ["rain", "Lluvia helada ligera"],
  67: ["rain", "Lluvia helada intensa"],
  71: ["snow", "Nevada ligera"],
  73: ["snow", "Nevada moderada"],
  75: ["snow", "Nevada intensa"],
  77: ["snow", "Granos de nieve"],
  80: ["rain", "Chubascos ligeros"],
  81: ["rain", "Chubascos moderados"],
  82: ["rain", "Chubascos intensos"],
  85: ["snow", "Chubascos de nieve ligeros"],
  86: ["snow", "Chubascos de nieve intensos"],
  95: ["storm", "Tormenta"],
  96: ["storm", "Tormenta con granizo ligero"],
  99: ["storm", "Tormenta con granizo intenso"],
};

function weatherFromWmo(code) {
  const entry = WMO_CONDITIONS[Number(code)] || ["partly", "Variable"];
  return { condition: entry[0], description: entry[1] };
}

const CARDINAL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

function degreesToCardinal(degrees) {
  const value = toNumber(degrees);
  if (value === null) return null;
  const normalized = ((value % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINAL_DIRECTIONS[index];
}

module.exports = {
  toNumber,
  pad2,
  normalizeText,
  nowInMadrid,
  conditionFromAemetText,
  weatherFromWmo,
  degreesToCardinal,
};
