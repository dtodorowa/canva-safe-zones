import type { Rect } from "../lib/geometry";
import type { OverlayOptions } from "../lib/overlay";
import { OVERLAY_COLOURS } from "../lib/overlay";
import type { PageSize, ResolvedZone } from "../lib/zones";
import * as styles from "styles/app.css";

/** Tallest the preview is allowed to get inside the panel. */
const MAX_PREVIEW_HEIGHT = 380;

type Props = {
  page: PageSize;
  zones: readonly ResolvedZone[];
  safeArea: Rect;
  options: OverlayOptions;
};

const zoneColour = (zone: ResolvedZone): string => {
  if (zone.kind === "crop") {
    return OVERLAY_COLOURS.crop;
  }
  return zone.severity === "blocked"
    ? OVERLAY_COLOURS.blocked
    : OVERLAY_COLOURS.risky;
};

export const OverlayPreview = ({ page, zones, safeArea, options }: Props) => {
  const unit = Math.max(page.width, page.height) / 1000;
  const aspect = page.width / page.height;

  return (
    <div
      className={styles.previewFrame}
      style={{
        aspectRatio: `${page.width.toString()} / ${page.height.toString()}`,
        maxWidth: `${(MAX_PREVIEW_HEIGHT * aspect).toString()}px`,
      }}
    >
      <svg
        viewBox={`0 0 ${page.width.toString()} ${page.height.toString()}`}
        className={styles.previewSvg}
        role="img"
        aria-label="Preview of the safe zones for this format"
      >
        {zones.map((zone) => {
          const r = zone.pageRect;
          const colour = zoneColour(zone);

          if (zone.kind === "crop") {
            return (
              <rect
                key={zone.id}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill="none"
                stroke={colour}
                strokeWidth={3 * unit}
                strokeDasharray={`${(14 * unit).toString()} ${(9 * unit).toString()}`}
              />
            );
          }

          return (
            <g key={zone.id}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={colour}
                fillOpacity={
                  zone.severity === "blocked"
                    ? options.opacity
                    : options.opacity * 0.5
                }
              />
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill="none"
                stroke={colour}
                strokeWidth={2 * unit}
              />
            </g>
          );
        })}

        {options.showThirds &&
          [1 / 3, 2 / 3].map((fraction) => (
            <g key={fraction} stroke="#FFFFFF" strokeOpacity={0.5}>
              <line
                x1={page.width * fraction}
                y1={0}
                x2={page.width * fraction}
                y2={page.height}
                strokeWidth={1.5 * unit}
                strokeDasharray={`${(8 * unit).toString()} ${(8 * unit).toString()}`}
              />
              <line
                x1={0}
                y1={page.height * fraction}
                x2={page.width}
                y2={page.height * fraction}
                strokeWidth={1.5 * unit}
                strokeDasharray={`${(8 * unit).toString()} ${(8 * unit).toString()}`}
              />
            </g>
          ))}

        {options.showCentre && (
          <g stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2 * unit}>
            <line
              x1={page.width / 2 - Math.min(page.width, page.height) * 0.06}
              y1={page.height / 2}
              x2={page.width / 2 + Math.min(page.width, page.height) * 0.06}
              y2={page.height / 2}
            />
            <line
              x1={page.width / 2}
              y1={page.height / 2 - Math.min(page.width, page.height) * 0.06}
              x2={page.width / 2}
              y2={page.height / 2 + Math.min(page.width, page.height) * 0.06}
            />
          </g>
        )}

        {options.showSafeArea && safeArea.w > 0 && safeArea.h > 0 && (
          <rect
            x={safeArea.x}
            y={safeArea.y}
            width={safeArea.w}
            height={safeArea.h}
            fill="none"
            stroke={OVERLAY_COLOURS.safe}
            strokeWidth={4 * unit}
            strokeDasharray={`${(22 * unit).toString()} ${(14 * unit).toString()}`}
          />
        )}
      </svg>
    </div>
  );
};
