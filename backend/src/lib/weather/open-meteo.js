const { createTtlCache } = require("./cache");
const {
  toNumber,
  normalizeText,
  weatherFromWmo,
  degreesToCardinal,
} = require("./shared");

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REQUEST_TIMEOUT_MS = 12000;

const geocodeCache = createTtlCache(24 * 60 * 60 * 1000, {
  max: 300,
  staleMs: 24 * 60 * 60 * 1000,
});

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo respondió con estado ${response.status}`);
  }

  return response.json();
}

function toLocation(result) {
  return {
    name: result.name,
    province: result.admin1 || "",
    country: result.country || "España",
    latitude: result.latitude,
    longitude: result.longitude,
    aemetId: null,
  };
}

async function searchLocations(query, limit = 8) {
  const key = normalizeText(query);
  if (!key) return [];

  const cacheKey = `${key}:${limit}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(limit));
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");
  url.searchParams.set("countryCode", "ES");

  const data = await fetchJson(url.toString());
  const results = (data.results || [])
    .filter(
      (result) =>
        Number.isFinite(Number(result.latitude)) &&
        Number.isFinite(Number(result.longitude))
    )
    .map(toLocation);

  geocodeCache.set(cacheKey, results);
  return results;
}

async function resolveLocation(query) {
  const results = await searchLocations(query, 1);
  return results[0] || null;
}

async function fetchForecast(location) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(",")
  );
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "weather_code",
      "is_day",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(",")
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_probability_max",
      "sunrise",
      "sunset",
    ].join(",")
  );
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("forecast_days", "5");

  const data = await fetchJson(url.toString());
  const currentRaw = data.current || {};
  const hourlyRaw = data.hourly || {};
  const dailyRaw = data.daily || {};
  const hourlyTimes = hourlyRaw.time || [];
  const currentKey = String(currentRaw.time || "").slice(0, 13);

  let currentIndex = hourlyTimes.findIndex(
    (time) => String(time).slice(0, 13) === currentKey
  );
  if (currentIndex === -1) currentIndex = 0;

  const currentWeather = weatherFromWmo(currentRaw.weather_code);
  const currentProbability = toNumber(
    hourlyRaw.precipitation_probability?.[currentIndex]
  );

  const hourly = hourlyTimes
    .slice(currentIndex, currentIndex + 12)
    .map((time, offset) => {
      const index = currentIndex + offset;
      const weather = weatherFromWmo(hourlyRaw.weather_code?.[index]);

      return {
        time,
        date: String(time).slice(0, 10),
        hour: Number(String(time).slice(11, 13)),
        temperature: toNumber(hourlyRaw.temperature_2m?.[index]),
        apparentTemperature: toNumber(
          hourlyRaw.apparent_temperature?.[index]
        ),
        condition: weather.condition,
        description: weather.description,
        isDay: hourlyRaw.is_day?.[index] === 1,
        humidity: toNumber(hourlyRaw.relative_humidity_2m?.[index]),
        windSpeed: toNumber(hourlyRaw.wind_speed_10m?.[index]),
        windDirection: degreesToCardinal(
          hourlyRaw.wind_direction_10m?.[index]
        ),
        precipitation: null,
        precipitationProbability: toNumber(
          hourlyRaw.precipitation_probability?.[index]
        ),
      };
    });

  const daily = (dailyRaw.time || []).map((date, index) => {
    const weather = weatherFromWmo(dailyRaw.weather_code?.[index]);

    return {
      date,
      max: toNumber(dailyRaw.temperature_2m_max?.[index]),
      min: toNumber(dailyRaw.temperature_2m_min?.[index]),
      feelsMax: toNumber(dailyRaw.apparent_temperature_max?.[index]),
      feelsMin: toNumber(dailyRaw.apparent_temperature_min?.[index]),
      condition: weather.condition,
      description: weather.description,
      precipitationProbability: toNumber(
        dailyRaw.precipitation_probability_max?.[index]
      ),
      windSpeed: null,
      windDirection: null,
      sunrise: String(dailyRaw.sunrise?.[index] || "").slice(11, 16) || null,
      sunset: String(dailyRaw.sunset?.[index] || "").slice(11, 16) || null,
    };
  });

  const todayDaily = daily[0] || {};

  return {
    location: {
      name: location.name,
      province: location.province || "",
      country: "España",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: "Europe/Madrid",
      aemetId: location.aemetId || null,
    },
    current: {
      time: currentRaw.time || null,
      temperature: toNumber(currentRaw.temperature_2m),
      apparentTemperature: toNumber(currentRaw.apparent_temperature),
      condition: currentWeather.condition,
      description: currentWeather.description,
      isDay: currentRaw.is_day === 1,
      humidity: toNumber(currentRaw.relative_humidity_2m),
      windSpeed: toNumber(currentRaw.wind_speed_10m),
      windDirection: degreesToCardinal(currentRaw.wind_direction_10m),
      precipitation: toNumber(currentRaw.precipitation),
      precipitationProbability:
        currentProbability ?? todayDaily.precipitationProbability ?? null,
    },
    today: {
      max: todayDaily.max ?? null,
      min: todayDaily.min ?? null,
      condition: todayDaily.condition || currentWeather.condition,
      description: todayDaily.description || currentWeather.description,
      precipitationProbability:
        todayDaily.precipitationProbability ?? null,
      sunrise: todayDaily.sunrise ?? null,
      sunset: todayDaily.sunset ?? null,
    },
    hourly,
    daily,
    provider: "open-meteo",
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  searchLocations,
  resolveLocation,
  fetchForecast,
};
