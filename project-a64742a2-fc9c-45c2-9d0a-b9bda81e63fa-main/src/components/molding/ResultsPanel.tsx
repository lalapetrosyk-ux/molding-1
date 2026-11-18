import { fmt, type Layout, type MaterialLine, type Materials, type MoldingParams } from "@/lib/molding";

function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "clear" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3.5 py-3">
      <div className="text-[11px] leading-tight text-muted-foreground">{label}</div>
      <div className={`tabular mt-1 font-mono text-lg font-medium ${tone === "clear" ? "text-clear" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card/70 p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const m = (cm: number) => `${fmt(cm / 100, 2)} м`;

function MaterialRow({ line }: { line: MaterialLine }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2.5 pr-3 text-sm text-foreground">{line.label}</td>
      <td className="tabular py-2.5 pr-3 text-right font-mono text-sm">{m(line.length)}</td>
      <td className="tabular py-2.5 pr-3 text-right font-mono text-sm text-muted-foreground">{m(line.lengthWithWaste)}</td>
      <td className="tabular py-2.5 text-right font-mono text-sm font-semibold text-foreground">{line.planks} шт</td>
    </tr>
  );
}

export function ResultsPanel({ layout, materials, params: p }: { layout: Layout; materials: Materials; params: MoldingParams }) {
  const g = layout.clearGaps;
  const tierName = (i: number, isLower: boolean) =>
    materials.tiers.length === 1 ? "Ярус" : isLower ? "Нижний ярус" : materials.tiers.length === 2 ? "Верхний ярус" : `Ярус ${i + 1}`;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Чистые зазоры">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Stat tone="clear" label="Карниз → молдинг" value={`${fmt(g.top)} см`} sub={`${fmt(p.topMargin)} − ${fmt(p.corniceHeight)} карниз`} />
          <Stat tone="clear" label="Молдинг → плинтус" value={`${fmt(g.bottom)} см`} sub={`${fmt(p.bottomMargin)} − ${fmt(p.plinthHeight)} плинтус`} />
          <Stat tone="clear" label="Угол стены → молдинг" value={`${fmt(g.side)} см`} sub="слева и справа" />
          {g.betweenSections !== null && <Stat tone="clear" label="Между секциями" value={`${fmt(g.betweenSections)} см`} />}
          {g.betweenTiers !== null && <Stat tone="clear" label="Между ярусами" value={`${fmt(g.betweenTiers)} см`} />}
          {g.outerToInner !== null && <Stat tone="clear" label="Внешний ↔ внутренний" value={`${fmt(g.outerToInner)} см`} />}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Рамки</th>
                <th className="pb-2 pr-3 text-right font-medium">Внешняя</th>
                <th className="pb-2 pr-3 text-right font-medium">Внутренняя</th>
                <th className="pb-2 text-right font-medium">Чистое поле</th>
              </tr>
            </thead>
            <tbody>
              {materials.tiers.map((t) => (
                <tr key={t.tier.index} className="border-t border-border">
                  <td className="py-2.5 pr-3 text-sm text-foreground">
                    {tierName(t.tier.index, t.tier.isLower)} <span className="text-muted-foreground">× {t.frameCount}</span>
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right font-mono text-sm">
                    {fmt(t.outerSize.width)} × {fmt(t.outerSize.height)}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right font-mono text-sm">
                    {t.innerSize ? `${fmt(t.innerSize.width)} × ${fmt(t.innerSize.height)}` : "—"}
                  </td>
                  <td className="tabular py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {fmt(t.openingSize.width)} × {fmt(t.openingSize.height)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Материал"
        aside={<span className="text-xs text-muted-foreground">планка {fmt(p.plankLength)} см · запас {fmt(p.wastePercent)} %</span>}
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Stat label="Рамок на стене" value={`${materials.framesTotal}`} sub={`${layout.frames.length} секц. × ${p.innerEnabled ? 2 : 1}`} />
          <Stat label="Молдинг для рамок" value={m(materials.wallMoldingLength)} sub="по внешнему краю, без запаса" />
          <Stat label="Планок для рамок" value={`${materials.wallMoldingPlanks} шт`} sub="с учётом запаса" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Элемент</th>
                <th className="pb-2 pr-3 text-right font-medium">Длина</th>
                <th className="pb-2 pr-3 text-right font-medium">С запасом</th>
                <th className="pb-2 text-right font-medium">Планок</th>
              </tr>
            </thead>
            <tbody>
              <MaterialRow line={materials.outer} />
              {materials.inner && <MaterialRow line={materials.inner} />}
              {materials.cornice && <MaterialRow line={materials.cornice} />}
              {materials.plinth && <MaterialRow line={materials.plinth} />}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-1 text-[11px] leading-snug text-muted-foreground">
          <p>
            Периметр одной рамки (по внешнему краю): внешняя —{" "}
            {materials.tiers.map((t) => `${fmt(t.outerPerimeter)} см`).join(" / ")}
            {p.innerEnabled && <>, внутренняя — {materials.tiers.map((t) => `${fmt(t.innerPerimeter ?? 0)} см`).join(" / ")}</>}.
          </p>
          <p>Планки = ⌈длина × (1 + запас) ÷ длина планки⌉, отдельно для каждого профиля.</p>
        </div>
      </Card>
    </div>
  );
}
