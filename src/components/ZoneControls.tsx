import { Badge, Checkbox, Rows, Text } from "@canva/app-ui-kit";
import type { Format, Zone, ZoneConfidence } from "../data/formats";
import { CONFIDENCE_LABELS } from "../data/formats";

const CONFIDENCE_TONE: Record<ZoneConfidence, "info" | "assist" | "warn"> = {
  documented: "info",
  measured: "assist",
  estimate: "warn",
};

const CONFIDENCE_SHORT: Record<ZoneConfidence, string> = {
  documented: "Published",
  measured: "Measured",
  estimate: "Estimate",
};

type Props = {
  format: Format;
  enabled: readonly string[];
  onToggle: (zoneId: string, checked: boolean) => void;
};

const zoneSize = (zone: Zone): string =>
  `${Math.round(zone.rect.w).toString()} × ${Math.round(zone.rect.h).toString()}px at ${Math.round(zone.rect.x).toString()}, ${Math.round(zone.rect.y).toString()}`;

export const ZoneControls = ({ format, enabled, onToggle }: Props) => {
  if (format.zones.length === 0) {
    return (
      <Text size="small" tone="tertiary">
        Nothing covers this format — the platform shows the whole frame. The
        safe area below is just breathing room at the edges.
      </Text>
    );
  }

  return (
    <Rows spacing="1u">
      {format.zones.map((zone) => (
        <Checkbox
          key={zone.id}
          value={zone.id}
          checked={enabled.includes(zone.id)}
          onChange={(_value, checked) => onToggle(zone.id, checked)}
          label={
            <span>
              {zone.label}{" "}
              <Badge
                tone={CONFIDENCE_TONE[zone.confidence]}
                text={CONFIDENCE_SHORT[zone.confidence]}
                tooltipLabel={CONFIDENCE_LABELS[zone.confidence]}
              />
            </span>
          }
          description={`${zone.note} (${zoneSize(zone)})`}
        />
      ))}
    </Rows>
  );
};
