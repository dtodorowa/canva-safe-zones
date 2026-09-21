import { Alert, Box, Rows, Text } from "@canva/app-ui-kit";
import type { CheckReport, Violation } from "../lib/check";
import * as styles from "styles/app.css";

type Props = {
  report: CheckReport;
};

type Grouped = {
  key: string;
  label: string;
  approximate: boolean;
  hits: Violation[];
};

const groupByElement = (violations: readonly Violation[]): Grouped[] => {
  const groups = new Map<string, Grouped>();

  for (const violation of violations) {
    const existing = groups.get(violation.element.key);
    if (existing) {
      existing.hits.push(violation);
      continue;
    }
    groups.set(violation.element.key, {
      key: violation.element.key,
      label: violation.element.label,
      approximate: violation.element.approximate,
      hits: [violation],
    });
  }

  return [...groups.values()].sort(
    (a, b) =>
      Math.max(...b.hits.map((h) => h.fraction)) -
      Math.max(...a.hits.map((h) => h.fraction)),
  );
};

const percent = (fraction: number): string =>
  `${Math.max(1, Math.round(fraction * 100)).toString()}%`;

export const CheckResults = ({ report }: Props) => {
  const grouped = groupByElement(report.violations);
  const strays = report.outsideSafeArea;

  return (
    <Rows spacing="1.5u">
      {grouped.length > 0 ? (
        <Alert tone="critical">
          {grouped.length === 1
            ? "1 element sits under the platform's own UI."
            : `${grouped.length.toString()} elements sit under the platform's own UI.`}
        </Alert>
      ) : strays.length > 0 ? (
        <Alert tone="warn">
          Nothing is under the UI, but{" "}
          {strays.length === 1
            ? "1 element crosses"
            : `${strays.length.toString()} elements cross`}{" "}
          the safe-area edge.
        </Alert>
      ) : (
        <Alert tone="positive">
          Clear. Everything on this page is inside the safe area.
        </Alert>
      )}

      {grouped.map((group) => (
        <Box
          key={group.key}
          padding="1u"
          background="neutralSubtle"
          borderRadius="standard"
        >
          <Rows spacing="0.5u">
            <Text variant="bold" size="small">
              {group.label}
            </Text>
            {group.hits.map((hit) => (
              <div key={hit.zone.id} className={styles.violationRow}>
                <Text size="small" tone="tertiary">
                  {hit.zone.label}
                </Text>
                <Text size="small" tone="critical">
                  {percent(hit.fraction)} covered
                </Text>
              </div>
            ))}
            {group.approximate && (
              <Text size="small" tone="tertiary">
                Inside a rotated group, so this is measured from the group's
                bounding box rather than the element itself.
              </Text>
            )}
          </Rows>
        </Box>
      ))}

      {strays.length > 0 && grouped.length > 0 && (
        <Text size="small" tone="tertiary">
          Also crossing the safe-area edge without hitting any UI:{" "}
          {strays.map((e) => e.label).join(", ")}.
        </Text>
      )}

      {strays.length > 0 && grouped.length === 0 && (
        <Text size="small" tone="tertiary">
          {strays.map((e) => e.label).join(", ")}.
        </Text>
      )}

      <Text size="small" tone="tertiary">
        Checked {report.inspected.toString()}{" "}
        {report.inspected === 1 ? "element" : "elements"}
        {report.ignoredFullBleed > 0
          ? `, skipped ${report.ignoredFullBleed.toString()} full-bleed ${
              report.ignoredFullBleed === 1 ? "layer" : "layers"
            } as background.`
          : "."}
      </Text>
    </Rows>
  );
};
