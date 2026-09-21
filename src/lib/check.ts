import { openDesign } from "@canva/design";
import type { Rect } from "./geometry";
import { overlapFraction, rotatedBounds } from "./geometry";
import type { PageSize, ResolvedZone } from "./zones";

export type CheckedElement = {
  key: string;
  type: string;
  /** Text content where we can read it, otherwise a description of the type. */
  label: string;
  bounds: Rect;
  rotated: boolean;
  /** Inside a group whose rotation we couldn't unwind. */
  approximate: boolean;
};

export type Violation = {
  element: CheckedElement;
  zone: ResolvedZone;
  /** Share of the element sitting inside the zone, 0–1. */
  fraction: number;
};

export type CheckReport = {
  page: PageSize;
  inspected: number;
  ignoredFullBleed: number;
  violations: Violation[];
  /** Clear of every zone but crossing the safe-area edge. */
  outsideSafeArea: CheckedElement[];
};

/** Below this share of an element, an overlap is a rounding artefact. */
const THRESHOLDS: Record<string, number> = {
  text: 0.005,
  richtext: 0.005,
};
const DEFAULT_THRESHOLD = 0.03;

/** An element this large is a background, not something to warn about. */
const FULL_BLEED = 0.98;

type Geometry = {
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number;
};

const isGeometry = (node: unknown): node is Geometry => {
  if (typeof node !== "object" || node == null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    typeof n.top === "number" &&
    typeof n.left === "number" &&
    typeof n.width === "number" &&
    typeof n.height === "number"
  );
};

const nodeType = (node: unknown): string => {
  const type = (node as { type?: unknown }).type;
  return typeof type === "string" ? type : "unknown";
};

const rotationOf = (node: unknown): number => {
  const rotation = (node as { rotation?: unknown }).rotation;
  return typeof rotation === "number" ? rotation : 0;
};

const childrenOf = (node: unknown): unknown[] => {
  const contents = (node as { contents?: { toArray?: () => unknown[] } })
    .contents;
  if (!contents || typeof contents.toArray !== "function") {
    return [];
  }
  return contents.toArray();
};

const readPlaintext = async (node: unknown): Promise<string | undefined> => {
  const text = (node as { text?: { readPlaintext?: () => unknown } }).text;
  if (!text || typeof text.readPlaintext !== "function") {
    return undefined;
  }
  try {
    const value = await text.readPlaintext();
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
};

const TYPE_LABELS: Record<string, string> = {
  rect: "Image or shape box",
  shape: "Shape",
  group: "Group",
  embed: "Embed",
  text: "Text",
  richtext: "Text",
  table: "Table",
  line: "Line",
};

const describe = (type: string, text: string | undefined): string => {
  const trimmed = text?.replace(/\s+/g, " ").trim();
  if (trimmed) {
    return trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed;
  }
  return TYPE_LABELS[type] ?? type;
};

type FlattenArgs = {
  node: unknown;
  offsetX: number;
  offsetY: number;
  approximate: boolean;
  path: string;
  out: CheckedElement[];
};

const flatten = async ({
  node,
  offsetX,
  offsetY,
  approximate,
  path,
  out,
}: FlattenArgs): Promise<void> => {
  if (!isGeometry(node)) {
    return;
  }

  const type = nodeType(node);
  const rotation = rotationOf(node);
  const box: Rect = {
    x: offsetX + node.left,
    y: offsetY + node.top,
    w: node.width,
    h: node.height,
  };

  // An unrotated group is just a translation, so its children can be measured
  // exactly. A rotated one would need a full transform, so it's reported whole.
  if (type === "group") {
    const children = childrenOf(node);
    if (children.length > 0 && rotation === 0) {
      let index = 0;
      for (const child of children) {
        await flatten({
          node: child,
          offsetX: box.x,
          offsetY: box.y,
          approximate,
          path: `${path}.${index.toString()}`,
          out,
        });
        index += 1;
      }
      return;
    }
  }

  out.push({
    key: path,
    type,
    label: describe(type, await readPlaintext(node)),
    bounds: rotatedBounds(box, rotation),
    rotated: rotation !== 0,
    approximate: approximate || (type === "group" && rotation !== 0),
  });
};

const isFullBleed = (bounds: Rect, page: PageSize): boolean =>
  bounds.w >= page.width * FULL_BLEED && bounds.h >= page.height * FULL_BLEED;

const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x - 1 &&
  inner.y >= outer.y - 1 &&
  inner.x + inner.w <= outer.x + outer.w + 1 &&
  inner.y + inner.h <= outer.y + outer.h + 1;

export class UnsupportedPageError extends Error {}

export type CheckArgs = {
  zones: readonly ResolvedZone[];
  safeArea: Rect;
  ignoreFullBleed: boolean;
};

export const checkCurrentPage = async ({
  zones,
  safeArea,
  ignoreFullBleed,
}: CheckArgs): Promise<CheckReport> => {
  let report: CheckReport | undefined;

  await openDesign({ type: "current_page" }, async (session) => {
    const page = session.page;

    if (page.type !== "absolute" || !page.dimensions) {
      throw new UnsupportedPageError(
        "This page has no fixed dimensions, so there's nothing to measure against.",
      );
    }

    const pageSize: PageSize = {
      width: page.dimensions.width,
      height: page.dimensions.height,
    };

    const elements: CheckedElement[] = [];
    let index = 0;
    for (const element of page.elements.toArray()) {
      await flatten({
        node: element,
        offsetX: 0,
        offsetY: 0,
        approximate: false,
        path: index.toString(),
        out: elements,
      });
      index += 1;
    }

    const ignored = ignoreFullBleed
      ? elements.filter((e) => isFullBleed(e.bounds, pageSize))
      : [];
    const considered = elements.filter((e) => !ignored.includes(e));

    const violations: Violation[] = [];
    for (const element of considered) {
      const threshold = THRESHOLDS[element.type] ?? DEFAULT_THRESHOLD;
      for (const zone of zones) {
        const fraction = overlapFraction(element.bounds, zone.pageRect);
        if (fraction > threshold) {
          violations.push({ element, zone, fraction });
        }
      }
    }

    const flagged = new Set(violations.map((v) => v.element.key));
    const outsideSafeArea = considered.filter(
      (e) => !flagged.has(e.key) && !contains(safeArea, e.bounds),
    );

    violations.sort((a, b) => b.fraction - a.fraction);

    report = {
      page: pageSize,
      inspected: considered.length,
      ignoredFullBleed: ignored.length,
      violations,
      outsideSafeArea,
    };
  });

  if (!report) {
    throw new Error("The page could not be read.");
  }

  return report;
};
