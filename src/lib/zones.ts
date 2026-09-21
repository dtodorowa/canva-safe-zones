import type { Format, Zone } from "../data/formats";
import type { Rect } from "./geometry";
import { scaleRect } from "./geometry";

export type PageSize = {
  width: number;
  height: number;
};

/** A zone's rect mapped from the format's reference frame onto a real page. */
export type ResolvedZone = Zone & {
  /** Pixels on the page being checked. */
  pageRect: Rect;
};

export const resolveZones = (
  format: Format,
  enabledIds: readonly string[],
  page: PageSize,
): ResolvedZone[] => {
  const sx = page.width / format.width;
  const sy = page.height / format.height;

  return format.zones
    .filter((zone) => enabledIds.includes(zone.id))
    .map((zone) => ({ ...zone, pageRect: scaleRect(zone.rect, sx, sy) }));
};

const TOUCH_TOLERANCE = 2;

/**
 * The rectangle left over once every blocked zone is carved off the edges it
 * touches. Zones floating in the middle of the frame are drawn but ignored
 * here — nothing sensible can be subtracted from a rectangle's interior.
 */
export const computeSafeArea = (
  zones: readonly ResolvedZone[],
  page: PageSize,
  margin: number,
): Rect => {
  let top = margin;
  let left = margin;
  let right = page.width - margin;
  let bottom = page.height - margin;

  for (const zone of zones) {
    if (zone.severity !== "blocked") {
      continue;
    }

    const r = zone.pageRect;
    const touchesTop = r.y <= TOUCH_TOLERANCE;
    const touchesLeft = r.x <= TOUCH_TOLERANCE;
    const touchesRight = r.x + r.w >= page.width - TOUCH_TOLERANCE;
    const touchesBottom = r.y + r.h >= page.height - TOUCH_TOLERANCE;

    // A full-width band at the top is a top inset, not a left and right one.
    const spansHorizontally = touchesLeft && touchesRight;
    const spansVertically = touchesTop && touchesBottom;

    if (touchesTop && (spansHorizontally || !spansVertically)) {
      top = Math.max(top, r.y + r.h);
    }
    if (touchesBottom && (spansHorizontally || !spansVertically)) {
      bottom = Math.min(bottom, r.y);
    }
    if (touchesLeft && (spansVertically || !spansHorizontally)) {
      left = Math.max(left, r.x + r.w);
    }
    if (touchesRight && (spansVertically || !spansHorizontally)) {
      right = Math.min(right, r.x);
    }
  }

  return {
    x: left,
    y: top,
    w: Math.max(0, right - left),
    h: Math.max(0, bottom - top),
  };
};
