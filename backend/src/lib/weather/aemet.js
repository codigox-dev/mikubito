const { config } = require("../../config/env");
const { createTtlCache } = require("./cache");
const {
  toNumber,
  pad2,
  normalizeText,
  nowInMadrid,
  conditionFromAemetText,
} = require("./shared");

const AEMET_BASE = "https://opendata.aemet.es/opendata/api";
const REQUEST_TIMEOUT_MS = 12000;

const municipalityCache = createTtlCache(24 * 60 * 60 * 1000, {
  max: 1,
  staleMs: 24 * 60 * 60 * 1000,
});

const PROVINCES = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

function getApiKey() {
  return config.weather.aemetApiKey;
}

function aemetRequestUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${AEMET_BASE}${path}${separator}api_key=${encodeURIComponent(
    getApiKey()
  )}`;
}

async function fetchJson(url, encoding = "utf-8") {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`AEMET respondió con estado ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const text = new TextDecoder(encoding).decode(buffer);
  return JSON.parse(text);
}

async function fetchAemet(path) {
  if (!getApiKey()) {
    throw new Error("AEMET no está configurada");
  }

  const meta = await fetchJson(aemetRequestUrl(path));

  if (meta?.estado !== 200 || !meta?.datos) {
    throw new Error("AEMET no devolvió datos disponibles");
  }

  const dataUrl = new URL(meta.datos);

  // Solo seguimos enlaces del propio dominio de AEMET.
  if (dataUrl.hostname !== "opendata.aemet.es") {
    throw new Error("AEMET devolvió un enlace de datos no permitido");
  }

  return fetchJson(dataUrl.toString(), "windows-1252");
}

function parseMunicipality(raw) {
  const oldId = String(raw.id_old || "").trim();
  const forecastId = String(raw.id || "")
    .replace(/^id/i, "")
    .trim();
  const id = /^\d{5}$/.test(forecastId) ? forecastId : oldId;
  const name = String(raw.nombre || "").trim();
  const latitude = toNumber(raw.latitud_dec);
  const longitude = toNumber(raw.longitud_dec);

  if (!/^\d{5}$/.test(id) || !name || latitude === null || longitude === null) {
    return null;
  }

  return {
    name,
    province: PROVINCES[id.slice(0, 2)] || "",
    country: "España",
    latitude,
    longitude,
    aemetId: id,
    population: toNumber(raw.num_hab) || 0,
  };
}

async function getMunicipalities() {
  const cached =
    municipalityCache.get("municipios") ||
    municipalityCache.getStale("municipios");
  if (cached) return cached;

  const raw = await fetchAemet("/maestro/municipios/");
  const list = (Array.isArray(raw) ? raw : [])
    .map(parseMunicipality)
    .filter(Boolean);

  if (!list.length) {
    throw new Error("AEMET no devolvió el listado de municipios");
  }

  municipalityCache.set("municipios", list);
  return list;
}

function toSearchResult(municipality) {
  return {
    name: municipality.name,
    province: municipality.province,
    country: municipality.country,
    latitude: municipality.latitude,
    longitude: municipality.longitude,
    aemetId: municipality.aemetId,
  };
}

async function searchMunicipalities(query, limit = 8) {
  const list = await getMunicipalities();
  const term = normalizeText(query);
  if (!term) return [];

  const matches = [];

  for (const municipality of list) {
    const name = normalizeText(municipality.name);
    let score = null;

    if (name === term) score = 0;
    else if (name.startsWith(term)) score = 1;
    else if (name.includes(term)) score = 2;
    else if (normalizeText(municipality.province).startsWith(term)) score = 3;

    if (score !== null) {
      matches.push({ municipality, score });
    }
  }

  matches.sort(
    (a, b) =>
      a.score - b.score ||
      b.municipality.population - a.municipality.population ||
      a.municipality.name.localeCompare(b.municipality.name, "es")
  );

  return matches.slice(0, limit).map(({ municipality }) =>
    toSearchResult(municipality)
  );
}

async function resolveMunicipality(query) {
  const list = await getMunicipalities();
  const term = normalizeText(query);
  if (!term) return null;

  const exact = list.find((item) => normalizeText(item.name) === term);
  if (exact) return toSearchResult(exact);

  const startsWith = list
    .filter((item) => normalizeText(item.name).startsWith(term))
    .sort((a, b) => b.population - a.population);

  if (startsWith.length) return toSearchResult(startsWith[0]);

  const includes = list
    .filter((item) => normalizeText(item.name).includes(term))
    .sort((a, b) => b.population - a.population);

  if (includes.length) return toSearchResult(includes[0]);

  return null;
}

function valueForPeriod(items, periods) {
  if (!Array.isArray(items)) return null;

  for (const period of periods) {
    const item = items.find(
      (entry) => String(entry.periodo) === period && entry.value !== ""
    );
    if (item) return item;
  }

  return items.find((entry) => entry.value !== "" || entry.descripcion) || null;
}

function pickDailyState(day) {
  const state = valueForPeriod(day.estadoCielo, [
    "12-24",
    "00-24",
    "06-12",
    "12-18",
    "18-24",
  ]);

  return {
    description: state?.descripcion || "Variable",
    condition: conditionFromAemetText(state?.descripcion || state?.value),
  };
}

function maxPrecipitationProbability(day) {
  const values = (day.probPrecipitacion || [])
    .map((entry) => toNumber(entry.value))
    .filter((value) => value !== null);

  return values.length ? Math.max(...values) : null;
}

function dailyWind(day) {
  const wind = valueForPeriod(day.viento, ["12-24", "00-24", "06-12", "12-18"]);
  if (!wind) return { speed: null, direction: null };

  return {
    speed: toNumber(wind.velocidad),
    direction: wind.direccion || null,
  };
}

function probabilityForHour(blocks, hour) {
  for (const block of blocks || []) {
    const period = String(block.periodo || "");
    if (!/^\d{4}$/.test(period)) continue;

    const start = Number(period.slice(0, 2));
    const end = Number(period.slice(2, 4));
    const matches =
      start <= end
        ? hour >= start && hour < end
        : hour >= start || hour < end;

    if (matches) {
      return toNumber(block.value);
    }
  }

  return null;
}

function hourlyWind(items, hour) {
  const period = pad2(hour);
  const entries = (items || []).filter(
    (entry) => String(entry.periodo) === period
  );
  const wind = entries.find((entry) => Array.isArray(entry.velocidad));

  if (!wind) return { speed: null, direction: null };

  return {
    speed: toNumber(wind.velocidad?.[0]),
    direction: wind.direccion?.[0] || null,
  };
}

function valueAtHour(items, hour) {
  const period = pad2(hour);
  return (
    (items || []).find(
      (entry) => String(entry.periodo).padStart(2, "0") === period
    ) || null
  );
}

function numberOfHour(items, hour) {
  const entry = valueAtHour(items, hour);
  return entry ? toNumber(entry.value) : null;
}

function parseHourlyDays(days) {
  const hours = [];

  for (const day of days || []) {
    const date = String(day.fecha || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const stateItems = day.estadoCielo || [];
    const temperatureItems = day.temperatura || [];
    const periods = new Set();

    for (const entry of [...temperatureItems, ...stateItems]) {
      const hour = Number(String(entry.periodo).slice(0, 2));
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
        periods.add(hour);
      }
    }

    for (const hour of [...periods].sort((a, b) => a - b)) {
      const temperature = numberOfHour(temperatureItems, hour);
      if (temperature === null) continue;

      const state = valueAtHour(stateItems, hour) || {};
      const description = state.descripcion || "Variable";
      const wind = hourlyWind(day.vientoAndRachaMax, hour);
      const apparentTemperature =
        numberOfHour(day.sensTermica, hour) ?? temperature;

      hours.push({
        time: `${date}T${pad2(hour)}:00`,
        date,
        hour,
        temperature,
        apparentTemperature,
        condition: conditionFromAemetText(description || state.value),
        description,
        isDay: !String(state.value || "").endsWith("n"),
        humidity: numberOfHour(day.humedadRelativa, hour),
        windSpeed: wind.speed,
        windDirection: wind.direction,
        precipitation: numberOfHour(day.precipitacion, hour),
        precipitationProbability: probabilityForHour(
          day.probPrecipitacion,
          hour
        ),
      });
    }
  }

  return hours.sort((a, b) => a.time.localeCompare(b.time));
}

function pickCurrentIndex(hours, now) {
  const exact = hours.findIndex(
    (entry) => entry.date === now.date && entry.hour === now.hour
  );
  if (exact !== -1) return exact;

  const upcoming = hours.findIndex(
    (entry) =>
      entry.date > now.date ||
      (entry.date === now.date && entry.hour > now.hour)
  );
  if (upcoming !== -1) return upcoming;

  const sameDay = hours.findIndex((entry) => entry.date === now.date);
  if (sameDay !== -1) return sameDay;

  return 0;
}

function minMax(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  if (!numbers.length) return { min: null, max: null };

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function timeValue(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.value || value.hora || null;
  return null;
}

function normalizeAemetForecast(dailyRaw, hourlyRaw, location) {
  const dailyRoot = dailyRaw?.[0] || {};
  const hourlyRoot = hourlyRaw?.[0] || {};
  const dailyDays = dailyRoot.prediccion?.dia || [];
  const hourlyDays = hourlyRoot.prediccion?.dia || [];

  const hours = parseHourlyDays(hourlyDays);
  if (!hours.length) {
    throw new Error("AEMET no devolvió previsión horaria");
  }

  const now = nowInMadrid();
  const currentIndex = pickCurrentIndex(hours, now);
  const currentEntry = hours[currentIndex];

  const daily = dailyDays.slice(0, 5).map((day) => {
    const state = pickDailyState(day);
    const wind = dailyWind(day);

    return {
      date: String(day.fecha || "").slice(0, 10),
      max: toNumber(day.temperatura?.maxima),
      min: toNumber(day.temperatura?.minima),
      feelsMax: toNumber(day.sensTermica?.maxima),
      feelsMin: toNumber(day.sensTermica?.minima),
      condition: state.condition,
      description: state.description,
      precipitationProbability: maxPrecipitationProbability(day),
      windSpeed: wind.speed,
      windDirection: wind.direction,
      sunrise: null,
      sunset: null,
    };
  });

  const todayIndex = daily.findIndex((day) => day.date === now.date);
  const todayDaily = todayIndex !== -1 ? daily[todayIndex] : daily[0] || {};
  const todayRaw =
    dailyDays.find((day) => String(day.fecha || "").slice(0, 10) === now.date) ||
    dailyDays[0];
  const todayHours = hours.filter((entry) => entry.date === now.date);
  const todayRange = minMax(todayHours.map((entry) => entry.temperature));

  const currentDay = hourlyDays.find(
    (day) => String(day.fecha || "").slice(0, 10) === now.date
  );

  const current = {
    time: currentEntry.time,
    temperature: currentEntry.temperature,
    apparentTemperature: currentEntry.apparentTemperature,
    condition: currentEntry.condition,
    description: currentEntry.description,
    isDay: currentEntry.isDay,
    humidity: currentEntry.humidity,
    windSpeed: currentEntry.windSpeed,
    windDirection: currentEntry.windDirection,
    precipitation: currentEntry.precipitation,
    precipitationProbability:
      currentEntry.precipitationProbability ??
      todayDaily.precipitationProbability ??
      null,
  };

  const today = {
    max:
      toNumber(todayRaw?.temperatura?.maxima) ??
      todayDaily.max ??
      todayRange.max,
    min:
      toNumber(todayRaw?.temperatura?.minima) ??
      todayDaily.min ??
      todayRange.min,
    condition: todayDaily.condition || current.condition,
    description: todayDaily.description || current.description,
    precipitationProbability:
      todayDaily.precipitationProbability ??
      maxPrecipitationProbability(todayRaw || {}),
    sunrise: timeValue(currentDay?.orto),
    sunset: timeValue(currentDay?.ocaso),
  };

  return {
    location: {
      name: dailyRoot.nombre || location.name,
      province: dailyRoot.provincia || location.province || "",
      country: "España",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: "Europe/Madrid",
      aemetId: location.aemetId || null,
    },
    current,
    today,
    hourly: hours.slice(currentIndex, currentIndex + 12),
    daily,
    provider: "aemet",
    updatedAt: new Date().toISOString(),
  };
}

async function fetchForecast(location) {
  const id = location.aemetId;
  if (!id) throw new Error("La ubicación no tiene identificador de AEMET");

  const [dailyRaw, hourlyRaw] = await Promise.all([
    fetchAemet(`/prediccion/especifica/municipio/diaria/${id}/`),
    fetchAemet(`/prediccion/especifica/municipio/horaria/${id}/`),
  ]);

  return normalizeAemetForecast(dailyRaw, hourlyRaw, location);
}

module.exports = {
  searchMunicipalities,
  resolveMunicipality,
  fetchForecast,
};
