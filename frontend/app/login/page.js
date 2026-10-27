"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  Mail,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  Button,
  Checkbox,
  Field,
  FormError,
  Input,
  LoadingScreen,
} from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingScreen label="Comprobando tu sesión..." />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password, remember });
      router.replace("/dashboard");
    } catch (loginError) {
      setError(loginError.message || "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Lado editorial */}
      <section className="relative hidden overflow-hidden bg-ink-950 px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div className="surface-grid absolute inset-0 opacity-60" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-sage-600/25 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-clay-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sage-100 ring-1 ring-white/15 backdrop-blur">
            <span className="font-display text-2xl leading-none">c</span>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-clay-400" />
          </span>
          <div>
            <p className="font-display text-2xl leading-none">cubito</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Nuestro hogar
            </p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sage-300">
            <Home className="h-3.5 w-3.5" />
            Un espacio para dos
          </p>
          <h1 className="font-display text-5xl leading-[1.08] tracking-tight text-balance xl:text-6xl">
            Menos ruido.
            <br />
            Más vida en común.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/55">
            Las tareas, las cuentas, los viajes y la compra del súper. Todo en un
            mismo sitio, sin perder detalle de quién hizo qué.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-sage-400/15 p-2 text-sage-200">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Tareas
                </span>
              </div>
              <p className="mt-5 text-sm font-semibold text-white/90">
                Cambiar las bombillas
              </p>
              <p className="mt-1 text-xs text-white/40">Asignada a ambos</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-clay-400/15 p-2 text-clay-200">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Viaje
                </span>
              </div>
              <p className="mt-5 text-sm font-semibold text-white/90">
                Albania
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-clay-300" />
              </div>
              <p className="mt-2 text-xs text-white/40">68 % del presupuesto</p>
            </div>

            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
              <span className="rounded-xl bg-sky-400/15 p-2 text-sky-200">
                <ShoppingBasket className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">
                  Lista de la semana
                </p>
                <p className="text-xs text-white/40">8 productos · 5 comprados</p>
              </div>
              <span className="rounded-full bg-sage-400/15 px-2.5 py-1 text-[10px] font-bold text-sage-200">
                EN CURSO
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[11px] text-white/35">
          <span>Privado para Alex y Sandra</span>
          <span className="flex items-center gap-1.5">
            <LockKeyhole className="h-3 w-3" />
            Acceso cifrado
          </span>
        </div>
      </section>

      {/* Formulario */}
      <section className="flex min-h-screen flex-col bg-sand-50 px-5 py-6 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-sage-100">
              <span className="font-display text-lg leading-none">c</span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-sand-50 bg-clay-400" />
            </span>
            <span className="font-display text-xl text-ink-950">cubito</span>
          </div>
          <span className="rounded-full border border-sand-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
            Privado
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <div className="animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage-600">
              Bienvenido a casa
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-ink-950">
              Hola de nuevo
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-500">
              Entra para ver cómo va la casa. Solo Alex y Sandra tienen acceso.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error ? <FormError>{error}</FormError> : null}

              <Field label="Email" htmlFor="email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </Field>

              <Field label="Contraseña" htmlFor="password">
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="px-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-300 transition hover:bg-sand-100 hover:text-ink-600"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <div className="flex items-start justify-between gap-3">
                <Checkbox
                  id="remember"
                  label="Recordarme en este dispositivo"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span className="text-[11px] leading-5 text-ink-300">
                  No guardamos tu contraseña
                </span>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={submitting}
              >
                Entrar en casa
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>

            <div className="mt-8 flex items-center gap-3 text-[11px] text-ink-300">
              <span className="h-px flex-1 bg-sand-200" />
              <span className="flex items-center gap-1.5">
                <LockKeyhole className="h-3 w-3" />
                Sesión protegida con JWT
              </span>
              <span className="h-px flex-1 bg-sand-200" />
            </div>
          </div>
        </div>

        <p className="mx-auto w-full max-w-[420px] text-center text-[11px] text-ink-300">
          Cubito · Un pequeño espacio para organizar la vida en común.
        </p>
      </section>
    </main>
  );
}
