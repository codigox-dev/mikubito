"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
} from "lucide-react";

const icons = {
  clear: { day: Sun, night: Moon },
  partly: { day: CloudSun, night: CloudMoon },
  cloudy: { day: Cloud, night: Cloud },
  rain: { day: CloudRain, night: CloudRain },
  storm: { day: CloudLightning, night: CloudLightning },
  snow: { day: Snowflake, night: Snowflake },
  fog: { day: CloudFog, night: CloudFog },
};

export function WeatherIcon({
  condition = "partly",
  isDay = true,
  className = "h-5 w-5",
}) {
  const entry = icons[condition] || icons.partly;
  const Icon = entry[isDay ? "day" : "night"];

  return <Icon className={className} aria-hidden="true" />;
}
