import type { ReactNode } from "react";
import { Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "./NumberField";
import { fmt, type Issue, type MoldingParams, type NumericParamKey } from "@/lib/molding";

interface ParameterPanelProps {
  params: MoldingParams;
  update: <K extends keyof MoldingParams>(key: K, value: MoldingParams[K]) => void;
  reset: () => void;
  issues: Issue[];
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border px-5 py-5 first:border-t-0">
      <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm text-foreground">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input bg-card px-2.5 py-1.5 shadow-soft">
      <span className="text-sm text-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-muted-foreground">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0"
        />
      </span>
    </label>
  );
}

export function ParameterPanel({ params: p, update, reset, issues }: ParameterPanelProps) {
  const err = (key: NumericParamKey) => issues.find((i) => i.field === key)?.message;
  const num = (key: NumericParamKey, label: string, extra: Partial<Parameters<typeof NumberField>[0]> = {}) => (
    <NumberField
      label={label}
      value={p[key]}
      onChange={(v) => update(key, v)}
      error={err(key)}
      {...extra}
    />
  );

  const topClear = p.topMargin - p.corniceHeight;
  const bottomClear = p.bottomMargin - p.plinthHeight;
  const marginText =
    p.topMargin === p.bottomMargin
      ? `${fmt(p.topMargin)} см отсчитываются`
      : `${fmt(p.topMargin)} см сверху и ${fmt(p.bottomMargin)} см снизу отсчитываются`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Параметры</h2>
          <p className="text-xs text-muted-foreground">Все размеры — в сантиметрах</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw /> Сбросить
        </Button>
      </div>

      <Group title="Стена">
        <div className="grid grid-cols-2 gap-3">
          {num("wallWidth", "Ширина стены")}
          {num("wallHeight", "Высота стены")}
        </div>
      </Group>

      <Group title="Отступы, плинтус и карниз">
        <div className="grid grid-cols-2 gap-3">
          {num("topMargin", "Верхний отступ")}
          {num("bottomMargin", "Нижний отступ")}
          {num("corniceHeight", "Высота карниза")}
          {num("plinthHeight", "Высота плинтуса")}
          {num("sideMargin", "Боковые отступы")}
        </div>
        <div className="mt-4 flex gap-2.5 rounded-lg bg-accent p-3 text-xs leading-relaxed text-accent-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Отступы включают плинтус и карниз: {marginText} от чистого пола и потолка до границы
            композиции.
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-clear-soft px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">Чистый зазор сверху</dt>
            <dd className={`tabular font-mono text-sm font-medium ${topClear >= 0 ? "text-clear" : "text-destructive"}`}>
              {fmt(p.topMargin)} − {fmt(p.corniceHeight)} = {fmt(topClear)} см
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-clear-soft px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">Чистый зазор снизу</dt>
            <dd className={`tabular font-mono text-sm font-medium ${bottomClear >= 0 ? "text-clear" : "text-destructive"}`}>
              {fmt(p.bottomMargin)} − {fmt(p.plinthHeight)} = {fmt(bottomClear)} см
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Сверху — от нижнего края карниза до молдинга, снизу — от верхнего края плинтуса до молдинга.
        </p>
      </Group>

      <Group title="Секции">
        <div className="grid grid-cols-2 gap-3">
          {num("sections", "Количество секций", { unit: "шт", integer: true })}
          {num("sectionGap", "Между секциями")}
        </div>
      </Group>

      <Group title="Ярусы">
        <div className="grid grid-cols-2 gap-3">
          {num("tiers", "Количество ярусов", { unit: "шт", integer: true })}
          {num("tierGap", "Между ярусами", { disabled: p.tiers <= 1 })}
          {num("lowerTierHeight", "Высота нижнего яруса", { disabled: p.tiers <= 1 })}
        </div>
      </Group>

      <Group title="Молдинги">
        <div className="grid grid-cols-2 gap-3">
          {num("outerMolding", "Ширина внешнего", { step: 0.5 })}
          {num("innerMolding", "Ширина внутреннего", { step: 0.5, disabled: !p.innerEnabled })}
        </div>
        <div className="mt-3">
          <ToggleRow
            label="Внутренний молдинг"
            checked={p.innerEnabled}
            onChange={(v) => update("innerEnabled", v)}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {num("innerGap", "Зазор внешний ↔ внутренний", { step: 0.5, disabled: !p.innerEnabled })}
        </div>
      </Group>

      <Group title="Материал">
        <div className="grid grid-cols-2 gap-3">
          {num("plankLength", "Длина планки")}
          {num("wastePercent", "Запас", { unit: "%" })}
        </div>
      </Group>

      <Group title="Вид">
        <div className="flex flex-col gap-2">
          <ColorRow label="Цвет стены" value={p.wallColor} onChange={(v) => update("wallColor", v)} />
          <ColorRow
            label="Цвет молдингов"
            value={p.moldingColor}
            onChange={(v) => update("moldingColor", v)}
          />
          <div className="mt-2">
            <ToggleRow
              label="Показывать размеры"
              checked={p.showDimensions}
              onChange={(v) => update("showDimensions", v)}
            />
            <ToggleRow label="Сетка 10 см" checked={p.showGrid} onChange={(v) => update("showGrid", v)} />
          </div>
        </div>
      </Group>
    </div>
  );
}
