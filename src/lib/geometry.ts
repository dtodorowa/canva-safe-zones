export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const area = (r: Rect): number => Math.max(0, r.w) * Math.max(0, r.h);

export const intersection = (a: Rect, b: Rect): Rect | undefined => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);

  if (right <= x || bottom <= y) {
    return undefined;
  }

  return { x, y, w: right - x, h: bottom - y };
};

export const scaleRect = (r: Rect, sx: number, sy: number): Rect => ({
  x: r.x * sx,
  y: r.y * sy,
  w: r.w * sx,
  h: r.h * sy,
});

export const insetRect = (r: Rect, inset: number): Rect => ({
  x: r.x + inset,
  y: r.y + inset,
  w: Math.max(0, r.w - inset * 2),
  h: Math.max(0, r.h - inset * 2),
});

/**
 * Axis-aligned bounding box of a rect rotated about its own centre.
 * Canva reports rotation in degrees, positive clockwise; the sign doesn't
 * matter here because the bounding box is symmetric under negation.
 */
export const rotatedBounds = (r: Rect, degrees: number): Rect => {
  const normalised = ((degrees % 360) + 360) % 360;
  if (normalised === 0) {
    return r;
  }

  const radians = (normalised * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const w = r.w * cos + r.h * sin;
  const h = r.w * sin + r.h * cos;

  return {
    x: r.x + r.w / 2 - w / 2,
    y: r.y + r.h / 2 - h / 2,
    w,
    h,
  };
};

/** How much of `subject` falls inside `zone`, as a fraction of the subject. */
export const overlapFraction = (subject: Rect, zone: Rect): number => {
  const subjectArea = area(subject);
  if (subjectArea === 0) {
    return 0;
  }

  const overlap = intersection(subject, zone);
  return overlap ? area(overlap) / subjectArea : 0;
};

/** Largest rect of the given aspect ratio that fits centred inside `outer`. */
export const centredCrop = (outer: Rect, aspect: number): Rect => {
  const outerAspect = outer.w / outer.h;
  const w = outerAspect > aspect ? outer.h * aspect : outer.w;
  const h = outerAspect > aspect ? outer.h : outer.w / aspect;

  return {
    x: outer.x + (outer.w - w) / 2,
    y: outer.y + (outer.h - h) / 2,
    w,
    h,
  };
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** "4:5", "9:16", "1.91:1" — whichever reads best for the ratio. */
export const describeAspect = (width: number, height: number): string => {
  const divisor = gcd(Math.round(width), Math.round(height));
  const w = Math.round(width) / divisor;
  const h = Math.round(height) / divisor;

  if (w <= 32 && h <= 32) {
    return `${w}:${h}`;
  }

  const ratio = width / height;
  return ratio >= 1
    ? `${(Math.round(ratio * 100) / 100).toString()}:1`
    : `1:${(Math.round((1 / ratio) * 100) / 100).toString()}`;
};
