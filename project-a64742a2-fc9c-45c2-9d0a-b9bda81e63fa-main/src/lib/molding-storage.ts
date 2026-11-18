import { DEFAULT_PARAMS, type MoldingParams } from "./molding";

/** Собственный ключ этого приложения: старые сохранения других версий не подхватываются. */
export const STORAGE_KEY = "molding-wall-planner:params:v2";

const HEX = /^#[0-9a-f]{6}$/i;

/** Берёт из сохранённого объекта только известные поля правильного типа. */
export function sanitizeParams(raw: unknown): MoldingParams {
  const result: MoldingParams = { ...DEFAULT_PARAMS };
  if (!raw || typeof raw !== "object") return result;
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof MoldingParams)[]) {
    const v = src[key];
    const def = DEFAULT_PARAMS[key];
    if (typeof def === "number" && typeof v === "number" && Number.isFinite(v)) {
      (result as unknown as Record<string, unknown>)[key] = v;
    } else if (typeof def === "boolean" && typeof v === "boolean") {
      (result as unknown as Record<string, unknown>)[key] = v;
    } else if (typeof def === "string" && typeof v === "string" && HEX.test(v)) {
      (result as unknown as Record<string, unknown>)[key] = v;
    }
  }
  return result;
}

export function loadParams(): MoldingParams | null {
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    return s ? sanitizeParams(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function saveParams(p: MoldingParams): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* хранилище недоступно — работаем без сохранения */
  }
}

export function clearParams(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
