import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string | undefined;
  step?: number | undefined;
  integer?: boolean | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
}

const parse = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (t === "" || t === "-" || t === ".") return Number.NaN;
  return /^-?\d*\.?\d*$/.test(t) ? Number(t) : Number.NaN;
};

const show = (n: number) => (Number.isFinite(n) ? String(n).replace(".", ",") : "");

export function NumberField({
  label,
  value,
  onChange,
  unit = "см",
  step = 1,
  integer,
  disabled,
  error,
  hint,
}: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(show(value));

  // Синхронизация при внешнем изменении (например, сброс к значениям по умолчанию)
  useEffect(() => {
    const current = parse(text);
    if (!(Number.isNaN(current) && Number.isNaN(value)) && current !== value) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (s: string) => {
    setText(s);
    onChange(parse(s));
  };

  const nudge = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    const next = Math.round((base + dir * step) * 100) / 100;
    commit(show(next));
  };

  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "opacity-50")}>
      <label htmlFor={id} className="text-xs font-medium leading-tight text-muted-foreground">
        {label}
      </label>
      <div
        className={cn(
          "flex h-9 items-center rounded-md border bg-card shadow-soft transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
          error ? "border-destructive" : "border-input",
        )}
      >
        <input
          id={id}
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          disabled={disabled}
          value={text}
          aria-invalid={!!error}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              nudge(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              nudge(-1);
            }
          }}
          className="tabular h-full w-full min-w-0 bg-transparent px-2.5 font-mono text-sm text-foreground outline-none disabled:cursor-not-allowed"
        />
        {unit && <span className="pr-2.5 text-xs text-muted-foreground">{unit}</span>}
      </div>
      {error ? (
        <p className="text-xs leading-snug text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
