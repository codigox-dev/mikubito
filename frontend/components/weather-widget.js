"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CloudSun, Droplets } from "lucide-react";
import { Card } from "@/components/ui";
import { WeatherIcon } from "@/components/weather-icon";
import { apiRequest } from "@/lib/api";
import {
  WEATHER_DEFAULT_CITIES,
  formatRain,
  formatTemperature,
  getTomorrowForecast,
  weatherDateLabel,
  weatherTone,
} from "@/lib/weather";
import { cn } from "@/lib/utils";

const CITY = WEATHER_DEFAULT_CITIES[0];

export function WeatherWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await apiRequest(
          `/weather?city=${encodeURIComponent(CITY.name)}`
        );
        if (!active) return;
        setData(response);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError.message || "No se pudo cargar el tiempo de Arganda."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const current = data?.current || {};
  const tomorrow = getTomorrowForecast(data);
  const tone = weatherTone(tomorrow?.condition || current.condition);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <CloudSun className="h-4 w-4" />
          </span>
          <h2 className="font-display text-xl text-ink-950">El tiempo</h2>
        </div>
        <Link
          href="/tiempo"
          className="focus-ring rounded-lg text-xs font-bold text-sage-700"
        >
          Abrir módulo
        </Link>
      </div>

      <p className="mt-1 text-xs text-ink-400">
        {CITY.name} · {CITY.note}
      </p>

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-[92px] rounded-2xl" />
          <div className="skeleton h-10 rounded-xl" />
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl bg-sand-50 p-4">
          <p className="text-sm leading-6 text-ink-500">{error}</p>
          <Link
            href="/tiempo"
            className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg text-xs font-bold text-sage-700"
          >
            Abrir El Tiempo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : tomorrow ? (
        <>
          <div
            className={cn(
              "mt-4 flex items-center gap-3 rounded-2xl border border-sand-100 bg-gradient-to-br p-3",
              tone.gradient
            )}
          >
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                tone.icon
              )}
            >
              <WeatherIcon
                condition={tomorrow.condition}
                isDay
                className="h-6 w-6"
              />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">
                Mañana · {weatherDateLabel(tomorrow.date)}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink-800">
                {tomorrow.description}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-500">
                Ahora {formatTemperature(current.temperature)} · Lluvia{" "}
                {formatRain(tomorrow.precipitationProbability)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Máx
              </p>
              <p className="font-display text-2xl leading-none text-ink-950">
                {formatTemperature(tomorrow.max)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-ink-500">
                Mín {formatTemperature(tomorrow.min)}
              </p>
            </div>
          </div>

          <Link
            href="/tiempo"
            className="focus-ring mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-xs font-bold text-sage-700 transition hover:border-sage-300 hover:bg-sage-50"
          >
            Previsión detallada
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : null}

      <p className="mt-3 text-[10px] text-ink-300">
        Datos: AEMET · Open-Meteo
      </p>
    </Card>
  );
}
