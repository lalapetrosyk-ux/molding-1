import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, MIN_CLEAR_OPENING, RATIO_TOLERANCE, buildFrameCorrectionOptions, computeLayout, planksNeeded, validateParams } from "./molding";
import { sanitizeParams } from "./molding-storage";

const ok = (p = DEFAULT_PARAMS) => {
  const r = computeLayout({ ...p });
  if (!r.ok) throw new Error(r.errors.map((e) => e.message).join("; "));
  return r;
};

describe("defaults", () => {
  it("uses the exact default values", () => {
    expect({ ...DEFAULT_PARAMS }).toEqual({
      wallWidth: 310, wallHeight: 270, sections: 3, tiers: 1, sideMargin: 15,
      topMargin: 25, bottomMargin: 25, outerMolding: 4, innerMolding: 2, sectionGap: 10,
      innerEnabled: true, innerGap: 4, tierGap: 10, lowerTierHeight: 50, plinthHeight: 15,
      corniceHeight: 15, plankLength: 200, wastePercent: 10, wallColor: "#e7e1d6",
      moldingColor: "#fbfaf7", showDimensions: true, showGrid: false,
    });
  });

  it("keeps tierGap at 10 cm, separate from sectionGap", () => {
    expect(DEFAULT_PARAMS.tierGap).toBe(10);
    expect(DEFAULT_PARAMS.sectionGap).toBe(10);
    expect(DEFAULT_PARAMS.sideMargin).toBe(15);
  });

  it("ignores unknown or invalid stored values", () => {
    expect(sanitizeParams({ wallWidth: "500", foo: 1, topMargin: 30 })).toEqual({ ...DEFAULT_PARAMS, topMargin: 30 });
  });
});

describe("top and bottom margins include cornice and plinth", () => {
  it("25 cm margin with 15 cm cornice/plinth leaves a 10 cm clear gap", () => {
    const { layout } = ok();
    expect(layout.clearGaps.top).toBe(10);
    expect(layout.clearGaps.bottom).toBe(10);
  });

  it("composition starts 25 cm from the ceiling and ends 25 cm from the floor", () => {
    const { layout } = ok();
    expect(layout.composition.y).toBe(25);
    expect(layout.composition.y + layout.composition.height).toBe(245);
    // нижний край карниза — 15, верхний край плинтуса — 255
    expect(layout.cornice.y + layout.cornice.height).toBe(15);
    expect(layout.plinth.y).toBe(255);
    const top = Math.min(...layout.frames.map((f) => f.outer.y));
    const bottom = Math.max(...layout.frames.map((f) => f.outer.y + f.outer.height));
    expect(top - (layout.cornice.y + layout.cornice.height)).toBe(10);
    expect(layout.plinth.y - bottom).toBe(10);
  });

  it("rejects a top margin smaller than the cornice", () => {
    const errors = validateParams({ ...DEFAULT_PARAMS, topMargin: 10 });
    expect(errors.some((e) => e.field === "topMargin")).toBe(true);
  });
});

describe("frames and materials", () => {
  it("splits 280 cm into 3 sections with 10 cm gaps", () => {
    const { layout } = ok();
    expect(layout.sectionWidth).toBeCloseTo(86.667, 3);
    expect(layout.frames).toHaveLength(3);
    const last = layout.frames[2]!.outer;
    expect(last.x + last.width).toBeCloseTo(295, 9);
  });

  it("insets the inner frame by outer molding + gap", () => {
    const f = ok().layout.frames[0]!;
    expect(f.inner!.x - f.outer.x).toBe(8);
    expect(f.innerOpening!.x - f.outer.x).toBe(10);
  });

  it("counts planks with 10% waste", () => {
    const { materials } = ok();
    expect(materials.outer.length).toBeCloseTo(1840, 6);
    expect(materials.outer.planks).toBe(11);
    expect(materials.inner!.length).toBeCloseTo(1648, 6);
    expect(materials.inner!.planks).toBe(10);
    expect(materials.cornice!.planks).toBe(2);
  });

  it("does not round up exact multiples", () => {
    expect(planksNeeded(400, 200, 0)).toBe(2);
  });

  it("gives the lower tier its fixed height", () => {
    const { layout } = ok({ ...DEFAULT_PARAMS, tiers: 2 });
    expect(layout.tiers.map((t) => t.height)).toEqual([160, 50]);
    expect(layout.tiers[1]!.y + 50).toBe(245);
  });

  it("rejects negative sizes", () => {
    const r = computeLayout({ ...DEFAULT_PARAMS, sectionGap: -5 });
    expect(r.ok).toBe(false);
  });
});


describe("frame proportion correction", () => {
  it("uses the same absolute tolerance of 0.005 in ratio checks", () => {
    expect(RATIO_TOLERANCE).toBe(0.005);
    expect(MIN_CLEAR_OPENING).toBe(5);
    const params = { ...DEFAULT_PARAMS, innerEnabled: false };
    const atUpperBoundary = computeLayout(params, [{ tier: 0, width: 50.1, height: 20 }]);
    const outsideBoundary = computeLayout(params, [{ tier: 0, width: 50.12, height: 20 }]);
    expect(atUpperBoundary.ok).toBe(true);
    expect(outsideBoundary.ok).toBe(false);
  });

  it("rejects missing, duplicate, and malformed tier dimensions", () => {
    const params = { ...DEFAULT_PARAMS, tiers: 2 };
    expect(computeLayout(params, [{ tier: 0, width: 80, height: 49.382716 }]).ok).toBe(false);
    expect(computeLayout(params, [
      { tier: 0, width: 80, height: 49.382716 },
      { tier: 0, width: 80, height: 49.382716 },
    ]).ok).toBe(false);
    expect(computeLayout(params, [
      { tier: 0, width: Number.NaN, height: 49.382716 },
      { tier: 1, width: 80, height: 49.382716 },
    ]).ok).toBe(false);
  });

  it("offers all three independent correction strategies and validates fit", () => {
    const options = buildFrameCorrectionOptions(DEFAULT_PARAMS);
    expect(options).not.toBeNull();
    expect(options!.width.mode).toBe("width");
    expect(options!.height.mode).toBe("height");
    expect(options!.both.mode).toBe("both");
    expect(options!.width.valid).toBe(false);
    expect(options!.height.valid).toBe(true);
    expect(options!.both.valid).toBe(true);
    for (const option of [options!.height, options!.both]) {
      for (const size of option.sizes) {
        expect(Math.abs(size.width / size.height - 2.5)).toBeLessThanOrEqual(RATIO_TOLERANCE);
      }
    }
  });

  it("uses confirmed frame dimensions for openings and material calculations", () => {
    const options = buildFrameCorrectionOptions(DEFAULT_PARAMS)!;
    const result = computeLayout(DEFAULT_PARAMS, options.both.sizes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frame = result.layout.frames[0]!;
    expect(frame.outer.width).toBeCloseTo(options.both.sizes[0]!.width, 8);
    expect(frame.outer.height).toBeCloseTo(options.both.sizes[0]!.height, 8);
    expect(frame.innerOpening!.width).toBeGreaterThanOrEqual(MIN_CLEAR_OPENING);
    expect(frame.innerOpening!.height).toBeGreaterThanOrEqual(MIN_CLEAR_OPENING);
    expect(result.materials.tiers[0]!.outerSize.width).toBeCloseTo(frame.outer.width, 8);
  });

  it("applies the two-tier ratio to every tier and keeps each frame inside its cell", () => {
    const params = { ...DEFAULT_PARAMS, tiers: 2 };
    const options = buildFrameCorrectionOptions(params);
    expect(options).not.toBeNull();
    expect(options!.both.valid).toBe(true);
    for (const size of options!.both.sizes) {
      expect(Math.abs(size.width / size.height - 1.62)).toBeLessThanOrEqual(RATIO_TOLERANCE);
      expect(size.width).toBeLessThanOrEqual(280 / 3 + 1e-7);
    }
    expect(options!.both.sizes[1]!.height).toBeCloseTo(50, 6);
  });

  it("does not suggest corrections when the initial geometry already meets the ratio", () => {
    const params = {
      ...DEFAULT_PARAMS,
      wallWidth: 130,
      wallHeight: 90,
      sideMargin: 15,
      sections: 1,
      topMargin: 25,
      bottomMargin: 25,
    };
    expect(buildFrameCorrectionOptions(params)).toBeNull();
  });
});


describe("correction options with blocked base validation", () => {
  it("still reports the three alternatives when the source geometry has a separate blocking error", () => {
    const params = { ...DEFAULT_PARAMS, topMargin: 10 };
    const options = buildFrameCorrectionOptions(params);
    expect(options).not.toBeNull();
    expect(Object.values(options!).every((option) => !option.valid)).toBe(true);
    expect(Object.values(options!).every((option) => Boolean(option.error))).toBe(true);
  });
});
