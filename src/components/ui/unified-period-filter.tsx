import { useState, useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UnifiedPeriod =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_15d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

interface CustomDateRange {
  from: Date;
  to: Date;
}

interface UnifiedPeriodFilterProps {
  value: UnifiedPeriod;
  customRange?: CustomDateRange;
  onChange: (value: UnifiedPeriod, customRange?: CustomDateRange) => void;
  className?: string;
}

const presetOptions: { value: UnifiedPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
  { value: "this_quarter", label: "Este trimestre" },
  { value: "this_year", label: "Este ano" },
];

const getLabel = (value: UnifiedPeriod, customRange?: CustomDateRange) => {
  if (value === "custom" && customRange) {
    return `${format(customRange.from, "dd/MM/yy", { locale: pt })} - ${format(customRange.to, "dd/MM/yy", { locale: pt })}`;
  }
  return presetOptions.find((o) => o.value === value)?.label ?? "Período";
};

/** Compute the actual date range for a preset period */
const getPresetDateRange = (period: UnifiedPeriod): { from: Date; to: Date } | undefined => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = subDays(today, 1);
      return { from: y, to: y };
    }
    case "last_7d":
      return { from: subDays(today, 6), to: today };
    case "last_15d":
      return { from: subDays(today, 14), to: today };
    case "last_30d":
      return { from: subDays(today, 29), to: today };
    case "this_month":
      return { from: startOfMonth(today), to: today };
    case "last_month": {
      const prev = subMonths(today, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "this_quarter":
      return { from: startOfQuarter(today), to: today };
    case "this_year":
      return { from: startOfYear(today), to: today };
    default:
      return undefined;
  }
};

export function UnifiedPeriodFilter({
  value,
  customRange,
  onChange,
  className,
}: UnifiedPeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<
    { from?: Date; to?: Date } | undefined
  >(customRange ? { from: customRange.from, to: customRange.to } : undefined);

  // Compute the displayed calendar range based on preset or custom
  const calendarRange = useMemo(() => {
    if (value === "custom" && customRange) {
      return { from: customRange.from, to: customRange.to };
    }
    return getPresetDateRange(value);
  }, [value, customRange]);

  // The calendar month to display — show the "from" date's month
  const defaultMonth = useMemo(() => {
    if (pendingRange?.from) return pendingRange.from;
    if (calendarRange?.from) return calendarRange.from;
    return new Date();
  }, [pendingRange, calendarRange]);

  const handlePreset = (preset: UnifiedPeriod) => {
    setPendingRange(undefined);
    onChange(preset);
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (pendingRange?.from && pendingRange?.to) {
      onChange("custom", { from: pendingRange.from, to: pendingRange.to });
      setOpen(false);
    }
  };

  // When the popover opens, sync pendingRange with the current preset range
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setPendingRange(value === "custom" && customRange
        ? { from: customRange.from, to: customRange.to }
        : undefined
      );
    }
    setOpen(isOpen);
  };

  // Displayed range: pending manual selection takes priority, otherwise show preset
  const displayedRange = pendingRange?.from
    ? { from: pendingRange.from, to: pendingRange.to }
    : calendarRange
      ? { from: calendarRange.from, to: calendarRange.to }
      : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 font-medium border-primary/30 text-primary hover:bg-primary/10",
            className
          )}
        >
          <CalendarDays className="h-4 w-4" />
          {getLabel(value, customRange)}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] p-4 space-y-4"
        align="start"
        sideOffset={8}
      >
        {/* Preset buttons grid */}
        <div className="grid grid-cols-2 gap-2">
          {presetOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={value === opt.value ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 text-xs font-medium",
                value === opt.value &&
                  "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => handlePreset(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Divider */}
        <div className="text-xs text-muted-foreground">
          Ou selecione um período:
        </div>

        {/* Calendar with preset range highlighted */}
        <Calendar
          mode="range"
          selected={displayedRange}
          onSelect={(range) => {
            if (range?.from && !range?.to) {
              // Single date clicked — treat as single-day range
              setPendingRange({ from: range.from, to: range.from });
            } else {
              setPendingRange(range ? { from: range.from, to: range.to } : undefined);
            }
          }}
          defaultMonth={defaultMonth}
          locale={pt}
          className="rounded-md border p-2 pointer-events-auto"
        />

        {/* Apply button */}
        <Button
          className="w-full"
          disabled={!pendingRange?.from || !pendingRange?.to}
          onClick={handleApplyCustom}
        >
          Aplicar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
