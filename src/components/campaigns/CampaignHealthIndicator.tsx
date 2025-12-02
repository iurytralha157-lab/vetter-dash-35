import { Circle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CampaignHealthIndicatorProps {
  health: "green" | "yellow" | "red";
  cpl?: number | null;
  idealCPL?: number;
  size?: "sm" | "md" | "lg";
}

export function CampaignHealthIndicator({
  health,
  cpl,
  idealCPL,
  size = "md",
}: CampaignHealthIndicatorProps) {
  const colors = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
  };

  const sizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  };

  const tooltipMessages = {
    green: `CPL dentro do ideal${idealCPL ? ` (≤ R$ ${idealCPL.toFixed(2)})` : ""}`,
    yellow: `CPL acima do ideal${idealCPL ? ` (> R$ ${idealCPL.toFixed(2)})` : ""} mas dentro da margem`,
    red: cpl && cpl > 0 
      ? `CPL muito alto${idealCPL ? ` (> R$ ${(idealCPL * 1.2).toFixed(2)})` : ""}`
      : "Campanha com gasto mas sem leads",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center">
            <Circle className={`${colors[health]} ${sizes[size]} fill-current`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {tooltipMessages[health]}
            {cpl && cpl > 0 && <span className="block mt-1">CPL atual: R$ {cpl.toFixed(2)}</span>}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
