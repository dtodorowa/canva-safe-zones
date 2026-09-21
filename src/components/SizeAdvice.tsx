import { Alert, Rows, Text } from "@canva/app-ui-kit";
import type { Format } from "../data/formats";
import { FORMATS, PLATFORM_LABELS } from "../data/formats";
import { describeAspect } from "../lib/geometry";
import type { PageSize } from "../lib/zones";

type Props = {
  page: PageSize | undefined;
  format: Format;
};

const px = (n: number): string => Math.round(n).toString();

const size = (w: number, h: number): string =>
  `${px(w)} × ${px(h)} (${describeAspect(w, h)})`;

export const SizeAdvice = ({ page, format }: Props) => {
  const target = size(format.width, format.height);
  const siblings = FORMATS.filter(
    (f) => f.platform === format.platform && f.id !== format.id,
  );

  if (!page) {
    return (
      <Alert tone="info">
        This page has no fixed dimensions, so there's nothing to compare. The
        guides below are drawn at {target}.
      </Alert>
    );
  }

  const current = size(page.width, page.height);
  const sameAspect =
    Math.abs(page.width / page.height - format.width / format.height) < 0.005;
  const exact =
    Math.round(page.width) === format.width &&
    Math.round(page.height) === format.height;

  return (
    <Rows spacing="1u">
      {exact && (
        <Alert tone="positive">
          This page is {current} — exactly the size{" "}
          {PLATFORM_LABELS[format.platform]} wants for a{" "}
          {format.label.toLowerCase()}.
        </Alert>
      )}

      {!exact && sameAspect && (
        <Alert tone="info">
          Right shape, different scale. This page is {current}; the recommended
          export is {target}.{" "}
          {page.width < format.width
            ? "Resize the design up before exporting, or it'll be upscaled on upload."
            : "Larger than needed, which is harmless — it'll be downscaled."}
        </Alert>
      )}

      {!exact && !sameAspect && (
        <Alert tone="warn">
          This page is {current}. A {format.label.toLowerCase()} wants {target}.
          Resize the design, or pick the format that matches what you're
          actually making — the guides below are stretched to fit this page, so
          they're only a rough indication.
        </Alert>
      )}

      {siblings.length > 0 && (
        <Text size="small" tone="tertiary">
          Other {PLATFORM_LABELS[format.platform]} sizes:{" "}
          {siblings
            .map((f) => `${f.label} ${px(f.width)}×${px(f.height)}`)
            .join(" · ")}
        </Text>
      )}
    </Rows>
  );
};
