const { AppError } = require("./app-error");

const MONTH_LABELS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function getMonthRange(value) {
  const now = new Date();

  if (!value) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    return {
      year,
      month,
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${MONTH_LABELS[month - 1]} de ${year}`,
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);

  if (!match) {
    throw new AppError("El mes debe tener el formato YYYY-MM", 422);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${MONTH_LABELS[month - 1]} de ${year}`,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function currentMonthKey() {
  return getMonthRange().key;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte una fecha `YYYY-MM-DD` a un Date a medianoche UTC.
 * Devuelve null si el formato o el día no son válidos (p. ej. 2026-02-31).
 */
function parseDateOnly(value) {
  if (!value) return null;

  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return valid ? date : null;
}

/** Devuelve la fecha almacenada como `YYYY-MM-DD` para no arrastrar zonas horarias. */
function formatDateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

module.exports = {
  getMonthRange,
  currentMonthKey,
  parseDateOnly,
  formatDateOnly,
};
