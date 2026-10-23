import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

export function Page({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <header className="flex items-end justify-between gap-3 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      {title && <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500">{title}</h2>}
      {children}
    </section>
  );
}

export function ProgressBar({ percent, tone = 'blue' }: { percent: number; tone?: 'blue' | 'emerald' | 'amber' }) {
  const color = { blue: 'bg-blue-700', emerald: 'bg-emerald-500', amber: 'bg-amber-500' }[tone];
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

const NOTICE_STYLES = {
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  error: 'bg-red-50 text-red-900 ring-red-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
};

export function Notice({ tone = 'info', children }: { tone?: keyof typeof NOTICE_STYLES; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3.5 py-3 text-sm leading-snug ring-1 ${NOTICE_STYLES[tone]}`}>
      {children}
    </div>
  );
}

export function LocalDataNotice() {
  return (
    <Notice>
      <strong>Données enregistrées uniquement sur cet appareil.</strong> Elles ne sont synchronisées avec aucun autre
      appareil ni aucun serveur. Pensez à exporter une sauvegarde régulièrement.
    </Notice>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-800 text-white active:bg-blue-900 disabled:bg-slate-300',
  secondary: 'bg-slate-100 text-slate-900 active:bg-slate-200 disabled:text-slate-400',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200 active:bg-red-100',
  ghost: 'text-blue-800 active:bg-blue-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'block min-h-12 w-full rounded-xl border-0 bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600';

/** Nombre décimal saisi avec virgule ou point ; la valeur n'est transmise que si elle est valide. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  ...rest
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: 'integer' | 'decimal' } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'min' | 'max' | 'step'
>) {
  const toText = (n: number) => String(n).replace('.', ',');
  const [text, setText] = useState(toText(value));
  useEffect(() => setText((t) => (parse(t) === value ? t : toText(value))), [value]);

  function parse(t: string): number | null {
    const normalized = t.trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
    const n = Number(normalized);
    if (step === 'integer' && !Number.isInteger(n)) return null;
    if (min !== undefined && n < min) return null;
    if (max !== undefined && n > max) return null;
    return n;
  }

  const invalid = parse(text) === null;
  return (
    <input
      {...rest}
      type="text"
      inputMode={step === 'integer' ? 'numeric' : 'decimal'}
      value={text}
      aria-invalid={invalid}
      className={`${inputClass} ${invalid ? 'ring-2 ring-red-400' : ''}`}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n !== null) onChange(n);
      }}
      onBlur={() => setText(toText(value))}
    />
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
      <span className="min-w-0">
        <span className="block text-base text-slate-900">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-xl bg-slate-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-lg px-2 text-[15px] font-semibold transition-colors ${value === o.value ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TypeBadge({ type }: { type: 'entreprise' | 'cfa' }) {
  return type === 'entreprise' ? (
    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Entreprise</span>
  ) : (
    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">CFA</span>
  );
}

export function ListLink({ href, icon, label, hint }: { href: string; icon: ReactNode; label: string; hint?: string }) {
  return (
    <a href={href} className="flex min-h-14 items-center gap-3 px-1 py-2 active:bg-slate-50">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-800">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-900">{label}</span>
        {hint && <span className="block truncate text-xs text-slate-500">{hint}</span>}
      </span>
      <span className="text-slate-300" aria-hidden>
        ›
      </span>
    </a>
  );
}
