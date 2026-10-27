"use client";

import {
  useEffect,
  useId,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Botones y controles                                                       */
/* -------------------------------------------------------------------------- */

const buttonVariants = {
  primary:
    "bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950",
  secondary:
    "border border-sand-200 bg-white text-ink-800 shadow-sm hover:border-sand-300 hover:bg-sand-50",
  ghost: "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  soft: "bg-sage-100 text-sage-800 hover:bg-sage-200",
};

const buttonSizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading = false,
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 transition hover:bg-sand-100 hover:text-ink-800 disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const controlClasses =
  "w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-300 focus:border-sage-400 focus:ring-4 focus:ring-sage-100 disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-ink-400";

export function Input({ className, ...props }) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(controlClasses, "min-h-[104px] resize-y", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(controlClasses, "appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold text-ink-700"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, id, ...props }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm text-ink-600",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-sand-300 text-sage-600 accent-sage-600 focus:ring-sage-400"
        {...props}
      />
      {label}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Superficies y datos                                                       */
/* -------------------------------------------------------------------------- */

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

const badgeTones = {
  sage: "border-sage-200 bg-sage-50 text-sage-700",
  clay: "border-clay-200 bg-clay-50 text-clay-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  sand: "border-sand-200 bg-sand-100 text-ink-600",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  ink: "border-ink-200 bg-ink-50 text-ink-700",
};

export function Badge({ children, tone = "sand", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const avatarTones = {
  sky: "bg-sky-100 text-sky-700",
  clay: "bg-clay-100 text-clay-700",
  sage: "bg-sage-100 text-sage-700",
  sand: "bg-sand-200 text-ink-700",
  ink: "bg-ink-900 text-white",
};

export function Avatar({ name = "?", size = "md", tone, className }) {
  const resolvedTone =
    tone || (name.toLowerCase().startsWith("alex") ? "sky" : name.toLowerCase().startsWith("sandra") ? "clay" : "sage");
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        avatarTones[resolvedTone],
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value = 0, tone = "sage", className }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const tones = {
    sage: "bg-sage-500",
    clay: "bg-clay-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-sand-200/80", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones[tone])}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "sage",
  className,
}) {
  const tones = {
    sage: "bg-sage-100 text-sage-700",
    clay: "bg-clay-100 text-clay-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    ink: "bg-ink-100 text-ink-700",
  };

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon ? (
          <span className={cn("rounded-xl p-2", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </Card>
  );
}

export function PageHeader({ eyebrow, title, description, action, className }) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-sage-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl leading-tight tracking-tight text-ink-950 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-sand-300 bg-sand-50/50 px-6 py-12 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="mb-3 rounded-2xl bg-white p-3 text-ink-300 shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <p className="font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-6 text-ink-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modales                                                                   */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizes = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[3px]"
        aria-hidden="true"
        onMouseDown={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-sand-200 bg-white shadow-lift animate-slide-up sm:rounded-3xl",
          sizes[size]
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sand-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl text-ink-950 sm:text-2xl"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-5 text-ink-400">{description}</p>
            ) : null}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="-mr-1 mt-0.5">
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="sticky bottom-0 border-t border-sand-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            tone === "danger"
              ? "bg-red-100 text-red-600"
              : "bg-sage-100 text-sage-700"
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="pt-1 text-sm leading-6 text-ink-500">{description}</p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Estados de carga                                                          */
/* -------------------------------------------------------------------------- */

export function Spinner({ className }) {
  return (
    <Loader2
      className={cn("h-5 w-5 animate-spin text-sage-600", className)}
      aria-hidden="true"
    />
  );
}

export function LoadingBlock({ rows = 3, className }) {
  return (
    <div className={cn("space-y-3", className)} aria-label="Cargando contenido">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full" />
      ))}
    </div>
  );
}

export function LoadingScreen({ label = "Preparando tu espacio..." }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sand-50">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 shadow-lift">
        <span className="font-display text-2xl text-sage-100">c</span>
        <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-clay-400" />
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Spinner className="h-4 w-4" />
        {label}
      </div>
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
      {children}
    </div>
  );
}
