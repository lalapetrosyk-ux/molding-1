import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PARAMS, type MoldingParams } from "@/lib/molding";
import { clearParams, loadParams, saveParams } from "@/lib/molding-storage";

/** Параметры стартуют строго с DEFAULT_PARAMS; сохранённые правки пользователя подхватываются после гидратации. */
export function useMoldingParams() {
  const [params, setParams] = useState<MoldingParams>({ ...DEFAULT_PARAMS });
  const loaded = useRef(false);

  // Порядок важен: сохранение объявлено раньше загрузки, чтобы не затереть сохранённое значение defaults.
  useEffect(() => {
    if (loaded.current) saveParams(params);
  }, [params]);

  useEffect(() => {
    const stored = loadParams();
    if (stored) setParams(stored);
    loaded.current = true;
  }, []);

  const update = useCallback(<K extends keyof MoldingParams>(key: K, value: MoldingParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    clearParams();
    setParams({ ...DEFAULT_PARAMS });
  }, []);

  return { params, update, reset };
}
