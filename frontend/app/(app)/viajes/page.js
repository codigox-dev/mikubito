"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  MapPin,
  Plane,
  Plus,
} from "lucide-react";
import { TripModal } from "@/components/trip-modal";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  ProgressBar,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import {
  formatCurrency,
  formatTripDates,
  percent,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/trips");
      setTrips(data.trips);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los viajes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Escapadas y aventuras"
        title="Viajes"
        description="Un presupuesto propio para cada viaje y todos sus gastos fijos en un lugar."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo viaje
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="skeleton h-72 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="rounded-2xl bg-red-50 p-3 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-500">{error}</p>
          <Button onClick={load}>Reintentar</Button>
        </Card>
      ) : trips.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={Plane}
            title="Todavía no hay viajes"
            description="Crea un viaje con su presupuesto y ve registrando los gastos a medida que los hagáis."
            action={
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Crear el primer viaje
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {trips.map((trip) => {
            const progress = percent(trip.totalSpent, trip.totalBudget);
            const over = trip.remaining < 0;

            return (
              <Link
                key={trip.id}
                href={`/viajes/${trip.id}`}
                className="focus-ring card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-sage-200 hover:shadow-lift sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-2xl text-ink-950">
                      {trip.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatTripDates(trip.startDate, trip.endDate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                    {trip.expenseCount}{" "}
                    {trip.expenseCount === 1 ? "gasto" : "gastos"}
                  </span>
                </div>

                {trip.notes ? (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink-500">
                    {trip.notes}
                  </p>
                ) : null}

                <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-sand-50/80 p-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Presupuesto
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink-900">
                      {formatCurrency(trip.totalBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Gastado
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink-900">
                      {formatCurrency(trip.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Restante
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-bold",
                        over ? "text-red-600" : "text-sage-700"
                      )}
                    >
                      {formatCurrency(trip.remaining)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-ink-400">
                    <span>{Math.round(progress)} % del presupuesto</span>
                    <span>{over ? "Excedido" : "En buen camino"}</span>
                  </div>
                  <ProgressBar
                    value={progress}
                    tone={over ? "red" : progress > 80 ? "amber" : "sky"}
                  />
                </div>

                <div className="mt-auto flex items-center justify-between pt-5">
                  <div className="flex items-center gap-2">
                    <Avatar name={trip.createdBy?.name} size="sm" />
                    <span className="text-[11px] text-ink-400">
                      Creado por {trip.createdBy?.name}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sage-700 transition group-hover:gap-2">
                    Ver viaje
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <TripModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        trip={null}
        onSaved={load}
      />
    </div>
  );
}
