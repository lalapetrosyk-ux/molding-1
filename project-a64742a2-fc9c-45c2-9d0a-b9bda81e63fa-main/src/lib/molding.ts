/**
 * Расчётная логика раскладки молдингов. Не зависит от UI.
 *
 * Система координат: сантиметры, начало — левый верхний угол стены (чистый потолок),
 * ось Y направлена вниз к чистому полу.
 *
 * ВАЖНО: верхний и нижний отступы отсчитываются от чистого потолка/пола до границы
 * композиции и ВКЛЮЧАЮТ карниз/плинтус. Чистый зазор = отступ − высота карниза/плинтуса.
 */

export interface MoldingParams {
  wallWidth: number;
  wallHeight: number;
  sections: number;
  tiers: number;
  sideMargin: number;
  topMargin: number;
  bottomMargin: number;
  outerMolding: number;
  innerMolding: number;
  sectionGap: number;
  innerEnabled: boolean;
  innerGap: number;
  tierGap: number;
  lowerTierHeight: number;
  plinthHeight: number;
  corniceHeight: number;
  plankLength: number;
  wastePercent: number;
  wallColor: string;
  moldingColor: string;
  showDimensions: boolean;
  showGrid: boolean;
}

export type NumericParamKey = {
  [K in keyof MoldingParams]: MoldingParams[K] extends number ? K : never;
}[keyof MoldingParams];

export const DEFAULT_PARAMS: Readonly<MoldingParams> = Object.freeze({
  wallWidth: 310,
  wallHeight: 270,
  sections: 3,
  tiers: 1,
  sideMargin: 15,
  topMargin: 25,
  bottomMargin: 25,
  outerMolding: 4,
  innerMolding: 2,
  sectionGap: 10,
  innerEnabled: true,
  innerGap: 4,
  tierGap: 10,
  lowerTierHeight: 50,
  plinthHeight: 15,
  corniceHeight: 15,
  plankLength: 200,
  wastePercent: 10,
  wallColor: "#e7e1d6",
  moldingColor: "#fbfaf7",
  showDimensions: true,
  showGrid: false,
});

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Tier {
  /** 0 — верхний ярус */
  index: number;
  y: number;
  height: number;
  isLower: boolean;
}

export interface Frame {
  id: string;
  section: number;
  tier: number;
  /** Внешний контур внешнего молдинга (граница секции) */
  outer: Rect;
  /** Внутренний контур внешнего молдинга */
  outerOpening: Rect;
  /** Внешний контур внутреннего молдинга */
  inner: Rect | null;
  /** Внутренний контур внутреннего молдинга (чистое поле) */
  innerOpening: Rect | null;
}

export interface ClearGaps {
  /** От нижнего края карниза до верхней границы молдинга */
  top: number;
  /** От верхнего края плинтуса до нижней границы молдинга */
  bottom: number;
  /** От угла стены до боковой границы молдинга */
  side: number;
  betweenSections: number | null;
  betweenTiers: number | null;
  outerToInner: number | null;
}

export interface Layout {
  wall: Rect;
  cornice: Rect;
  plinth: Rect;
  composition: Rect;
  sectionWidth: number;
  tiers: Tier[];
  frames: Frame[];
  clearGaps: ClearGaps;
}

export interface Issue {
  field?: NumericParamKey;
  message: string;
}

export interface TierSummary {
  tier: Tier;
  frameCount: number;
  outerSize: { width: number; height: number };
  innerSize: { width: number; height: number } | null;
  openingSize: { width: number; height: number };
  outerPerimeter: number;
  innerPerimeter: number | null;
}

export interface MaterialLine {
  label: string;
  /** Чистая длина, см */
  length: number;
  /** Длина с запасом, см */
  lengthWithWaste: number;
  planks: number;
  pieces: number;
  longestPiece: number;
}

export interface Materials {
  tiers: TierSummary[];
  outer: MaterialLine;
  inner: MaterialLine | null;
  cornice: MaterialLine | null;
  plinth: MaterialLine | null;
  framesTotal: number;
  wallMoldingLength: number;
  wallMoldingPlanks: number;
}

const EPS = 1e-9;

export interface FrameSize { tier: number; width: number; height: number }

/** Допуск по абсолютной разнице отношения ширины к высоте. */
export const RATIO_TOLERANCE = 0.005;
/** Минимальный размер чистого проёма по каждой стороне, см. */
export const MIN_CLEAR_OPENING = 5;
export type CorrectionMode = "width" | "height" | "both";
export interface FrameCorrectionOption {
  mode: CorrectionMode;
  sizes: FrameSize[];
  valid: boolean;
  error?: string;
}

export function ratioMatches(width: number, height: number, target: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && height > 0 &&
    Math.abs(width / height - target) <= RATIO_TOLERANCE + EPS;
}

export type LayoutResult =
  | { ok: true; layout: Layout; materials: Materials; warnings: Issue[] }
  | { ok: false; errors: Issue[] };

export function inset(r: Rect, d: number): Rect {
  return { x: r.x + d, y: r.y + d, width: r.width - 2 * d, height: r.height - 2 * d };
}

export function perimeter(r: { width: number; height: number }): number {
  return 2 * (r.width + r.height);
}

/** Количество планок с учётом запаса. */
export function planksNeeded(lengthCm: number, plankLength: number, wastePercent: number): number {
  if (lengthCm <= 0) return 0;
  return Math.ceil((lengthCm * (1 + wastePercent / 100)) / plankLength - EPS);
}

/** Форматирование числа: максимум 1 знак после запятой, русская запятая. */
export function fmt(n: number, digits = 1): string {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  const s = (Object.is(r, -0) ? 0 : r).toString();
  return s.replace(".", ",");
}

/** Высоты ярусов сверху вниз. Нижний ярус имеет фиксированную высоту lowerTierHeight. */
export function tierHeights(p: MoldingParams, compositionHeight: number): number[] {
  if (p.tiers <= 1) return [compositionHeight];
  const upperCount = p.tiers - 1;
  const upper = (compositionHeight - p.lowerTierHeight - upperCount * p.tierGap) / upperCount;
  return [...Array<number>(upperCount).fill(upper), p.lowerTierHeight];
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function validateParams(p: MoldingParams): Issue[] {
  const errors: Issue[] = [];
  const need = (field: NumericParamKey, ok: boolean, message: string) => {
    if (!ok) errors.push({ field, message });
  };

  const labels: Record<NumericParamKey, string> = {
    wallWidth: "Ширина стены",
    wallHeight: "Высота стены",
    sections: "Количество секций",
    tiers: "Количество ярусов",
    sideMargin: "Боковой отступ",
    topMargin: "Верхний отступ",
    bottomMargin: "Нижний отступ",
    outerMolding: "Ширина внешнего молдинга",
    innerMolding: "Ширина внутреннего молдинга",
    sectionGap: "Расстояние между секциями",
    innerGap: "Зазор между молдингами",
    tierGap: "Расстояние между ярусами",
    lowerTierHeight: "Высота нижнего яруса",
    plinthHeight: "Высота плинтуса",
    corniceHeight: "Высота карниза",
    plankLength: "Длина планки",
    wastePercent: "Запас",
  };

  // 1. Все числовые поля — конечные числа
  for (const key of Object.keys(labels) as NumericParamKey[]) {
    if (!isNum(p[key])) errors.push({ field: key, message: `${labels[key]}: введите число.` });
  }
  if (errors.length) return errors;

  // 2. Базовые диапазоны
  need("wallWidth", p.wallWidth > 0, "Ширина стены должна быть больше 0 см.");
  need("wallHeight", p.wallHeight > 0, "Высота стены должна быть больше 0 см.");
  need("sections", Number.isInteger(p.sections) && p.sections >= 1, "Количество секций — целое число от 1.");
  need("tiers", Number.isInteger(p.tiers) && p.tiers >= 1, "Количество ярусов — целое число от 1.");
  need("sections", p.sections <= 50, "Не больше 50 секций.");
  need("tiers", p.tiers <= 10, "Не больше 10 ярусов.");
  for (const key of [
    "sideMargin",
    "topMargin",
    "bottomMargin",
    "sectionGap",
    "innerGap",
    "tierGap",
    "plinthHeight",
    "corniceHeight",
  ] as const) {
    need(key, p[key] >= 0, `${labels[key]} не может быть отрицательным.`);
  }
  need("outerMolding", p.outerMolding > 0, "Ширина внешнего молдинга должна быть больше 0 см.");
  if (p.innerEnabled) {
    need("innerMolding", p.innerMolding > 0, "Ширина внутреннего молдинга должна быть больше 0 см.");
  }
  if (p.tiers > 1) {
    need("lowerTierHeight", p.lowerTierHeight > 0, "Высота нижнего яруса должна быть больше 0 см.");
  }
  need("plankLength", p.plankLength > 0, "Длина планки должна быть больше 0 см.");
  need("wastePercent", p.wastePercent >= 0 && p.wastePercent <= 100, "Запас — от 0 до 100 %.");
  if (errors.length) return errors;

  // 3. Отступы включают карниз и плинтус
  need(
    "topMargin",
    p.topMargin >= p.corniceHeight,
    `Верхний отступ (${fmt(p.topMargin)} см) включает карниз и не может быть меньше его высоты (${fmt(p.corniceHeight)} см).`,
  );
  need(
    "bottomMargin",
    p.bottomMargin >= p.plinthHeight,
    `Нижний отступ (${fmt(p.bottomMargin)} см) включает плинтус и не может быть меньше его высоты (${fmt(p.plinthHeight)} см).`,
  );
  need(
    "wallHeight",
    p.plinthHeight + p.corniceHeight < p.wallHeight,
    "Плинтус и карниз вместе не помещаются по высоте стены.",
  );
  if (errors.length) return errors;

  // 4. Геометрия композиции
  const compW = p.wallWidth - 2 * p.sideMargin;
  const compH = p.wallHeight - p.topMargin - p.bottomMargin;
  need("sideMargin", compW > 0, `Боковые отступы съедают всю ширину стены (остаётся ${fmt(compW)} см).`);
  need(
    "topMargin",
    compH > 0,
    `Верхний и нижний отступы съедают всю высоту стены (остаётся ${fmt(compH)} см).`,
  );
  if (errors.length) return errors;

  const sectionWidth = (compW - (p.sections - 1) * p.sectionGap) / p.sections;
  const frameInset = p.outerMolding + (p.innerEnabled ? p.innerGap + p.innerMolding : 0);
  const minFrame = 2 * frameInset + MIN_CLEAR_OPENING;

  if (sectionWidth <= minFrame) {
    errors.push({
      field: "sections",
      message:
        sectionWidth <= 0
          ? `Секции не помещаются по ширине: ширина секции получается ${fmt(sectionWidth)} см. Уменьшите количество секций, расстояние между ними или боковые отступы.`
          : `Секция слишком узкая (${fmt(sectionWidth)} см): нужен размер рамки больше ${fmt(minFrame)} см, чтобы сохранить чистый проём не менее ${fmt(MIN_CLEAR_OPENING)} см. Уменьшите количество секций или ширину молдингов.`,
    });
  }

  const heights = tierHeights(p, compH);
  heights.forEach((h, i) => {
    const isLower = p.tiers > 1 && i === heights.length - 1;
    if (h <= minFrame) {
      errors.push({
        field: isLower ? "lowerTierHeight" : p.tiers > 1 ? "tierGap" : "topMargin",
        message:
          h <= 0
            ? `Ярусы не помещаются по высоте: высота ${isLower ? "нижнего" : "верхних"} ярусов получается ${fmt(h)} см. Уменьшите высоту нижнего яруса, расстояние между ярусами или отступы.`
            : `${isLower ? "Нижний ярус" : "Ярус"} слишком низкий (${fmt(h)} см): нужен размер рамки больше ${fmt(minFrame)} см, чтобы сохранить чистый проём не менее ${fmt(MIN_CLEAR_OPENING)} см.`,
      });
    }
  });

  // Убираем дубли сообщений (несколько верхних ярусов одинаковой высоты)
  const seen = new Set<string>();
  return errors.filter((e) => (seen.has(e.message) ? false : (seen.add(e.message), true)));
}

export function computeLayout(p: MoldingParams, frameSizes?: FrameSize[]): LayoutResult {
  const errors = validateParams(p);
  if (errors.length) return { ok: false, errors };

  if (frameSizes) {
    const expectedTiers = new Set(Array.from({ length: p.tiers }, (_, index) => index));
    const receivedTiers = new Set<number>();
    for (const size of frameSizes) {
      if (!Number.isInteger(size.tier) || !expectedTiers.has(size.tier) || receivedTiers.has(size.tier)) {
        return { ok: false, errors: [{ message: "Для каждого яруса должен быть задан ровно один набор размеров рамки." }] };
      }
      if (!isNum(size.width) || !isNum(size.height) || size.width <= 0 || size.height <= 0) {
        return { ok: false, errors: [{ message: `Размеры рамки яруса ${size.tier + 1} должны быть конечными числами больше 0.` }] };
      }
      receivedTiers.add(size.tier);
    }
    if (receivedTiers.size !== expectedTiers.size) {
      return { ok: false, errors: [{ message: "Не заданы размеры рамки для всех ярусов." }] };
    }
  }

  const wall: Rect = { x: 0, y: 0, width: p.wallWidth, height: p.wallHeight };
  const cornice: Rect = { x: 0, y: 0, width: p.wallWidth, height: p.corniceHeight };
  const plinth: Rect = {
    x: 0,
    y: p.wallHeight - p.plinthHeight,
    width: p.wallWidth,
    height: p.plinthHeight,
  };
  // Граница композиции: отступы от чистого потолка и пола (включая карниз/плинтус)
  const composition: Rect = {
    x: p.sideMargin,
    y: p.topMargin,
    width: p.wallWidth - 2 * p.sideMargin,
    height: p.wallHeight - p.topMargin - p.bottomMargin,
  };

  const sectionWidth = (composition.width - (p.sections - 1) * p.sectionGap) / p.sections;
  const heights = tierHeights(p, composition.height);

  let y = composition.y;
  const tiers: Tier[] = heights.map((height, index) => {
    const t: Tier = { index, y, height, isLower: p.tiers > 1 && index === heights.length - 1 };
    y += height + p.tierGap;
    return t;
  });

  const frames: Frame[] = [];
  for (const t of tiers) {
    for (let s = 0; s < p.sections; s++) {
      const requested = frameSizes?.find((size) => size.tier === t.index);
      const frameWidth = requested?.width ?? sectionWidth;
      const frameHeight = requested?.height ?? t.height;
      const requiredRatio = p.tiers === 1 ? 2.5 : 1.62;
      if (requested && !ratioMatches(frameWidth, frameHeight, requiredRatio)) {
        return { ok: false, errors: [{ message: `Рамка яруса ${t.index + 1} должна соответствовать отношению ширины к высоте ${fmt(requiredRatio)} с допуском ±${fmt(RATIO_TOLERANCE, 3)}.` }] };
      }
      const cellX = composition.x + s * (sectionWidth + p.sectionGap);
      const outer: Rect = {
        x: cellX + (sectionWidth - frameWidth) / 2,
        y: t.y + (t.height - frameHeight) / 2,
        width: frameWidth,
        height: frameHeight,
      };
      const minOpening = 2 * (p.outerMolding + (p.innerEnabled ? p.innerGap + p.innerMolding : 0)) + MIN_CLEAR_OPENING;
      if (frameWidth <= minOpening || frameHeight <= minOpening || frameWidth > sectionWidth + EPS || frameHeight > t.height + EPS) {
        return { ok: false, errors: [{ message: `Рамка яруса ${t.index + 1} не помещается или оставляет чистый проём меньше ${fmt(MIN_CLEAR_OPENING)} см.` }] };
      }
      const outerOpening = inset(outer, p.outerMolding);
      const inner = p.innerEnabled ? inset(outer, p.outerMolding + p.innerGap) : null;
      const innerOpening = inner ? inset(inner, p.innerMolding) : null;
      if (outerOpening.width <= 0 || outerOpening.height <= 0 ||
          (innerOpening && (innerOpening.width <= 0 || innerOpening.height <= 0))) {
        return { ok: false, errors: [{ message: `В рамке яруса ${t.index + 1} недостаточно места для чистого проёма. Уменьшите ширину молдингов или увеличьте рамку.` }] };
      }
      frames.push({ id: `t${t.index}-s${s}`, section: s, tier: t.index, outer, outerOpening, inner, innerOpening });
    }
  }

  // Защита от пересечений: рамки не должны накладываться даже при переданных вручную размерах.
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const a = frames[i]!.outer;
      const b = frames[j]!.outer;
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (overlapX > EPS && overlapY > EPS) {
        return { ok: false, errors: [{ message: `Рамки ${frames[i]!.id} и ${frames[j]!.id} пересекаются. Измените размеры или расстояния между рамками.` }] };
      }
    }
  }

  const clearGaps: ClearGaps = {
    top: p.topMargin - p.corniceHeight,
    bottom: p.bottomMargin - p.plinthHeight,
    side: p.sideMargin,
    betweenSections: p.sections > 1 ? p.sectionGap : null,
    betweenTiers: p.tiers > 1 ? p.tierGap : null,
    outerToInner: p.innerEnabled ? p.innerGap : null,
  };

  const layout: Layout = { wall, cornice, plinth, composition, sectionWidth, tiers, frames, clearGaps };
  const materials = calculateMaterials(layout, p);

  const warnings: Issue[] = [];
  const longest = Math.max(materials.outer.longestPiece, materials.inner?.longestPiece ?? 0);
  if (longest > p.plankLength + EPS) {
    warnings.push({
      field: "plankLength",
      message: `Самый длинный отрезок рамки (${fmt(longest)} см) длиннее планки (${fmt(p.plankLength)} см) — его придётся сращивать из двух частей.`,
    });
  }
  if (p.wallWidth > p.plankLength + EPS && (p.corniceHeight > 0 || p.plinthHeight > 0)) {
    warnings.push({
      message: `Карниз и плинтус по ширине стены (${fmt(p.wallWidth)} см) длиннее планки — понадобятся стыки.`,
    });
  }
  if (clearGaps.top === 0) warnings.push({ field: "topMargin", message: "Молдинг стоит вплотную к карнизу (чистый зазор 0 см)." });
  if (clearGaps.bottom === 0) warnings.push({ field: "bottomMargin", message: "Молдинг стоит вплотную к плинтусу (чистый зазор 0 см)." });

  return { ok: true, layout, materials, warnings };
}

/**
 * Строит три независимых варианта коррекции пропорций.
 * Исходные параметры не изменяются; результат применяется только через отдельное подтверждение в UI.
 */
export function buildFrameCorrectionOptions(p: MoldingParams): Record<CorrectionMode, FrameCorrectionOption> | null {
  const finite = [p.wallWidth, p.wallHeight, p.sideMargin, p.topMargin, p.bottomMargin,
    p.sectionGap, p.tierGap, p.lowerTierHeight].every(Number.isFinite);
  if (!finite || !Number.isInteger(p.sections) || p.sections < 1 || p.sections > 50 ||
      !Number.isInteger(p.tiers) || p.tiers < 1 || p.tiers > 10 ||
      p.wallWidth <= 0 || p.wallHeight <= 0) return null;

  const compositionWidth = p.wallWidth - 2 * p.sideMargin;
  const compositionHeight = p.wallHeight - p.topMargin - p.bottomMargin;
  if (compositionWidth <= 0 || compositionHeight <= 0 || p.sectionGap < 0 || p.tierGap < 0) return null;
  const sectionWidth = (compositionWidth - (p.sections - 1) * p.sectionGap) / p.sections;
  if (sectionWidth <= 0) return null;
  const heights = tierHeights(p, compositionHeight);
  if (heights.some((height) => !Number.isFinite(height) || height <= 0)) return null;

  const target = p.tiers === 1 ? 2.5 : 1.62;
  const mismatch = heights.some((height) => !ratioMatches(sectionWidth, height, target));
  if (!mismatch) return null;

  const modes: CorrectionMode[] = ["width", "height", "both"];
  const options = {} as Record<CorrectionMode, FrameCorrectionOption>;
  for (const mode of modes) {
    const sizes = heights.map((height, tier) => {
      let width = sectionWidth;
      let correctedHeight = height;
      if (mode === "width") width = height * target;
      if (mode === "height") correctedHeight = width / target;
      if (mode === "both") {
        width = Math.min(sectionWidth, height * target);
        correctedHeight = width / target;
      }
      return { tier, width, height: correctedHeight };
    });
    const result = computeLayout(p, sizes);
    options[mode] = {
      mode,
      sizes,
      valid: result.ok,
      ...(!result.ok ? { error: result.errors.map((issue) => issue.message).join(" ") } : {}),
    };
  }
  return options;
}

function line(label: string, length: number, pieces: number, longestPiece: number, p: MoldingParams): MaterialLine {
  return {
    label,
    length,
    lengthWithWaste: length * (1 + p.wastePercent / 100),
    planks: planksNeeded(length, p.plankLength, p.wastePercent),
    pieces,
    longestPiece,
  };
}

export function calculateMaterials(layout: Layout, p: MoldingParams): Materials {
  const tiers: TierSummary[] = layout.tiers.map((tier) => {
    const frame = layout.frames.find((f) => f.tier === tier.index)!;
    const opening = frame.innerOpening ?? frame.outerOpening;
    return {
      tier,
      frameCount: p.sections,
      outerSize: { width: frame.outer.width, height: frame.outer.height },
      innerSize: frame.inner ? { width: frame.inner.width, height: frame.inner.height } : null,
      openingSize: { width: opening.width, height: opening.height },
      // Длина по внешнему краю — именно её отрезают при запиле под 45°
      outerPerimeter: perimeter(frame.outer),
      innerPerimeter: frame.inner ? perimeter(frame.inner) : null,
    };
  });

  const outerLength = layout.frames.reduce((s, f) => s + perimeter(f.outer), 0);
  const outerLongest = Math.max(...layout.frames.map((f) => Math.max(f.outer.width, f.outer.height)));
  const outer = line("Внешний молдинг", outerLength, layout.frames.length * 4, outerLongest, p);

  let inner: MaterialLine | null = null;
  if (p.innerEnabled) {
    const innerFrames = layout.frames.map((f) => f.inner!).filter(Boolean);
    const innerLength = innerFrames.reduce((s, r) => s + perimeter(r), 0);
    const innerLongest = Math.max(...innerFrames.map((r) => Math.max(r.width, r.height)));
    inner = line("Внутренний молдинг", innerLength, innerFrames.length * 4, innerLongest, p);
  }

  const cornice = p.corniceHeight > 0 ? line("Карниз", p.wallWidth, 1, p.wallWidth, p) : null;
  const plinth = p.plinthHeight > 0 ? line("Плинтус", p.wallWidth, 1, p.wallWidth, p) : null;

  return {
    tiers,
    outer,
    inner,
    cornice,
    plinth,
    framesTotal: layout.frames.length * (p.innerEnabled ? 2 : 1),
    wallMoldingLength: outer.length + (inner?.length ?? 0),
    wallMoldingPlanks: outer.planks + (inner?.planks ?? 0),
  };
}
