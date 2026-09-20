import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, Info as InfoIcon, X } from "lucide-react";

type Tone = "accent" | "blue" | "warn" | "neutral";

/** Animates a number toward `target`; respects prefers-reduced-motion. */
export function useCountUp(target: number | null | undefined, duration = 800) {
  const [value, setValue] = useState<number | null>(target == null ? null : 0);
  const from = useRef(0);
  useEffect(() => {
    if (target == null || !Number.isFinite(target)) {
      setValue(null);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    setValue((current) => current ?? origin);
    let raf = 0;
    // rAF is throttled in background tabs; make sure the final value always lands.
    const settle = window.setTimeout(() => {
      from.current = target;
      setValue(target);
    }, duration + 150);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = origin + (target - origin) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [target, duration]);
  return value;
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/** A single headline number. Skeleton while loading, "—" when genuinely unavailable. */
export function StatTile({
  label,
  value,
  format,
  sub,
  tone = "accent",
  icon,
  loading,
  progress,
  onClick,
  detail,
}: {
  label: string;
  value: number | null | undefined;
  format: (n: number) => string;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  loading?: boolean;
  progress?: number | null;
  onClick?: () => void;
  /** Longer explanation, shown in an ⓘ popover next to the label. */
  detail?: ReactNode;
}) {
  const animated = useCountUp(loading ? null : value);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`stat ${tone} ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <span className="stat-head">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-label">{label}</span>
        {detail && (
          <span className="stat-info">
            <InfoPopover title="How this is worked out">{detail}</InfoPopover>
          </span>
        )}
      </span>
      {loading ? (
        <span className="skeleton stat-skeleton" />
      ) : (
        <b className="stat-value">{animated == null || value == null ? "—" : format(animated)}</b>
      )}
      {progress != null && (
        <span className="stat-bar" aria-hidden>
          <span style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </span>
      )}
      {sub && <span className="stat-sub">{sub}</span>}
    </Tag>
  );
}

/** Small "i" button that opens a popover with the caveat / method behind a number. */
export function InfoPopover({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span className="info" ref={ref}>
      <button
        type="button"
        className="info-btn"
        aria-expanded={open}
        aria-label={title ? `About: ${title}` : "More information"}
        onClick={() => setOpen((value) => !value)}
      >
        <InfoIcon size={14} />
      </button>
      {open && (
        <span className="info-pop" role="dialog">
          {title && <b>{title}</b>}
          {children}
        </span>
      )}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  action,
  info,
  className = "",
  children,
  flush,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  info?: ReactNode;
  className?: string;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>
            <h3>
              {title}
              {info && <InfoPopover title={typeof title === "string" ? title : undefined}>{info}</InfoPopover>}
            </h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      <div className={flush ? "card-body flush" : "card-body"}>{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "on" : ""}
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="acc" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <ChevronDown size={16} />
      </summary>
      <div className="acc-body">{children}</div>
    </details>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  right,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {lede && <p>{lede}</p>}
      </div>
      {right && <div className="page-head-right">{right}</div>}
    </div>
  );
}

/** Callout used for the "what this does / doesn't claim" language. */
export function Callout({
  tone = "warn",
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`callout ${tone}`}>
      {title && <b>{title}</b>} {children}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <>
      <div className={`scrim ${open ? "open" : ""}`} onClick={onClose} aria-hidden />
      <aside
        className={`drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-label={typeof title === "string" ? title : "Details"}
      >
        <header className="drawer-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </>
  );
}

/** Several short lines inside a tile caption. */
export const Lines = ({ items }: { items: (string | null | undefined)[] }) => (
  <>
    {items.filter(Boolean).map((text, index) => (
      <span className="stat-line" key={index}>
        {text}
      </span>
    ))}
  </>
);

/** 100 thin ticks (one per year of a century); `events` of them are highlighted, evenly spaced. */
export function Strip({ events, tone }: { events: number; tone: "then" | "now" }) {
  const n = Math.max(1, Math.min(100, events));
  const hits = Array.from({ length: n }, (_, i) => Math.min(99, Math.floor(((i + 0.5) * 100) / n)));
  return (
    <div className={`strip ${tone}`} aria-hidden>
      {Array.from({ length: 100 }, (_, i) => {
        const order = hits.indexOf(i);
        return (
          <i
            key={i}
            className={order >= 0 ? "hit" : undefined}
            style={order >= 0 ? { ["--i" as string]: order } : undefined}
          />
        );
      })}
    </div>
  );
}

