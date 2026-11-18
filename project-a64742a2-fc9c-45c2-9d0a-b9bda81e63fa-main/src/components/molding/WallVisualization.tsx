import { useId, type ReactNode } from "react";
import { fmt, type Layout, type MoldingParams, type Rect } from "@/lib/molding";

type Tone = "dim" | "clear" | "muted";

interface Seg {
  a: number;
  b: number;
  label?: string;
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  dim: "text-dimension",
  clear: "text-clear",
  muted: "text-muted-foreground",
};

const SHADE = "color-mix(in oklab, var(--molding-shadow) 22%, transparent)";
const LINE = { vectorEffect: "non-scaling-stroke" as const, stroke: "currentColor" };

/** Размер шрифта, чтобы подпись поместилась в отрезок. */
function fitFont(label: string, len: number, f: number) {
  const need = label.length * 0.6 + 0.4;
  return Math.max(f * 0.62, Math.min(f, len / need));
}

/** Горизонтальная цепочка размеров на уровне y; выносные линии идут от edge. */
function HChain({ y, edge, segs, f }: { y: number; edge: number; segs: Seg[]; f: number }) {
  const t = f * 0.32;
  const xs = Array.from(new Set(segs.flatMap((s) => [s.a, s.b])));
  const dir = Math.sign(y - edge) || -1;
  return (
    <g>
      {xs.map((x) => (
        <g key={x} className="text-dimension" opacity={0.75}>
          <line x1={x} x2={x} y1={edge + dir * f * 0.3} y2={y + dir * f * 0.45} {...LINE} strokeWidth={0.6} />
          <line x1={x - t} y1={y + t} x2={x + t} y2={y - t} {...LINE} strokeWidth={1.4} />
        </g>
      ))}
      {segs.map((s, i) => {
        const tone = s.tone ?? "dim";
        const label = s.label ?? fmt(s.b - s.a);
        const fs = fitFont(label, s.b - s.a, f);
        return (
          <g key={i} className={toneClass[tone]}>
            <line x1={s.a} x2={s.b} y1={y} y2={y} {...LINE} strokeWidth={tone === "clear" ? 1.4 : 0.9} />
            <text
              x={(s.a + s.b) / 2}
              y={y - f * 0.4}
              fontSize={fs}
              textAnchor="middle"
              fill="currentColor"
              className="tabular font-mono"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Вертикальная цепочка размеров на уровне x. side — с какой стороны линии подписи. */
function VChain({
  x,
  edge,
  segs,
  f,
  side,
}: {
  x: number;
  edge: number;
  segs: Seg[];
  f: number;
  side: "left" | "right";
}) {
  const t = f * 0.32;
  const ys = Array.from(new Set(segs.flatMap((s) => [s.a, s.b])));
  const dir = Math.sign(x - edge) || -1;
  return (
    <g>
      {ys.map((y) => (
        <g key={y} className="text-dimension" opacity={0.75}>
          <line x1={edge + dir * f * 0.3} x2={x + dir * f * 0.45} y1={y} y2={y} {...LINE} strokeWidth={0.6} />
          <line x1={x - t} y1={y + t} x2={x + t} y2={y - t} {...LINE} strokeWidth={1.4} />
        </g>
      ))}
      {segs.map((s, i) => {
        const tone = s.tone ?? "dim";
        const label = s.label ?? fmt(s.b - s.a);
        const fs = fitFont(label, s.b - s.a, f);
        const tx = side === "left" ? x - f * 0.4 : x + f * 0.4;
        return (
          <g key={i} className={toneClass[tone]}>
            <line x1={x} x2={x} y1={s.a} y2={s.b} {...LINE} strokeWidth={tone === "clear" ? 1.4 : 0.9} />
            <text
              transform={`translate(${tx} ${(s.a + s.b) / 2}) rotate(-90)`}
              fontSize={fs}
              textAnchor="middle"
              dominantBaseline={side === "right" ? "hanging" : "auto"}
              fill="currentColor"
              className="tabular font-mono"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function framePath(outer: Rect, inner: Rect) {
  const r = (q: Rect) => `M${q.x} ${q.y}h${q.width}v${q.height}h${-q.width}Z`;
  return `${r(outer)} ${r(inner)}`;
}

function Molding({ outer, opening, color, filter }: { outer: Rect; opening: Rect; color: string; filter: string }) {
  const w = opening.x - outer.x;
  const mid: Rect = {
    x: outer.x + w / 2,
    y: outer.y + w / 2,
    width: outer.width - w,
    height: outer.height - w,
  };
  return (
    <g>
      <path d={framePath(outer, opening)} fill={color} fillRule="evenodd" filter={filter} />
      <rect {...mid} fill="none" stroke={SHADE} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      <path
        d={framePath(outer, opening)}
        fill="none"
        stroke={SHADE}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function Trim({ rect, color, lines, filter }: { rect: Rect; color: string; lines: number[]; filter: string }) {
  if (rect.height <= 0) return null;
  return (
    <g>
      <rect {...rect} fill={color} filter={filter} />
      {lines.map((k) => (
        <line
          key={k}
          x1={rect.x}
          x2={rect.x + rect.width}
          y1={rect.y + rect.height * k}
          y2={rect.y + rect.height * k}
          stroke={SHADE}
          strokeWidth={0.7}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <rect {...rect} fill="none" stroke={SHADE} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

interface WallVisualizationProps {
  params: MoldingParams;
  layout: Layout | null;
  overlay?: ReactNode;
}

export function WallVisualization({ params: p, layout, overlay }: WallVisualizationProps) {
  const uid = useId().replace(/:/g, "");
  const W = Number.isFinite(p.wallWidth) && p.wallWidth > 0 ? p.wallWidth : 310;
  const H = Number.isFinite(p.wallHeight) && p.wallHeight > 0 ? p.wallHeight : 270;
  const f = Math.max(W, H) * 0.022;
  const g1 = f * 2.3;
  const g2 = f * 4.6;
  const dims = p.showDimensions && !!layout;
  // Карниз и плинтус рисуем и при ошибке раскладки, если их размеры корректны
  const trimsValid =
    Number.isFinite(p.corniceHeight) &&
    Number.isFinite(p.plinthHeight) &&
    p.corniceHeight >= 0 &&
    p.plinthHeight >= 0 &&
    p.corniceHeight + p.plinthHeight < H;

  const pad = dims
    ? { left: g2 + f * 1.4, right: g1 + f * 1.8, top: g1 + f * 1.4, bottom: g1 + f * 1.4 }
    : { left: f, right: f, top: f, bottom: f };
  const vb = [-pad.left, -pad.top, W + pad.left + pad.right, H + pad.top + pad.bottom];

  const shadow = `url(#shadow-${uid})`;
  const trimShadow = `url(#trim-${uid})`;

  // Цепочки размеров (только при корректной раскладке)
  let chains: ReactNode = null;
  if (dims && layout) {
    const { composition: c, tiers, cornice, plinth, sectionWidth } = layout;
    const top: Seg[] = [{ a: 0, b: c.x, tone: "clear" }];
    for (let s = 0; s < p.sections; s++) {
      const x = c.x + s * (sectionWidth + p.sectionGap);
      top.push({ a: x, b: x + sectionWidth });
      if (s < p.sections - 1 && p.sectionGap > 0) top.push({ a: x + sectionWidth, b: x + sectionWidth + p.sectionGap, tone: "clear" });
    }
    top.push({ a: c.x + c.width, b: W, tone: "clear" });

    const right: Seg[] = [];
    if (cornice.height > 0) right.push({ a: 0, b: cornice.height, tone: "muted" });
    if (layout.clearGaps.top > 0) right.push({ a: cornice.height, b: c.y, tone: "clear" });
    tiers.forEach((t, i) => {
      right.push({ a: t.y, b: t.y + t.height });
      if (i < tiers.length - 1 && p.tierGap > 0) right.push({ a: t.y + t.height, b: t.y + t.height + p.tierGap, tone: "clear" });
    });
    if (layout.clearGaps.bottom > 0) right.push({ a: c.y + c.height, b: plinth.y, tone: "clear" });
    if (plinth.height > 0) right.push({ a: plinth.y, b: H, tone: "muted" });

    const left: Seg[] = [
      { a: 0, b: c.y },
      { a: c.y, b: c.y + c.height },
      { a: c.y + c.height, b: H },
    ].filter((s) => s.b - s.a > 0);

    chains = (
      <g>
        <HChain y={-g1} edge={c.y} segs={top} f={f} />
        <HChain y={H + g1 + f * 0.6} edge={H} segs={[{ a: 0, b: W }]} f={f} />
        <VChain x={-g1} edge={0} segs={left} f={f} side="left" />
        <VChain x={-g2} edge={0} segs={[{ a: 0, b: H }]} f={f} side="left" />
        <VChain x={W + g1} edge={W} segs={right} f={f} side="right" />
      </g>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={vb.join(" ")}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto max-h-[72vh] w-full"
        role="img"
        aria-label={`Стена ${fmt(W)} × ${fmt(H)} см с раскладкой молдингов`}
      >
        <defs>
          <filter id={`shadow-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx={0.15} dy={0.3} stdDeviation={0.3} style={{ floodColor: "var(--molding-shadow)" }} floodOpacity={0.3} />
          </filter>
          <filter id={`trim-${uid}`} x="-2%" y="-20%" width="104%" height="140%">
            <feDropShadow dx={0} dy={0.4} stdDeviation={0.5} style={{ floodColor: "var(--molding-shadow)" }} floodOpacity={0.28} />
          </filter>
          <clipPath id={`wall-${uid}`}>
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill={p.wallColor} />

        {p.showGrid && (
          <g clipPath={`url(#wall-${uid})`} className="text-foreground">
            {Array.from({ length: Math.floor(W / 10) + 1 }, (_, i) => i * 10).map((x) => (
              <line key={`gx${x}`} x1={x} x2={x} y1={0} y2={H} {...LINE} strokeWidth={x % 50 === 0 ? 0.8 : 0.4} opacity={x % 50 === 0 ? 0.22 : 0.12} />
            ))}
            {Array.from({ length: Math.floor(H / 10) + 1 }, (_, i) => i * 10).map((y) => (
              <line key={`gy${y}`} x1={0} x2={W} y1={y} y2={y} {...LINE} strokeWidth={y % 50 === 0 ? 0.8 : 0.4} opacity={y % 50 === 0 ? 0.22 : 0.12} />
            ))}
          </g>
        )}

        {layout && (
          <g>
            {layout.frames.map((fr) => (
              <g key={fr.id}>
                <Molding outer={fr.outer} opening={fr.outerOpening} color={p.moldingColor} filter={shadow} />
                {fr.inner && fr.innerOpening && (
                  <Molding outer={fr.inner} opening={fr.innerOpening} color={p.moldingColor} filter={shadow} />
                )}
              </g>
            ))}
            {dims &&
              layout.frames.map((fr) => {
                const o = fr.innerOpening ?? fr.outerOpening;
                const label = `${fmt(fr.outer.width)} × ${fmt(fr.outer.height)}`;
                const fs = Math.min(f * 0.8, o.width / (label.length * 0.62));
                if (fs < f * 0.4 || o.height < fs * 2) return null;
                return (
                  <text
                    key={`l${fr.id}`}
                    x={o.x + o.width / 2}
                    y={o.y + o.height / 2}
                    fontSize={fs}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="currentColor"
                    className="tabular fill-current font-mono text-muted-foreground"
                  >
                    {label}
                  </text>
                );
              })}
          </g>
        )}

        {trimsValid && (
          <g>
            <Trim rect={{ x: 0, y: 0, width: W, height: p.corniceHeight }} color={p.moldingColor} lines={[0.35, 0.62, 0.82]} filter={trimShadow} />
            <Trim rect={{ x: 0, y: H - p.plinthHeight, width: W, height: p.plinthHeight }} color={p.moldingColor} lines={[0.12, 0.28]} filter={trimShadow} />
          </g>
        )}

        <rect x={0} y={0} width={W} height={H} fill="none" stroke={SHADE} strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {chains}
      </svg>
      {overlay}
    </div>
  );
}
