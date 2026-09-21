import type { Rect } from "../lib/geometry";

export type Platform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "cross";

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  cross: "Cross-platform",
};

export const PLATFORM_ORDER: Platform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "cross",
];

/**
 * `ui` zones are covered by the platform's own chrome. `crop` zones are parts
 * of the frame a surface throws away when it re-crops the image.
 */
export type ZoneKind = "ui" | "crop";

/** `blocked` means don't put anything there. `risky` means check it yourself. */
export type ZoneSeverity = "blocked" | "risky";

/**
 * None of these platforms publish a pixel-exact safe-zone spec, and the ones
 * that come closest change their UI without notice. This records how much to
 * trust each number so the panel can say so out loud.
 */
export type ZoneConfidence = "documented" | "measured" | "estimate";

export const CONFIDENCE_LABELS: Record<ZoneConfidence, string> = {
  documented: "From platform guidance",
  measured: "Measured from the app UI",
  estimate: "Community estimate — verify",
};

export type Zone = {
  id: string;
  label: string;
  kind: ZoneKind;
  severity: ZoneSeverity;
  confidence: ZoneConfidence;
  /** Pixels in the format's reference frame, from the top-left corner. */
  rect: Rect;
  note: string;
  /** Zones that are contested or situational start switched off. */
  defaultOff?: boolean;
};

export type Format = {
  id: string;
  platform: Platform;
  label: string;
  /** Where this design ends up. */
  surface: string;
  width: number;
  height: number;
  /** A design habit rather than a platform rule: breathing room at the edges. */
  recommendedMargin: number;
  zones: Zone[];
  tips: string[];
};

const VERTICAL = { width: 1080, height: 1920 };

/**
 * Pulled out of the list so there is always a format to fall back on without
 * indexing into an array that the compiler thinks might be empty.
 */
const IG_STORY: Format = {
  id: "ig-story",
  platform: "instagram",
  label: "Story",
  surface: "Full-screen story, 24 hours",
  ...VERTICAL,
  recommendedMargin: 64,
  zones: [
    {
      id: "ig-story-top",
      label: "Top bar",
      kind: "ui",
      severity: "blocked",
      confidence: "documented",
      rect: { x: 0, y: 0, w: 1080, h: 250 },
      note: "Progress bars, profile picture, handle, timestamp and the close button.",
    },
    {
      id: "ig-story-bottom",
      label: "Reply bar",
      kind: "ui",
      severity: "blocked",
      confidence: "documented",
      rect: { x: 0, y: 1670, w: 1080, h: 250 },
      note: "The 'Send message' field, plus the like and share buttons.",
    },
    {
      id: "ig-story-sticker",
      label: "Link / CTA sticker landing area",
      kind: "ui",
      severity: "risky",
      confidence: "estimate",
      rect: { x: 0, y: 1450, w: 1080, h: 220 },
      note: "Where a link, poll or question sticker usually ends up if you add one. Only relevant if you do.",
      defaultOff: true,
    },
  ],
  tips: [
    "The classic safe area is the middle 1080 × 1420 — 250px clear at the top and bottom.",
    "Swipe-up links are gone; a link sticker sits lower in the frame, so leave it room.",
  ],
};

export const DEFAULT_FORMAT = IG_STORY;

export const FORMATS: Format[] = [
  {
    id: "ig-feed-portrait",
    platform: "instagram",
    label: "Feed post — portrait 4:5",
    surface: "Main feed, the largest image the feed will show",
    width: 1080,
    height: 1350,
    recommendedMargin: 64,
    zones: [
      {
        id: "ig-grid-square",
        label: "Square grid crop",
        kind: "crop",
        severity: "risky",
        confidence: "measured",
        rect: { x: 0, y: 135, w: 1080, h: 1080 },
        note: "Explore, search and embeds still crop to a square. The profile grid itself now shows the full 4:5, so this is about every other surface.",
      },
    ],
    tips: [
      "4:5 is the tallest ratio the feed shows without cropping — it buys you the most screen height.",
      "Keep the subject inside the square crop and the post survives being re-cropped anywhere.",
    ],
  },
  {
    id: "ig-feed-square",
    platform: "instagram",
    label: "Feed post — square 1:1",
    surface: "Main feed, safest ratio for carousels that mix sources",
    width: 1080,
    height: 1080,
    recommendedMargin: 64,
    zones: [],
    tips: [
      "Carousels lock every slide to the ratio of the first one. Square is the safe choice if the slides came from different places.",
    ],
  },
  {
    id: "ig-feed-landscape",
    platform: "instagram",
    label: "Feed post — landscape 1.91:1",
    surface: "Main feed, widest ratio the feed accepts",
    width: 1080,
    height: 566,
    recommendedMargin: 48,
    zones: [],
    tips: [
      "Landscape takes the least vertical space in the feed, so it gets scrolled past fastest. Use it when the image genuinely is wide.",
    ],
  },
  IG_STORY,
  {
    id: "ig-reels",
    platform: "instagram",
    label: "Reel",
    surface: "Full-screen Reels tab and feed",
    ...VERTICAL,
    recommendedMargin: 64,
    zones: [
      {
        id: "ig-reels-top",
        label: "Top bar",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 0, w: 1080, h: 250 },
        note: "Status bar, the 'Reels' title and the camera button.",
      },
      {
        id: "ig-reels-bottom",
        label: "Caption block",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 1500, w: 1080, h: 420 },
        note: "Handle, caption, audio ticker and the follow button. Grows when the caption is long or the viewer taps 'more'.",
      },
      {
        id: "ig-reels-right",
        label: "Action rail",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 900, y: 880, w: 180, h: 640 },
        note: "Like, comment, share, more, and the spinning audio disc.",
      },
      {
        id: "ig-reels-cover-crop",
        label: "Profile grid cover crop",
        kind: "crop",
        severity: "risky",
        confidence: "measured",
        rect: { x: 0, y: 285, w: 1080, h: 1350 },
        note: "The cover frame shown on your profile grid is cropped to 4:5. Only matters for the frame you pick as the cover.",
        defaultOff: true,
      },
    ],
    tips: [
      "Reels chrome is heavier than Stories — the caption block alone eats around 420px.",
      "Published numbers vary between 350px and 450px at the bottom. The default here is on the cautious side.",
    ],
  },
  {
    id: "fb-feed-portrait",
    platform: "facebook",
    label: "Feed post — portrait 4:5",
    surface: "Main feed",
    width: 1080,
    height: 1350,
    recommendedMargin: 64,
    zones: [
      {
        id: "fb-feed-square-crop",
        label: "Square crop",
        kind: "crop",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 0, y: 135, w: 1080, h: 1080 },
        note: "Some Facebook surfaces and multi-image posts re-crop toward a square.",
        defaultOff: true,
      },
    ],
    tips: [
      "Facebook caps feed images at 4:5 the same way Instagram does; anything taller gets cropped.",
    ],
  },
  {
    id: "fb-feed-square",
    platform: "facebook",
    label: "Feed post — square 1:1",
    surface: "Main feed",
    width: 1080,
    height: 1080,
    recommendedMargin: 64,
    zones: [],
    tips: [],
  },
  {
    id: "fb-link-share",
    platform: "facebook",
    label: "Link preview image",
    surface: "The card Facebook builds when someone shares your URL",
    width: 1200,
    height: 630,
    recommendedMargin: 64,
    zones: [],
    tips: [
      "1200 × 630 is the Open Graph size — the same image works for most other platforms' link cards.",
      "The headline and domain render below the image, not on it, so the frame itself stays clear.",
    ],
  },
  {
    id: "fb-story",
    platform: "facebook",
    label: "Story",
    surface: "Full-screen story",
    ...VERTICAL,
    recommendedMargin: 64,
    zones: [
      {
        id: "fb-story-top",
        label: "Top bar",
        kind: "ui",
        severity: "blocked",
        confidence: "documented",
        rect: { x: 0, y: 0, w: 1080, h: 250 },
        note: "Progress bars, profile picture, name and timestamp.",
      },
      {
        id: "fb-story-bottom",
        label: "Reply bar",
        kind: "ui",
        severity: "blocked",
        confidence: "documented",
        rect: { x: 0, y: 1670, w: 1080, h: 250 },
        note: "The reply field and reaction buttons.",
      },
      {
        id: "fb-story-cta",
        label: "CTA button area",
        kind: "ui",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 0, y: 1560, w: 1080, h: 360 },
        note: "Where a call-to-action button sits on a boosted or ad story.",
        defaultOff: true,
      },
    ],
    tips: [
      "Same 250px top and bottom as Instagram Stories, so one design covers both.",
    ],
  },
  {
    id: "fb-page-cover",
    platform: "facebook",
    label: "Page cover photo",
    surface: "The banner across the top of a Facebook Page",
    width: 1640,
    height: 720,
    recommendedMargin: 0,
    zones: [
      {
        id: "fb-cover-desktop-top",
        label: "Cut off on desktop",
        kind: "crop",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 0, w: 1640, h: 48 },
        note: "Desktop shows a wider, shorter slice than mobile and trims the top.",
      },
      {
        id: "fb-cover-desktop-bottom",
        label: "Cut off on desktop",
        kind: "crop",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 672, w: 1640, h: 48 },
        note: "The matching trim at the bottom.",
      },
      {
        id: "fb-cover-mobile-left",
        label: "Cut off on mobile",
        kind: "crop",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 0, w: 180, h: 720 },
        note: "Mobile shows a narrower, taller slice and trims the sides.",
      },
      {
        id: "fb-cover-mobile-right",
        label: "Cut off on mobile",
        kind: "crop",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 1460, y: 0, w: 180, h: 720 },
        note: "The matching trim on the right.",
      },
      {
        id: "fb-cover-profile-photo",
        label: "Profile photo overlap",
        kind: "ui",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 60, y: 400, w: 360, h: 320 },
        note: "The Page's profile picture sits over the lower-left of the cover on desktop.",
      },
    ],
    tips: [
      "Desktop and mobile crop this image in opposite directions. What survives both is the middle 1280 × 624.",
      "Upload at 1640 × 720 and keep every word inside that middle block.",
    ],
  },
  {
    id: "fb-event-cover",
    platform: "facebook",
    label: "Event cover",
    surface: "The banner on a Facebook Event, and its share card",
    width: 1920,
    height: 1005,
    recommendedMargin: 80,
    zones: [
      {
        id: "fb-event-square-crop",
        label: "Square crop",
        kind: "crop",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 458, y: 0, w: 1005, h: 1005 },
        note: "Event listings and some share cards crop the cover toward a square.",
      },
      {
        id: "fb-event-detail-overlay",
        label: "Event title overlay",
        kind: "ui",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 0, y: 805, w: 1920, h: 200 },
        note: "On some surfaces the event name, date and host sit over the lower part of the cover.",
      },
    ],
    tips: [
      "1920 × 1005 is Facebook's own recommendation for event covers.",
      "The date and title already appear as text next to the cover — putting them in the image too is usually wasted space.",
    ],
  },
  {
    id: "tiktok-video",
    platform: "tiktok",
    label: "Video / photo post",
    surface: "Full-screen For You feed",
    ...VERTICAL,
    recommendedMargin: 64,
    zones: [
      {
        id: "tt-top",
        label: "Top bar",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 0, w: 1080, h: 140 },
        note: "Status bar and the Following / For You switcher.",
      },
      {
        id: "tt-bottom",
        label: "Caption and nav",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 1440, w: 1080, h: 480 },
        note: "Handle, caption, music ticker and the bottom navigation bar. The heaviest bottom chrome of any of these platforms.",
      },
      {
        id: "tt-right",
        label: "Action rail",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 900, y: 860, w: 180, h: 580 },
        note: "Profile, like, comment, bookmark, share and the spinning record.",
      },
      {
        id: "tt-left",
        label: "Left gutter",
        kind: "ui",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 0, y: 0, w: 60, h: 1920 },
        note: "A thin strip some devices shave off. Cheap insurance.",
        defaultOff: true,
      },
    ],
    tips: [
      "TikTok is the most restrictive of the three vertical formats. Design for TikTok and the same frame clears Reels and Shorts.",
    ],
  },
  {
    id: "yt-shorts",
    platform: "youtube",
    label: "Short",
    surface: "Full-screen Shorts player",
    ...VERTICAL,
    recommendedMargin: 64,
    zones: [
      {
        id: "yt-top",
        label: "Top bar",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 0, w: 1080, h: 120 },
        note: "Status bar, search and the more menu.",
      },
      {
        id: "yt-bottom",
        label: "Title and nav",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 1600, w: 1080, h: 320 },
        note: "Channel name, title, subscribe button and the bottom navigation bar.",
      },
      {
        id: "yt-right",
        label: "Action rail",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 940, y: 980, w: 140, h: 620 },
        note: "Like, dislike, comments, share and remix.",
      },
    ],
    tips: [
      "Shorts chrome is lighter than TikTok's, but the bottom third is still busy.",
    ],
  },
  {
    id: "universal-vertical",
    platform: "cross",
    label: "One vertical for all three",
    surface: "The union of Reels, TikTok and Shorts chrome",
    ...VERTICAL,
    recommendedMargin: 64,
    zones: [
      {
        id: "uni-top",
        label: "Top bar (worst case)",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 0, w: 1080, h: 250 },
        note: "Instagram's top bar is the tallest of the three.",
      },
      {
        id: "uni-bottom",
        label: "Bottom chrome (worst case)",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 0, y: 1440, w: 1080, h: 480 },
        note: "TikTok's caption block plus nav bar is the deepest of the three.",
      },
      {
        id: "uni-right",
        label: "Action rail (worst case)",
        kind: "ui",
        severity: "blocked",
        confidence: "measured",
        rect: { x: 900, y: 860, w: 180, h: 580 },
        note: "Instagram and TikTok both reach about 180px in from the right.",
      },
      {
        id: "uni-left",
        label: "Left gutter",
        kind: "ui",
        severity: "risky",
        confidence: "estimate",
        rect: { x: 0, y: 0, w: 60, h: 1920 },
        note: "Insurance against edge-to-edge cropping on odd screen shapes.",
        defaultOff: true,
      },
    ],
    tips: [
      "Roughly a 900 × 1190 window in the middle of the frame. Tight, but one export covers all three.",
    ],
  },
];

export const formatById = (id: string): Format | undefined =>
  FORMATS.find((f) => f.id === id);

export const defaultZoneIds = (format: Format): string[] =>
  format.zones.filter((z) => !z.defaultOff).map((z) => z.id);

export type FormatMatch = {
  format: Format;
  /** `exact` is the same pixels; `aspect` is the same shape at another scale. */
  kind: "exact" | "aspect" | "close";
  /** Difference in aspect ratio, for ordering the near misses. */
  aspectDelta: number;
};

/** How far off two aspect ratios are, as a fraction. Symmetric. */
const aspectDistance = (a: number, b: number): number =>
  Math.abs(a - b) / Math.max(a, b);

/** Formats that fit the given page, best first. */
export const matchFormats = (width: number, height: number): FormatMatch[] => {
  const pageAspect = width / height;

  return FORMATS.map((format): FormatMatch => {
    const delta = aspectDistance(pageAspect, format.width / format.height);
    const exact =
      Math.round(width) === format.width &&
      Math.round(height) === format.height;

    return {
      format,
      kind: exact ? "exact" : delta < 0.005 ? "aspect" : "close",
      aspectDelta: delta,
    };
  })
    .filter((m) => m.kind !== "close" || m.aspectDelta < 0.08)
    .sort((a, b) => {
      const rank = { exact: 0, aspect: 1, close: 2 };
      return rank[a.kind] - rank[b.kind] || a.aspectDelta - b.aspectDelta;
    });
};
