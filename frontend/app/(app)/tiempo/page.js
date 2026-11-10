"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock3,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { WeatherIcon } from "@/components/weather-icon";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import {
  WEATHER_DEFAULT_CITIES,
  formatRain,
  formatTemperature,
  formatWind,
  getTomorrowForecast,
  normalizeWeatherName,
  providerLabel,
  weatherDateLabel,
  weatherDayLabel,
  weatherHourLabel,
  weatherTone,
  weatherUpdatedLabel,
} from "@/lib/weather";
import { cn } from "@/lib/utils";

const QUICK_CITIES = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza"];

function isDefaultCity(name) {
  const normalized = normalizeWeatherName(name);
  return WEATHER_DEFAULT_CITIES.some(
    (city) => normalizeWeatherName(city.name) === normalized
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-sand-100 bg-white/80 px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-ink-900">{value}</p>
    </div>
  );
}

function DefaultCityCard({
  city,
  data,
  loading,
  error,
  active,
  onSelect,
  onRetry,
}) {
  const current = data?.current;
  const tomorrow = getTomorrowForecast(data);
  const tone = weatherTone(tomorrow?.condition || current?.condition);

  return (
    <Card
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "group cursor-pointer overflow-hidden p-0 text-left transition",
        active
          ? "border-sage-300 ring-2 ring-sage-300/80 shadow-lift"
          : "hover:-translate-y-0.5 hover:border-sand-300 hover:shadow-lift"
      )}
    >
      <div className={cn("bg-gradient-to-br p-5", tone.gradient)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
              <h2 className="truncate font-display text-xl text-ink-950">
                {city.name}
              </h2>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              {city.note} · {city.province}
            </p>
            {tomorrow ? (
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="sky">Mañana</Badge>
                <span className="text-[11px] font-semibold text-ink-500">
                  {weatherDateLabel(tomorrow.date)}
                </span>
              </div>
            ) : null}
          </div>

          {data ? (
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                tone.icon
              )}
            >
              <WeatherIcon
                condition={tomorrow?.condition || current?.condition}
                isDay
                className="h-8 w-8"
              />
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-5 space-y-2">
            <div className="skeleton h-11 w-28" />
            <div className="skeleton h-4 w-44" />
            <div className="skeleton h-4 w-32" />
          </div>
        ) : error && !data ? (
          <div className="mt-5 rounded-2xl border border-white/80 bg-white/70 p-3">
            <p className="text-xs leading-5 text-ink-500">{error}</p>
            <Button
              variant="soft"
              size="sm"
              className="mt-2"
              onClick={(event) => {
                event.stopPropagation();
                onRetry();
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : tomorrow ? (
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                Máx
              </p>
              <p className="font-display text-5xl leading-none text-ink-950">
                {formatTemperature(tomorrow.max)}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-800">
                {tomorrow.description}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Sensación máx {formatTemperature(tomorrow.feelsMax)}
              </p>
              <p className="mt-1 text-[11px] text-ink-400">
                Ahora {formatTemperature(current?.temperature)}
              </p>
            </div>

            <div className="shrink-0 space-y-1.5 text-right text-xs text-ink-600">
              <p className="font-semibold">
                Mín {formatTemperature(tomorrow.min)}
              </p>
              <p className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 font-semibold text-sky-700">
                <Droplets className="h-3 w-3" />
                {formatRain(tomorrow.precipitationProbability)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-ink-400">
            No hay datos disponibles para esta ubicación.
          </p>
        )}

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            aria-label={
              active
                ? `Viendo la previsión de ${city.name}`
                : `Ver la previsión detallada de ${city.name}`
            }
            className={cn(
              "focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
              active
                ? "bg-sage-600 text-white shadow-sm"
                : "bg-white/85 text-sage-700 group-hover:bg-sage-50"
            )}
          >
            {active ? (
              <>
                <Check className="h-3 w-3" />
                Viendo detalle
              </>
            ) : (
              <>
                Ver detalle
                <ChevronRight className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}

function HourlyStrip({ hours }) {
  if (!hours.length) {
    return (
      <p className="mt-3 rounded-2xl bg-sand-50 p-4 text-sm text-ink-400">
        La previsión por horas no está disponible.
      </p>
    );
  }

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
      {hours.map((hour) => (
        <div
          key={hour.time}
          className="flex min-w-[72px] flex-col items-center gap-1 rounded-2xl border border-sand-100 bg-white px-2 py-3"
        >
          <span className="text-[11px] font-semibold text-ink-400">
            {weatherHourLabel(hour.time)}
          </span>
          <WeatherIcon
            condition={hour.condition}
            isDay={hour.isDay}
            className="h-5 w-5 text-sky-600"
          />
          <span className="text-sm font-bold text-ink-900">
            {formatTemperature(hour.temperature)}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-sky-700">
            <Droplets className="h-3 w-3" />
            {formatRain(hour.precipitationProbability)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DailyList({ days }) {
  if (!days.length) {
    return (
      <p className="mt-3 rounded-2xl bg-sand-50 p-4 text-sm text-ink-400">
        No hay previsión diaria disponible.
      </p>
    );
  }

  return (
    <div className="mt-3 divide-y divide-sand-100 overflow-hidden rounded-2xl border border-sand-100">
      {days.map((day, index) => (
        <div
          key={day.date}
          className="flex items-center gap-3 bg-white px-3.5 py-3"
        >
          <div className="w-[72px] shrink-0">
            <p className="text-sm font-semibold text-ink-900">
              {weatherDayLabel(day.date, index)}
            </p>
            <p className="text-[11px] text-ink-400">
              {weatherDateLabel(day.date)}
            </p>
          </div>

          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              weatherTone(day.condition).icon
            )}
          >
            <WeatherIcon
              condition={day.condition}
              className="h-4 w-4"
            />
          </span>

          <p className="min-w-0 flex-1 truncate text-xs text-ink-500 sm:text-sm">
            {day.description}
          </p>

          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-sky-700">
            <Droplets className="h-3 w-3" />
            {formatRain(day.precipitationProbability)}
          </span>

          <p className="w-[84px] shrink-0 text-right text-sm">
            <span className="font-bold text-ink-900">
              {formatTemperature(day.max)}
            </span>{" "}
            <span className="text-ink-400">{formatTemperature(day.min)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-5 space-y-3">
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-28 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}

export default function WeatherPage() {
  const { toast } = useToast();
  const [defaults, setDefaults] = useState({});
  const [defaultErrors, setDefaultErrors] = useState({});
  const [defaultLoading, setDefaultLoading] = useState(() =>
    Object.fromEntries(WEATHER_DEFAULT_CITIES.map((city) => [city.name, true]))
  );
  const [selectedName, setSelectedName] = useState("Madrid");
  const [customDetail, setCustomDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef(null);
  const detailRequestRef = useRef(0);
  const didReadQueryRef = useRef(false);

  const loadDefaultCity = useCallback(async (name) => {
    setDefaultLoading((current) => ({ ...current, [name]: true }));
    setDefaultErrors((current) => ({ ...current, [name]: "" }));

    try {
      const data = await apiRequest(
        `/weather?city=${encodeURIComponent(name)}`
      );
      setDefaults((current) => ({ ...current, [name]: data }));
    } catch (error) {
      setDefaultErrors((current) => ({
        ...current,
        [name]:
          error.message || "No se pudo cargar el tiempo de esta ubicación.",
      }));
    } finally {
      setDefaultLoading((current) => ({ ...current, [name]: false }));
    }
  }, []);

  const loadDefaults = useCallback(async () => {
    setDefaultLoading(
      Object.fromEntries(WEATHER_DEFAULT_CITIES.map((city) => [city.name, true]))
    );

    await Promise.all(
      WEATHER_DEFAULT_CITIES.map((city) => loadDefaultCity(city.name))
    );
  }, [loadDefaultCity]);

  const loadDetail = useCallback(async (name) => {
    const requestId = ++detailRequestRef.current;
    setDetailLoading(true);
    setDetailError("");

    try {
      const data = await apiRequest(
        `/weather?city=${encodeURIComponent(name)}`
      );

      if (requestId !== detailRequestRef.current) return;

      setCustomDetail(data);
      setSelectedName(data.location.name);
    } catch (error) {
      if (requestId !== detailRequestRef.current) return;
      setDetailError(
        error.message || "No se pudo cargar la previsión de esta ubicación."
      );
      throw error;
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  }, []);

  const scrollToDetail = useCallback(() => {
    document
      .getElementById("detalle-tiempo")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openCityByName = useCallback(
    async (name, { scroll = true } = {}) => {
      const term = String(name || "").trim();
      if (!term) return;

      setQuery("");
      setSearchOpen(false);
      setSuggestions([]);

      if (isDefaultCity(term)) {
        const city = WEATHER_DEFAULT_CITIES.find(
          (item) =>
            normalizeWeatherName(item.name) === normalizeWeatherName(term)
        );

        detailRequestRef.current += 1;
        setSelectedName(city.name);
        setCustomDetail(null);
        setDetailError("");
        setDetailLoading(false);

        if (!defaults[city.name] && !defaultLoading[city.name]) {
          loadDefaultCity(city.name);
        }

        if (scroll) scrollToDetail();
        return;
      }

      setSelectedName(term);
      setCustomDetail(null);

      if (scroll) scrollToDetail();

      try {
        await loadDetail(term);
      } catch (error) {
        toast(
          error.status === 404
            ? `No encontramos «${term}». Prueba con otro municipio.`
            : error.message || "No se pudo consultar el tiempo.",
          "error"
        );
      }
    },
    [
      defaults,
      defaultLoading,
      loadDefaultCity,
      loadDetail,
      scrollToDetail,
      toast,
    ]
  );

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  useEffect(() => {
    if (didReadQueryRef.current) return;
    didReadQueryRef.current = true;

    const city = new URLSearchParams(window.location.search).get("city");
    if (city) {
      openCityByName(city, { scroll: false });
    } else {
      loadDetail("Madrid").catch(() => {});
    }
  }, [openCityByName, loadDetail]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    let active = true;
    setSearching(true);
    setSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const data = await apiRequest(
          `/weather/search?q=${encodeURIComponent(term)}`
        );
        if (!active) return;
        setSuggestions(data.results || []);
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const handlePointer = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [searchOpen]);

  async function handleSearchSubmit(event) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    await openCityByName(term);
  }

  async function refreshAll() {
    setRefreshing(true);

    try {
      await loadDefaults();

      if (!isDefaultCity(selectedName)) {
        await loadDetail(selectedName).catch(() => {});
      }
    } finally {
      setRefreshing(false);
    }
  }

  const selectedIsDefault = isDefaultCity(selectedName);
  const selectedMeta =
    WEATHER_DEFAULT_CITIES.find(
      (city) =>
        normalizeWeatherName(city.name) === normalizeWeatherName(selectedName)
    ) ||
    customDetail?.location || { name: selectedName, province: "" };

  const activeData = defaults[selectedMeta.name] || customDetail;
  const activeError = activeData
    ? ""
    : selectedIsDefault
      ? defaultErrors[selectedMeta.name] || ""
      : detailError;
  const activeLoading = activeData
    ? false
    : selectedIsDefault
      ? defaultLoading[selectedMeta.name]
      : detailLoading;

  const current = activeData?.current;
  const today = activeData?.today;
  const currentTone = weatherTone(current?.condition);
  const providerText = activeData
    ? activeData.fallback
      ? "Open-Meteo (respaldo)"
      : providerLabel(activeData.provider)
    : "Consultando datos...";

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="El cielo sobre casa"
        title="El Tiempo"
        description="Mañana en Arganda del Rey y Rivas-Vaciamadrid, con el detalle de Madrid o de la ciudad que elijas."
        action={
          <Button
            variant="secondary"
            onClick={refreshAll}
            loading={refreshing}
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <Card className="relative z-20 mb-5 p-4 sm:p-5">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div ref={searchRef} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setSearchOpen(true);
              }}
              placeholder="Busca otro municipio o ciudad de España..."
              aria-label="Buscar otra ubicación"
              className="pl-10 pr-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setSearchOpen(false);
                }}
                aria-label="Limpiar búsqueda"
                className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-300 transition hover:bg-sand-100 hover:text-ink-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}

            {searchOpen && query.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-lift">
                {searching ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando ubicaciones...
                  </div>
                ) : suggestions.length ? (
                  suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.name}-${suggestion.province}`}
                      type="button"
                      onClick={() => openCityByName(suggestion.name)}
                      className="focus-ring flex w-full items-center justify-between gap-3 border-b border-sand-100 px-4 py-2.5 text-left transition last:border-0 hover:bg-sand-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-800">
                          {suggestion.name}
                        </span>
                        <span className="block truncate text-[11px] text-ink-400">
                          {suggestion.province || "España"}
                        </span>
                      </span>
                      <MapPin className="h-4 w-4 shrink-0 text-ink-300" />
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-ink-400">
                    Sin sugerencias. Pulsa Consultar para buscar igualmente.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="secondary"
            disabled={query.trim().length < 2}
          >
            Consultar
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-ink-400">
            Rápido:
          </span>
          {QUICK_CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => openCityByName(city)}
              className="focus-ring rounded-full border border-sand-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink-600 transition hover:border-sage-300 hover:bg-sage-50 hover:text-sage-800"
            >
              {city}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {WEATHER_DEFAULT_CITIES.map((city) => (
          <DefaultCityCard
            key={city.name}
            city={city}
            data={defaults[city.name]}
            loading={defaultLoading[city.name] && !defaults[city.name]}
            error={defaultErrors[city.name]}
            active={
              normalizeWeatherName(selectedName) ===
              normalizeWeatherName(city.name)
            }
            onSelect={() => openCityByName(city.name)}
            onRetry={() => loadDefaultCity(city.name)}
          />
        ))}
      </div>

      <Card
        id="detalle-tiempo"
        className="mt-5 scroll-mt-24 p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sage-600">
              Previsión detallada
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink-950">
              {selectedMeta.name}
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              {selectedMeta.province ? `${selectedMeta.province} · ` : ""}
              {providerText}
            </p>
          </div>

          {activeData ? (
            <Badge tone="sky">
              Actualizado {weatherUpdatedLabel(activeData.updatedAt)}
            </Badge>
          ) : null}
        </div>

        {activeLoading ? (
          <DetailSkeleton />
        ) : activeError ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center">
            <span className="rounded-2xl bg-red-100 p-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </span>
            <p className="text-sm text-ink-500">{activeError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openCityByName(selectedName)}
            >
              Reintentar
            </Button>
          </div>
        ) : !activeData ? (
          <EmptyState
            icon={CloudSun}
            title="Elige una ubicación"
            description="Busca un municipio o toca una de las tarjetas de Arganda y Rivas para ver su previsión."
            className="mt-5"
          />
        ) : (
          <>
            <div
              className={cn(
                "mt-5 flex flex-col gap-4 rounded-2xl border border-sand-100 bg-gradient-to-br p-4 sm:flex-row sm:items-center sm:justify-between",
                currentTone.gradient
              )}
            >
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
                    currentTone.icon
                  )}
                >
                  <WeatherIcon
                    condition={current?.condition}
                    isDay={current?.isDay}
                    className="h-9 w-9"
                  />
                </span>
                <div>
                  <p className="font-display text-5xl leading-none text-ink-950">
                    {formatTemperature(current?.temperature)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-800">
                    {current?.description}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Sensación {formatTemperature(current?.apparentTemperature)}{" "}
                    · {current?.isDay ? "Día" : "Noche"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
                <Metric
                  icon={Thermometer}
                  label="Máx / Mín"
                  value={`${formatTemperature(today?.max)} / ${formatTemperature(
                    today?.min
                  )}`}
                />
                <Metric
                  icon={Droplets}
                  label="Lluvia"
                  value={formatRain(today?.precipitationProbability)}
                />
                <Metric
                  icon={Wind}
                  label="Viento"
                  value={formatWind(
                    current?.windSpeed,
                    current?.windDirection
                  )}
                />
                <Metric
                  icon={Droplets}
                  label="Humedad"
                  value={
                    current?.humidity === null ||
                    current?.humidity === undefined
                      ? "—"
                      : `${Math.round(Number(current.humidity))}%`
                  }
                />
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-ink-400" />
                <h3 className="font-display text-lg text-ink-950">
                  Próximas horas
                </h3>
              </div>
              <HourlyStrip hours={activeData.hourly || []} />
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2">
                <CloudSun className="h-4 w-4 text-ink-400" />
                <h3 className="font-display text-lg text-ink-950">
                  Próximos días
                </h3>
              </div>
              <DailyList days={activeData.daily || []} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-400">
              <span className="inline-flex items-center gap-1">
                <Sunrise className="h-3.5 w-3.5" />
                Amanece {today?.sunrise || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Sunset className="h-3.5 w-3.5" />
                Anochece {today?.sunset || "—"}
              </span>
              <span>Datos: {providerLabel(activeData.provider)}</span>
            </div>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-[11px] leading-5 text-ink-400">
        Datos meteorológicos de{" "}
        <a
          href="https://www.aemet.es"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-sage-700 hover:text-sage-900"
        >
          AEMET
        </a>{" "}
        (© AEMET) y{" "}
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-sage-700 hover:text-sage-900"
        >
          Open-Meteo
        </a>
        . Previsiones orientativas.
      </p>
    </div>
  );
}
