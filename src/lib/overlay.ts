import type { Rect } from "./geometry";
import type { PageSize, ResolvedZone } from "./zones";

export type OverlayOptions = {
  showSafeArea: boolean;
  showThirds: boolean;
  showCentre: boolean;
  showLabels: boolean;
  /** Fill opacity for blocked zones, 0–1. Risky zones use half of it. */
  opacity: number;
};

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  showSafeArea: true,
  showThirds: false,
  showCentre: false,
  showLabels: true,
  opacity: 0.38,
};

export const OVERLAY_COLOURS = {
  blocked: "#F5403A",
  risky: "#F5A623",
  crop: "#3D8BFD",
  safe: "#1FC16B",
  guide: "#FFFFFF",
  artboard: "#8F8F8F",
};

const COLOURS = OVERLAY_COLOURS;

/**
 * Anything larger is a waste — the overlay is flat colour and straight lines,
 * and the data URL has to survive being handed to the design API.
 */
const MAX_RENDER_EDGE = 2400;

const hatchPattern = (
  ctx: CanvasRenderingContext2D,
  colour: string,
  scale: number,
): CanvasPattern | undefined => {
  const size = Math.max(8, Math.round(16 * scale));
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;

  const tileCtx = tile.getContext("2d");
  if (!tileCtx) {
    return undefined;
  }

  tileCtx.strokeStyle = colour;
  tileCtx.lineWidth = Math.max(1, size / 8);
  tileCtx.beginPath();
  tileCtx.moveTo(-size, size);
  tileCtx.lineTo(size, -size);
  tileCtx.moveTo(0, size * 2);
  tileCtx.lineTo(size * 2, 0);
  tileCtx.stroke();

  return ctx.createPattern(tile, "repeat") ?? undefined;
};

const strokeRect = (
  ctx: CanvasRenderingContext2D,
  r: Rect,
  colour: string,
  lineWidth: number,
  dash?: number[],
) => {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash ?? []);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
};

const drawLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  r: Rect,
  colour: string,
  fontSize: number,
) => {
  ctx.save();
  ctx.font = `600 ${fontSize}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = "top";

  const paddingX = fontSize * 0.5;
  const paddingY = fontSize * 0.32;
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + paddingX * 2;
  const boxH = fontSize + paddingY * 2;

  // Keep the chip inside the zone, and inside the canvas for thin zones.
  const x = Math.min(
    Math.max(r.x + fontSize * 0.4, 0),
    ctx.canvas.width - boxW - 2,
  );
  const y = Math.min(
    Math.max(r.y + fontSize * 0.4, 0),
    ctx.canvas.height - boxH - 2,
  );

  ctx.fillStyle = colour;
  ctx.fillRect(x, y, boxW, boxH);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, x + paddingX, y + paddingY);
  ctx.restore();
};

export type OverlayResult = {
  dataUrl: string;
  /** Pixel size of the rendered PNG, which may be smaller than the page. */
  renderedWidth: number;
  renderedHeight: number;
};

export const renderOverlay = (
  page: PageSize,
  zones: readonly ResolvedZone[],
  safeArea: Rect,
  options: OverlayOptions,
): OverlayResult | undefined => {
  const scale = Math.min(
    1,
    MAX_RENDER_EDGE / Math.max(page.width, page.height),
  );
  const width = Math.round(page.width * scale);
  const height = Math.round(page.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return undefined;
  }

  ctx.scale(scale, scale);

  const unit = Math.max(page.width, page.height) / 1000;
  const lineWidth = Math.max(1, 2 * unit);
  const fontSize = Math.max(11, 22 * unit);

  const blockedHatch = hatchPattern(ctx, COLOURS.blocked, unit);
  const riskyHatch = hatchPattern(ctx, COLOURS.risky, unit);

  for (const zone of zones) {
    const r = zone.pageRect;

    if (zone.kind === "crop") {
      strokeRect(ctx, r, COLOURS.crop, lineWidth * 1.5, [12 * unit, 8 * unit]);
      continue;
    }

    const colour =
      zone.severity === "blocked" ? COLOURS.blocked : COLOURS.risky;
    const hatch = zone.severity === "blocked" ? blockedHatch : riskyHatch;
    const fillOpacity =
      zone.severity === "blocked" ? options.opacity : options.opacity * 0.5;

    ctx.save();
    ctx.globalAlpha = fillOpacity;
    ctx.fillStyle = colour;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    if (hatch) {
      ctx.globalAlpha = fillOpacity * 0.7;
      ctx.fillStyle = hatch;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();

    strokeRect(ctx, r, colour, lineWidth);
  }

  if (options.showSafeArea && safeArea.w > 0 && safeArea.h > 0) {
    strokeRect(ctx, safeArea, COLOURS.safe, lineWidth * 2, [
      20 * unit,
      12 * unit,
    ]);
  }

  if (options.showThirds) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COLOURS.guide;
    ctx.lineWidth = lineWidth * 0.75;
    ctx.setLineDash([6 * unit, 6 * unit]);
    ctx.beginPath();
    for (const fraction of [1 / 3, 2 / 3]) {
      ctx.moveTo(page.width * fraction, 0);
      ctx.lineTo(page.width * fraction, page.height);
      ctx.moveTo(0, page.height * fraction);
      ctx.lineTo(page.width, page.height * fraction);
    }
    ctx.stroke();
    ctx.restore();
  }

  if (options.showCentre) {
    const arm = Math.min(page.width, page.height) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = COLOURS.guide;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(page.width / 2 - arm, page.height / 2);
    ctx.lineTo(page.width / 2 + arm, page.height / 2);
    ctx.moveTo(page.width / 2, page.height / 2 - arm);
    ctx.lineTo(page.width / 2, page.height / 2 + arm);
    ctx.stroke();
    ctx.restore();
  }

  if (options.showLabels) {
    for (const zone of zones) {
      drawLabel(
        ctx,
        zone.label,
        zone.pageRect,
        zone.kind === "crop"
          ? COLOURS.crop
          : zone.severity === "blocked"
            ? COLOURS.blocked
            : COLOURS.risky,
        fontSize,
      );
    }

    if (options.showSafeArea && safeArea.w > 0 && safeArea.h > 0) {
      drawLabel(ctx, "Safe area", safeArea, COLOURS.safe, fontSize);
    }
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    renderedWidth: width,
    renderedHeight: height,
  };
};
