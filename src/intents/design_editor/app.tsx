import { useFeatureSupport } from "@canva/app-hooks";
import {
  Alert,
  Button,
  FormField,
  LoadingIndicator,
  Rows,
  Select,
  Slider,
  Switch,
  Text,
  Title,
} from "@canva/app-ui-kit";
import {
  addElementAtPoint,
  getCurrentPageContext,
  openDesign,
} from "@canva/design";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckResults } from "../../components/CheckResults";
import { OverlayPreview } from "../../components/OverlayPreview";
import { SizeAdvice } from "../../components/SizeAdvice";
import { ZoneControls } from "../../components/ZoneControls";
import type { Format } from "../../data/formats";
import {
  DEFAULT_FORMAT,
  FORMATS,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  defaultZoneIds,
  formatById,
  matchFormats,
} from "../../data/formats";
import type { CheckReport } from "../../lib/check";
import { UnsupportedPageError, checkCurrentPage } from "../../lib/check";
import { describeAspect } from "../../lib/geometry";
import type { OverlayOptions } from "../../lib/overlay";
import { OVERLAY_COLOURS, renderOverlay } from "../../lib/overlay";
import { loadPrefs, savePrefs } from "../../lib/prefs";
import type { PageSize } from "../../lib/zones";
import { computeSafeArea, resolveZones } from "../../lib/zones";
import * as styles from "styles/app.css";
import * as layout from "styles/components.css";

const selectOptions = PLATFORM_ORDER.map((platform) => ({
  label: PLATFORM_LABELS[platform],
  options: FORMATS.filter((f) => f.platform === platform).map((f) => ({
    value: f.id,
    label: f.label,
    description: f.surface,
  })),
})).filter((group) => group.options.length > 0);

const LEGEND = [
  { colour: OVERLAY_COLOURS.blocked, label: "Covered by platform UI" },
  { colour: OVERLAY_COLOURS.risky, label: "Risky — check it yourself" },
  { colour: OVERLAY_COLOURS.crop, label: "Cropped on some surfaces" },
  { colour: OVERLAY_COLOURS.safe, label: "Safe area" },
];

export const App = () => {
  const isSupported = useFeatureSupport();
  const canInsert = isSupported(addElementAtPoint);
  const canRead = isSupported(openDesign);

  const [prefs, setPrefs] = useState(loadPrefs);
  const [page, setPage] = useState<PageSize | undefined>(undefined);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [formatId, setFormatId] = useState<string>(DEFAULT_FORMAT.id);
  const [enabled, setEnabled] = useState<readonly string[]>([]);

  const [inserting, setInserting] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<CheckReport | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const format: Format = formatById(formatId) ?? DEFAULT_FORMAT;

  const applyFormat = useCallback(
    (nextId: string, source: Record<string, string[]>) => {
      const next = formatById(nextId);
      if (!next) {
        return;
      }
      setFormatId(nextId);
      setEnabled(source[nextId] ?? defaultZoneIds(next));
      setReport(undefined);
      setInserted(false);
    },
    [],
  );

  // Pick the format that matches the page the user already has open.
  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        const context = await getCurrentPageContext();
        if (cancelled) {
          return;
        }

        const stored = loadPrefs();
        if (context.dimensions) {
          const size = {
            width: context.dimensions.width,
            height: context.dimensions.height,
          };
          setPage(size);
          const best = matchFormats(size.width, size.height)[0];
          applyFormat(
            best?.format.id ?? DEFAULT_FORMAT.id,
            stored.zonesByFormat,
          );
        } else {
          applyFormat(DEFAULT_FORMAT.id, stored.zonesByFormat);
        }
      } catch {
        if (!cancelled) {
          applyFormat(DEFAULT_FORMAT.id, loadPrefs().zonesByFormat);
        }
      } finally {
        if (!cancelled) {
          setPageLoaded(true);
        }
      }
    };

    void read();
    return () => {
      cancelled = true;
    };
  }, [applyFormat]);

  const canvas: PageSize = page ?? {
    width: format.width,
    height: format.height,
  };

  const zones = useMemo(
    () => resolveZones(format, enabled, canvas),
    [format, enabled, canvas.width, canvas.height],
  );

  const safeArea = useMemo(
    () =>
      computeSafeArea(
        zones,
        canvas,
        (format.recommendedMargin * canvas.width) / format.width,
      ),
    [zones, canvas.width, canvas.height, format],
  );

  const persist = (next: Partial<typeof prefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    savePrefs(merged);
  };

  const setOption = <K extends keyof OverlayOptions>(
    key: K,
    value: OverlayOptions[K],
  ) => {
    persist({ options: { ...prefs.options, [key]: value } });
  };

  const toggleZone = (zoneId: string, checked: boolean) => {
    const next = checked
      ? [...enabled, zoneId]
      : enabled.filter((id) => id !== zoneId);
    setEnabled(next);
    persist({
      zonesByFormat: { ...prefs.zonesByFormat, [formatId]: [...next] },
    });
    setReport(undefined);
  };

  const addGuides = async () => {
    setError(undefined);
    setInserting(true);
    try {
      const overlay = renderOverlay(canvas, zones, safeArea, prefs.options);
      if (!overlay) {
        setError("This browser wouldn't give us a canvas to draw the guides.");
        return;
      }

      await addElementAtPoint({
        type: "image",
        dataUrl: overlay.dataUrl,
        altText: { text: "Safe zone guides", decorative: true },
        top: 0,
        left: 0,
        width: canvas.width,
        height: canvas.height,
      });
      setInserted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the guides.");
    } finally {
      setInserting(false);
    }
  };

  const runCheck = async () => {
    setError(undefined);
    setChecking(true);
    try {
      setReport(
        await checkCurrentPage({
          zones,
          safeArea,
          ignoreFullBleed: true,
        }),
      );
    } catch (e) {
      setReport(undefined);
      setError(
        e instanceof UnsupportedPageError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't read this page.",
      );
    } finally {
      setChecking(false);
    }
  };

  if (!pageLoaded) {
    return (
      <div className={layout.scrollContainer}>
        <LoadingIndicator size="medium" />
      </div>
    );
  }

  return (
    <div className={layout.scrollContainer}>
      <Rows spacing="2u">
        <Rows spacing="0.5u">
          <Title size="small">Safe zones</Title>
          <Text size="small" tone="tertiary">
            {page
              ? `This page is ${Math.round(page.width).toString()} × ${Math.round(page.height).toString()} (${describeAspect(page.width, page.height)}).`
              : "This page has no fixed dimensions."}
          </Text>
        </Rows>

        <FormField
          label="Format"
          control={(props) => (
            <Select
              {...props}
              stretch
              value={formatId}
              options={selectOptions}
              onChange={(value) => applyFormat(value, prefs.zonesByFormat)}
            />
          )}
        />

        <SizeAdvice page={page} format={format} />

        <Rows spacing="1u">
          <OverlayPreview
            page={canvas}
            zones={zones}
            safeArea={safeArea}
            options={prefs.options}
          />
          <div className={styles.legend}>
            {LEGEND.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ backgroundColor: item.colour }}
                />
                <Text size="small" tone="tertiary">
                  {item.label}
                </Text>
              </div>
            ))}
          </div>
        </Rows>

        {error && <Alert tone="critical">{error}</Alert>}

        <Rows spacing="1u">
          <Button
            variant="primary"
            stretch
            loading={inserting}
            disabled={!canInsert || inserting}
            onClick={addGuides}
            tooltipLabel={
              canInsert
                ? undefined
                : "Adding elements isn't supported in this design"
            }
          >
            Add guides to this page
          </Button>

          <Button
            variant="secondary"
            stretch
            loading={checking}
            disabled={!canRead || checking}
            onClick={runCheck}
            tooltipLabel={
              canRead ? undefined : "Reading the design isn't supported here"
            }
          >
            Check this page
          </Button>

          {inserted && (
            <Alert tone="positive" onDismiss={() => setInserted(false)}>
              Guides added as one image layer at the top. Delete or hide it
              before you export.
            </Alert>
          )}
        </Rows>

        {report && <CheckResults report={report} />}

        <Rows spacing="1u">
          <Title size="xsmall">Zones</Title>
          <ZoneControls
            format={format}
            enabled={enabled}
            onToggle={toggleZone}
          />
        </Rows>

        <Rows spacing="1u">
          <Title size="xsmall">Guides</Title>
          <Switch
            label="Safe area outline"
            value={prefs.options.showSafeArea}
            onChange={(value) => setOption("showSafeArea", value)}
          />
          <Switch
            label="Rule of thirds"
            value={prefs.options.showThirds}
            onChange={(value) => setOption("showThirds", value)}
          />
          <Switch
            label="Centre marks"
            value={prefs.options.showCentre}
            onChange={(value) => setOption("showCentre", value)}
          />
          <Switch
            label="Labels on the inserted image"
            description="Names each zone on the layer you add to the page."
            value={prefs.options.showLabels}
            onChange={(value) => setOption("showLabels", value)}
          />
          <FormField
            label="Zone opacity"
            control={(props) => (
              <Slider
                {...props}
                min={0.1}
                max={0.8}
                step={0.05}
                value={prefs.options.opacity}
                onChange={(value) => setOption("opacity", value)}
              />
            )}
          />
        </Rows>

        {format.tips.length > 0 && (
          <Rows spacing="0.5u">
            <Title size="xsmall">Notes</Title>
            {format.tips.map((tip) => (
              <Text key={tip} size="small" tone="tertiary">
                {tip}
              </Text>
            ))}
          </Rows>
        )}

        <Text size="small" tone="tertiary">
          None of these platforms publish a pixel-exact safe-zone spec, and
          their UI moves. Each zone carries a badge saying how solid its numbers
          are — treat anything marked Estimate as a starting point, not gospel.
        </Text>
      </Rows>
    </div>
  );
};
