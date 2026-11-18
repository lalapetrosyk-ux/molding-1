import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CircleAlert } from "lucide-react";
import { ParameterPanel } from "@/components/molding/ParameterPanel";
import { WallVisualization } from "@/components/molding/WallVisualization";
import { ResultsPanel } from "@/components/molding/ResultsPanel";
import { useMoldingParams } from "@/hooks/use-molding-params";
import { buildFrameCorrectionOptions, computeLayout, fmt, type FrameSize, type CorrectionMode } from "@/lib/molding";

const TITLE = "Раскладка молдингов на стене — калькулятор и визуализатор";
const DESCRIPTION =
  "Рассчитайте рамки из молдинга по размерам стены: секции, ярусы, отступы с учётом плинтуса и карниза, чистые зазоры и количество планок.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { params, update, reset } = useMoldingParams();
  const [mode, setMode] = useState<CorrectionMode>("both");
  const [accepted, setAccepted] = useState<{ paramsKey: string; sizes: FrameSize[] } | null>(null);
  const paramsKey = JSON.stringify(params);
  const base = useMemo(() => computeLayout(params), [params]);
  const candidates = useMemo(() => buildFrameCorrectionOptions(params), [params]);
  const acceptedForCurrentParams = accepted?.paramsKey === paramsKey ? accepted.sizes : null;
  const preview = acceptedForCurrentParams ?? (candidates?.[mode].valid ? candidates[mode].sizes : undefined);
  const result = useMemo(() => preview ? computeLayout(params, preview) : base, [params, preview, base]);
  const issues = base.ok ? [] : base.errors;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Калькулятор · визуализатор
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              Раскладка молдингов на стене
            </h1>
          </div>
          <p className="tabular font-mono text-sm text-muted-foreground">
            {fmt(params.wallWidth)} × {fmt(params.wallHeight)} см ·{" "}
            {Number.isFinite(params.sections) ? params.sections : "—"} секц. ·{" "}
            {Number.isFinite(params.tiers) ? params.tiers : "—"} ярус.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:gap-6 lg:px-8 lg:py-6">
        <section className="canvas-dots overflow-hidden rounded-2xl border border-border p-3 shadow-panel sm:p-6">
          <WallVisualization params={params} layout={result.ok ? result.layout : null} />
          {params.showDimensions && result.ok && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-5 bg-dimension" /> размеры, см
              </span>
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-5 bg-clear" /> чистые зазоры
              </span>
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-5 bg-muted-foreground" /> карниз и плинтус
              </span>
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-panel lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <ParameterPanel params={params} update={update} reset={reset} issues={issues} />
          </aside>

          <div className="flex min-w-0 flex-col gap-5">
            {candidates && !acceptedForCurrentParams && (
              <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-soft">
                <h2 className="text-base font-semibold">Требуется корректировка пропорций</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Целевое отношение ширины к высоте: {params.tiers === 1 ? "2,5" : "1,62"}; допустимое отклонение — ±0,005.
                  Исходные размеры стены, отступы и другие параметры не меняются. Выберите вариант — предварительный просмотр появится выше.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {([["width", "Изменить только ширину рамок"], ["height", "Изменить только высоту рамок"], ["both", "Изменить ширину и высоту одновременно"]] as const).map(([key, label]) => {
                    const option = candidates[key];
                    return (
                      <button key={key} type="button" disabled={!option.valid} aria-pressed={mode === key}
                        onClick={() => setMode(key)}
                        className={`rounded-xl border p-3 text-left text-sm ${mode === key ? "border-primary bg-accent" : "border-border"} disabled:cursor-not-allowed disabled:opacity-50`}>
                        <span className="font-medium">{label}</span>
                        {option.valid ? (
                          <span className="mt-2 block font-mono text-xs text-muted-foreground">
                            {option.sizes.map(v => <span key={v.tier} className="block">Ярус {v.tier + 1}: {fmt(v.width)} × {fmt(v.height)} см</span>)}
                          </span>
                        ) : (
                          <span className="mt-2 block text-xs text-destructive">{option.error || "Вариант не помещается в доступную область."}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!Object.values(candidates).some(option => option.valid) && (
                  <p className="mt-3 text-sm text-destructive">Ни один вариант не проходит проверку. Исправьте указанные ошибки геометрии или увеличьте доступную область; исходные параметры автоматически не изменялись.</p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Новые размеры будут приняты только после вашего подтверждения.</p>
                  <button type="button" disabled={!candidates[mode].valid}
                    onClick={() => setAccepted({ paramsKey, sizes: candidates[mode].sizes })}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">Подтвердить геометрию</button>
                </div>
              </section>
            )}
            {candidates && acceptedForCurrentParams && (
              <div className="rounded-xl border border-primary/30 bg-card p-4 text-sm">
                Геометрия подтверждена. Расчёт материалов и размеры ниже обновлены по выбранному варианту.
                <button type="button" className="ml-2 underline" onClick={() => setAccepted(null)}>Изменить вариант</button>
              </div>
            )}
            {!result.ok && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-card p-5 shadow-soft"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <CircleAlert className="size-4" /> Раскладку нельзя построить
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {result.errors.map((e) => (
                    <li key={e.message}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.ok && result.warnings.length > 0 && (
              <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
                <ul className="space-y-1.5 text-sm text-foreground">
                  {result.warnings.map((w) => (
                    <li key={w.message} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.ok && (
              <ResultsPanel layout={result.layout} materials={result.materials} params={params} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
