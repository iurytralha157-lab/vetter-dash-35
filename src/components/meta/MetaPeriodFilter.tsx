// Re-export unified period types for backwards compatibility
import type { UnifiedPeriod } from "@/components/ui/unified-period-filter";
export { UnifiedPeriodFilter as MetaPeriodFilter } from "@/components/ui/unified-period-filter";

export type MetaPeriod = 'today' | 'yesterday' | 'last_7d' | 'last_15d' | 'last_30d' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

/**
 * Maps UnifiedPeriod to the Meta API period parameter
 */
export function toMetaApiPeriod(period: UnifiedPeriod | MetaPeriod): string {
  switch (period) {
    case "today": return "today";
    case "yesterday": return "yesterday";
    case "last_7d": return "last_7d";
    case "last_15d": return "last_14d";
    case "last_30d": return "last_30d";
    case "this_month": return "this_month";
    case "last_month": return "last_month";
    case "this_quarter": return "last_90d";
    case "this_year": return "last_365d";
    default: return "last_7d";
  }
}

/**
 * Maps UnifiedPeriod to number of days for chart/history queries
 */
export function periodToDays(period: UnifiedPeriod | MetaPeriod): number {
  switch (period) {
    case "today": return 1;
    case "yesterday": return 1;
    case "last_7d": return 7;
    case "last_15d": return 15;
    case "last_30d": return 30;
    case "this_month": return 30;
    case "last_month": return 30;
    case "this_quarter": return 90;
    case "this_year": return 365;
    default: return 7;
  }
}
