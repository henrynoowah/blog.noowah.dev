import { t, type Locale } from "./ui";

export const areas = ["dev", "hobbies"] as const;
export type Area = (typeof areas)[number];

export function isArea(value: unknown): value is Area {
  return typeof value === "string" && (areas as readonly string[]).includes(value);
}

export function areaLabel(locale: Locale, area: Area): string {
  return t(locale, `area.${area}.label`);
}

export function areaDescription(locale: Locale, area: Area): string {
  return t(locale, `area.${area}.description`);
}

/** The real sub-topics each area covers, shown on the landing cards. */
export function areaTopics(locale: Locale, area: Area): string[] {
  return [
    t(locale, `area.${area}.topic1`),
    t(locale, `area.${area}.topic2`),
    t(locale, `area.${area}.topic3`),
  ].filter(Boolean);
}

export function areaHref(locale: Locale, area: Area): string {
  return `/${locale}/${area}/`;
}

export function postHref(locale: Locale, area: Area, slug: string): string {
  return `/${locale}/${area}/${slug}`;
}
