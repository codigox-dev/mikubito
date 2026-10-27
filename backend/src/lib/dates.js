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

module.exports = { getMonthRange, currentMonthKey };
