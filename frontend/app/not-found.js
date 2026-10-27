import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-7xl text-sage-700">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-ink-900">
          Esta página no existe
        </h1>
        <p className="mt-2 text-ink-500">
          Puede que el enlace haya cambiado o que la página ya no esté disponible.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
