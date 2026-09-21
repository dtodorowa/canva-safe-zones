import type { OverlayOptions } from "./overlay";
import { DEFAULT_OVERLAY_OPTIONS } from "./overlay";

const KEY = "safe-zones:prefs:v1";

export type Prefs = {
  options: OverlayOptions;
  /** Which zones are switched on, remembered per format. */
  zonesByFormat: Record<string, string[]>;
};

export const DEFAULT_PREFS: Prefs = {
  options: DEFAULT_OVERLAY_OPTIONS,
  zonesByFormat: {},
};

/**
 * Storage in an app iframe can be partitioned or blocked outright, so every
 * path here has to survive throwing.
 */
export const loadPrefs = (): Prefs => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed == null) {
      return DEFAULT_PREFS;
    }

    const value = parsed as Partial<Prefs>;
    return {
      options: { ...DEFAULT_OVERLAY_OPTIONS, ...value.options },
      zonesByFormat: value.zonesByFormat ?? {},
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const savePrefs = (prefs: Prefs): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Nothing to do — the panel still works, it just forgets between sessions.
  }
};
