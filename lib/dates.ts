import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "America/Denver";

/** The local (timeZone) calendar date of `instant`, as "yyyy-MM-dd". */
export function getLocalDateString(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return format(toZonedTime(instant, timeZone), "yyyy-MM-dd");
}
