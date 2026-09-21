/**
 * Renders every format and its zones to a single SVG so the dataset can be
 * eyeballed after an edit. Run with `npm run sheet`, then open safe-zones.svg.
 */
import { writeFileSync } from "node:fs";
import { FORMATS, defaultZoneIds } from "../src/data/formats";
import { OVERLAY_COLOURS } from "../src/lib/overlay";
import { computeSafeArea, resolveZones } from "../src/lib/zones";

const CELL = 260;
const GAP = 28;
const LABEL = 44;
const COLUMNS = 4;

const cells = FORMATS.map((format) => {
  const size = { width: format.width, height: format.height };
  const zones = resolveZones(format, defaultZoneIds(format), size);
  const safe = computeSafeArea(zones, size, format.recommendedMargin);
  const scale = Math.min(CELL / format.width, CELL / format.height);

  return { format, zones, safe, scale };
});

const rows = Math.ceil(cells.length / COLUMNS);
const width = COLUMNS * (CELL + GAP) + GAP;
const height = rows * (CELL + LABEL + GAP) + GAP;

const escape = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const body = cells
  .map(({ format, zones, safe, scale }, index) => {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const originX = GAP + column * (CELL + GAP);
    const originY = GAP + row * (CELL + LABEL + GAP);
    const w = format.width * scale;
    const h = format.height * scale;
    const offsetX = originX + (CELL - w) / 2;

    const shapes = zones
      .map((zone) => {
        const r = zone.pageRect;
        const colour =
          zone.kind === "crop"
            ? OVERLAY_COLOURS.crop
            : zone.severity === "blocked"
              ? OVERLAY_COLOURS.blocked
              : OVERLAY_COLOURS.risky;
        const attrs = `x="${(r.x * scale).toFixed(1)}" y="${(r.y * scale).toFixed(1)}" width="${(r.w * scale).toFixed(1)}" height="${(r.h * scale).toFixed(1)}"`;

        return zone.kind === "crop"
          ? `<rect ${attrs} fill="none" stroke="${colour}" stroke-width="1.5" stroke-dasharray="5 4" />`
          : `<rect ${attrs} fill="${colour}" fill-opacity="${zone.severity === "blocked" ? 0.38 : 0.2}" stroke="${colour}" stroke-width="1" />`;
      })
      .join("");

    const safeRect = `<rect x="${(safe.x * scale).toFixed(1)}" y="${(safe.y * scale).toFixed(1)}" width="${(safe.w * scale).toFixed(1)}" height="${(safe.h * scale).toFixed(1)}" fill="none" stroke="${OVERLAY_COLOURS.safe}" stroke-width="2" stroke-dasharray="8 5" />`;

    return `<g transform="translate(${offsetX.toFixed(1)} ${originY})">
  <rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#8f8f8f" />
  ${shapes}
  ${safeRect}
  <rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="#00000055" />
</g>
<text x="${(originX + CELL / 2).toFixed(1)}" y="${originY + CELL + 18}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#eaeaea">${escape(format.label)}</text>
<text x="${(originX + CELL / 2).toFixed(1)}" y="${originY + CELL + 34}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9a9a9a">${format.platform} · ${format.width}×${format.height}</text>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#1c1c1c" />
${body}
</svg>`;

writeFileSync("safe-zones.svg", svg);
process.stdout.write(
  `Wrote safe-zones.svg — ${cells.length.toString()} formats\n`,
);
