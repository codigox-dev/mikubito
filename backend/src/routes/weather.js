const { Router } = require("express");
const { z } = require("zod");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { config } = require("../config/env");
const aemet = require("../lib/weather/aemet");
const openMeteo = require("../lib/weather/open-meteo");
const { createTtlCache } = require("../lib/weather/cache");
const { normalizeText } = require("../lib/weather/shared");

const router = Router();

router.use(requireAuth);

const cacheMinutes = Math.max(
  5,
  Number(config.weather.cacheMinutes) || 20
);
const forecastCache = createTtlCache(cacheMinutes * 60 * 1000, {
  max: 300,
  staleMs: 3 * 60 * 60 * 1000,
});

const DEFAULT_LOCATIONS = new Map(
  [
    {
      aliases: ["arganda", "arganda del rey"],
      location: {
        name: "Arganda del Rey",
        province: "Madrid",
        country: "España",
        latitude: 40.30073423,
        longitude: -3.43911167,
        aemetId: "28014",
      },
    },
    {
      aliases: ["rivas", "rivas vaciamadrid", "rivas-vaciamadrid"],
      location: {
        name: "Rivas-Vaciamadrid",
        province: "Madrid",
        country: "España",
        latitude: 40.32801264,
        longitude: -3.51609802,
        aemetId: "28123",
      },
    },
  ].flatMap(({ aliases, location }) =>
    aliases.map((alias) => [normalizeText(alias), location])
  )
);

const citySchema = z
  .string()
  .trim()
  .min(2, "Indica al menos dos caracteres")
  .max(80, "El nombre de la ubicación es demasiado largo");

const querySchema = z
  .object({
    city: citySchema.optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    name: z.string().trim().max(80).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.city) ||
      (data.lat !== undefined && data.lon !== undefined),
    { message: "Indica una ciudad o un par de coordenadas" }
  );

const searchSchema = z.object({
  q: citySchema,
});

function aemetEnabled() {
  return (
    Boolean(config.weather.aemetApiKey) &&
    config.weather.provider !== "open-meteo"
  );
}

async function resolveLocation(city) {
  const preset = DEFAULT_LOCATIONS.get(normalizeText(city));
  if (preset) return preset;

  let location = null;

  if (aemetEnabled()) {
    try {
      location = await aemet.resolveMunicipality(city);
    } catch {
      location = null;
    }
  }

  if (!location) {
    try {
      location = await openMeteo.resolveLocation(city);
    } catch {
      throw new AppError(
        "No se pudo buscar la ubicación en este momento. Inténtalo de nuevo.",
        502
      );
    }
  }

  if (!location) {
    throw new AppError(
      `No encontramos «${city}». Prueba con otro municipio o ciudad.`,
      404
    );
  }

  return location;
}

async function fetchForecast(location) {
  if (aemetEnabled() && location.aemetId) {
    try {
      const forecast = await aemet.fetchForecast(location);
      return { ...forecast, fallback: false };
    } catch {
      const fallback = await openMeteo.fetchForecast(location);
      return { ...fallback, fallback: true };
    }
  }

  const forecast = await openMeteo.fetchForecast(location);
  return { ...forecast, fallback: false };
}

function cacheKeyFor(location) {
  if (aemetEnabled() && location.aemetId) {
    return `aemet:${location.aemetId}`;
  }

  return `open-meteo:${Number(location.latitude).toFixed(
    3
  )},${Number(location.longitude).toFixed(3)}`;
}

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q } = parse(
      searchSchema,
      req.query,
      "La búsqueda no es válida"
    );

    let results = [];
    let provider = "open-meteo";

    if (aemetEnabled()) {
      try {
        results = await aemet.searchMunicipalities(q, 8);
        if (results.length) provider = "aemet";
      } catch {
        results = [];
      }
    }

    if (!results.length) {
      try {
        results = await openMeteo.searchLocations(q, 8);
      } catch {
        throw new AppError(
          "No se pudo buscar la ubicación en este momento. Inténtalo de nuevo.",
          502
        );
      }
      provider = "open-meteo";
    }

    res.set("Cache-Control", "private, max-age=300");
    res.json({ query: q, results, provider });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parse(
      querySchema,
      req.query,
      "La ubicación solicitada no es válida"
    );

    let location;

    if (query.city) {
      location = await resolveLocation(query.city);
    } else {
      location = {
        name: query.name || "Ubicación",
        province: "",
        country: "España",
        latitude: query.lat,
        longitude: query.lon,
        aemetId: null,
      };
    }

    const cacheKey = cacheKeyFor(location);
    const cached = forecastCache.get(cacheKey);

    if (cached) {
      res.set("Cache-Control", "private, max-age=60");
      res.json({ ...cached, cached: true });
      return;
    }

    try {
      const forecast = await fetchForecast(location);
      forecastCache.set(cacheKey, forecast);
      res.set("Cache-Control", "private, max-age=60");
      res.json({ ...forecast, cached: false });
    } catch {
      const stale = forecastCache.getStale(cacheKey);

      if (stale) {
        res.set("Cache-Control", "private, max-age=60");
        res.json({ ...stale, cached: true, stale: true });
        return;
      }

      throw new AppError(
        "No se pudo consultar el tiempo en este momento. Inténtalo de nuevo en unos minutos.",
        502
      );
    }
  })
);

module.exports = router;
