import {
  FORMATS,
  defaultZoneIds,
  formatById,
  matchFormats,
} from "../../data/formats";
import { describeAspect, overlapFraction, rotatedBounds } from "../geometry";
import { computeSafeArea, resolveZones } from "../zones";

const reels = formatById("ig-reels")!;
const page = { width: 1080, height: 1920 };

describe("geometry", () => {
  it("measures how much of an element falls inside a zone", () => {
    const element = { x: 0, y: 0, w: 100, h: 100 };
    expect(overlapFraction(element, { x: 0, y: 0, w: 50, h: 100 })).toBe(0.5);
    expect(overlapFraction(element, { x: 200, y: 0, w: 50, h: 50 })).toBe(0);
  });

  it("grows the bounding box of a rotated element", () => {
    const square = { x: 0, y: 0, w: 100, h: 100 };
    expect(rotatedBounds(square, 0)).toEqual(square);

    const turned = rotatedBounds(square, 45);
    expect(turned.w).toBeCloseTo(Math.sqrt(2) * 100, 5);
    // Still centred on the same point.
    expect(turned.x + turned.w / 2).toBeCloseTo(50, 5);
  });

  it("names ratios the way the platforms do", () => {
    expect(describeAspect(1080, 1920)).toBe("9:16");
    expect(describeAspect(1080, 1350)).toBe("4:5");
    expect(describeAspect(1200, 630)).toBe("1.9:1");
  });
});

describe("safe area", () => {
  it("carves the Reels chrome off the edges it touches", () => {
    const zones = resolveZones(reels, defaultZoneIds(reels), page);
    const safe = computeSafeArea(zones, page, 64);

    expect(safe.y).toBe(250); // top bar
    expect(safe.y + safe.h).toBe(1500); // caption block
    expect(safe.x + safe.w).toBe(900); // action rail
    expect(safe.x).toBe(64); // nothing on the left, so the margin stands
  });

  it("scales zones onto a page that isn't the reference size", () => {
    const half = { width: 540, height: 960 };
    const zones = resolveZones(reels, ["ig-reels-top"], half);

    expect(zones[0]?.pageRect).toEqual({ x: 0, y: 0, w: 540, h: 125 });
  });

  it("leaves floating zones out of the safe rectangle", () => {
    const cover = formatById("fb-page-cover")!;
    const zones = resolveZones(cover, defaultZoneIds(cover), {
      width: cover.width,
      height: cover.height,
    });
    const safe = computeSafeArea(
      zones,
      { width: cover.width, height: cover.height },
      0,
    );

    // The profile photo sits in the middle-left and is only "risky", so the
    // safe rectangle is decided by the four crop bands.
    expect(safe).toEqual({ x: 180, y: 48, w: 1280, h: 624 });
  });
});

describe("format matching", () => {
  it("puts an exact pixel match first", () => {
    const best = matchFormats(1080, 1350)[0];
    expect(best?.kind).toBe("exact");
    expect(best?.format.platform).toBe("instagram");
  });

  it("finds same-shape formats at other scales", () => {
    const best = matchFormats(720, 1280)[0];
    expect(best).toBeDefined();
    expect(best?.kind).toBe("aspect");

    const { width, height } = best!.format;
    expect(width / height).toBeCloseTo(9 / 16, 5);
  });

  it("returns nothing for a shape no format is close to", () => {
    expect(matchFormats(1000, 200)).toHaveLength(0);
  });
});

describe("format data", () => {
  it("keeps every zone inside its own reference frame", () => {
    for (const format of FORMATS) {
      for (const zone of format.zones) {
        expect(zone.rect.x).toBeGreaterThanOrEqual(0);
        expect(zone.rect.y).toBeGreaterThanOrEqual(0);
        expect(zone.rect.x + zone.rect.w).toBeLessThanOrEqual(format.width);
        expect(zone.rect.y + zone.rect.h).toBeLessThanOrEqual(format.height);
      }
    }
  });

  it("uses unique ids", () => {
    const formatIds = FORMATS.map((f) => f.id);
    expect(new Set(formatIds).size).toBe(formatIds.length);

    const zoneIds = FORMATS.flatMap((f) => f.zones.map((z) => z.id));
    expect(new Set(zoneIds).size).toBe(zoneIds.length);
  });

  it("leaves a usable safe area in every format", () => {
    for (const format of FORMATS) {
      const size = { width: format.width, height: format.height };
      const zones = resolveZones(format, defaultZoneIds(format), size);
      const safe = computeSafeArea(zones, size, format.recommendedMargin);

      expect(safe.w).toBeGreaterThan(format.width * 0.5);
      expect(safe.h).toBeGreaterThan(format.height * 0.3);
    }
  });
});
