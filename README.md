# Safe Zones

A Canva app that draws the parts of a frame Instagram, Facebook, TikTok and
YouTube cover with their own UI, then reads the page back and tells you what
you put there anyway.

Three things it does:

- **Shows the zones.** Pick a format and the panel draws a live preview of the
  top bar, caption block, action rail and crop lines.
- **Adds guides to the page.** One PNG layer at page size, pinned to 0,0.
  Delete or hide it before exporting.
- **Checks the page.** Reads every element's position through the Design
  Editing API and reports what overlaps a zone, with the percentage covered.

It also names the size mismatch. Open a 1080 × 1350 page, pick Reel, and it
says so rather than drawing stretched guides and letting you find out later.

14 formats: Instagram feed (4:5, 1:1, 1.91:1), Stories and Reels; Facebook
feed, Stories, link previews, page covers and event covers; TikTok; YouTube
Shorts; plus a cross-platform vertical that is the worst case of all three
vertical formats at once.

## Running it

You need a Canva account and the Canva CLI (`npm install -g @canva/cli`).

1. `npm install`
2. Create the app record in Canva. Either use the Developer Portal at
   [canva.com/developers/apps](https://www.canva.com/developers/apps) and copy
   the app ID, or run `canva login && canva apps link` from this directory and
   pick an existing app.
3. Put the ID in `.env` as `CANVA_APP_ID=...`. `npm install` creates `.env`
   from `.env.template` if it isn't there yet.
4. In the Developer Portal, under **Inside Canva → Permissions**, enable
   `canva:design:content:read` and `canva:design:content:write`. They are
   already declared in [canva-app.json](canva-app.json), but the Portal has to
   agree.
5. `npm start`, then set **Code upload → App source → Development URL** to
   `http://localhost:8080` and hit **Preview**.

Useful while developing:

```bash
npm run lint:check   # eslint + tsc
npm test             # zone maths and dataset invariants
npm run sheet        # writes safe-zones.svg: every format on one page
```

`npm run sheet` is the fastest way to check a change to the zone data. Open
the SVG and look at it.

## Where the numbers come from

None of these platforms publish a pixel-exact safe-zone spec sheet, and the
ones that come closest move their UI without telling anyone. Published
guidance for the Reels bottom bar ranges from 320px to 480px depending on who
you ask.

So every zone in [src/data/formats.ts](src/data/formats.ts) carries a
confidence:

| Confidence   | Means                                                       |
| ------------ | ----------------------------------------------------------- |
| `documented` | Straight from the platform's own guidance                    |
| `measured`   | Taken off the rendered app UI                                |
| `estimate`   | Community consensus, worth checking against the real app     |

The panel shows the confidence as a badge next to each zone, so you know which
numbers to trust. When a platform moves something, edit the `rect` in
`formats.ts`, run `npm run sheet`, and look at the result. Nothing else needs
to change: the rest of the app derives the safe area, the preview, the PNG and
the check from that one number.

Zones also have a `severity`. `blocked` zones get carved out of the safe area.
`risky` zones are drawn and checked but left out of the safe rectangle, because
they depend on what you do (a link sticker, a boosted post) rather than on the
platform always being there.

## How the check works

`checkCurrentPage` opens the current page, walks the element tree, and compares
each element's bounding box against each enabled zone.

- Unrotated groups are flattened, so it reports the text inside a group rather
  than the group itself. A rotated group is reported whole and flagged as
  approximate, because unwinding the transform would take more than a
  translation.
- Rotated elements use the axis-aligned bounding box of the rotation, which
  errs toward reporting overlaps that are technically clear at the corners.
- Anything covering 98% or more of the page is treated as a background and
  skipped. That also skips the guide layer the app adds.
- Text trips on 0.5% overlap; everything else on 3%. A logo clipping a corner
  by two pixels is not worth a warning, a headline clipping it is.

## Layout

```
src/data/formats.ts   Every format and zone. Edit this one.
src/lib/geometry.ts   Rects, intersections, rotated bounds, aspect ratios
src/lib/zones.ts      Scales zones onto a real page, derives the safe area
src/lib/overlay.ts    Draws the PNG that gets added to the page
src/lib/check.ts      Reads the page and finds overlaps
src/components/       Panel UI
```

## Before submitting to the marketplace

The UI is English-only and
[eslint.config.mjs](eslint.config.mjs) turns off `formatjs/no-literal-string`.
Canva's public app review expects react-intl, so switch those rules back on and
wrap the strings before submitting. `CANVA_BACKEND_HOST` in `.env` also still
points at localhost, though nothing in the app talks to a backend yet.
