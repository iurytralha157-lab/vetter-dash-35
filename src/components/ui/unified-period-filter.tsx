import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
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

  const handlePreset = (preset: UnifiedPeriod) => {
    onChange(preset);
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (pendingRange?.from && pendingRange?.to) {
      onChange("custom", { from: pendingRange.from, to: pendingRange.to });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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

        {/* Calendar */}
        <Calendar
          mode="range"
          selected={
            pendingRange?.from
              ? { from: pendingRange.from, to: pendingRange.to }
              : undefined
          }
          onSelect={(range) =>
            setPendingRange(range ? { from: range.from, to: range.to } : undefined)
          }
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
