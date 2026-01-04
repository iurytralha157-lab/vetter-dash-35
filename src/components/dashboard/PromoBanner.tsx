import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoBannerProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export function PromoBanner({
  title = "Aumente suas conversões em 40%",
  subtitle = "Descubra como nossa IA pode otimizar suas campanhas automaticamente",
  ctaText = "Começar Agora",
  onCtaClick,
}: PromoBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-success/20">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-900/50 to-background" />
      
      {/* Glow effect */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {title}
          </h2>
          <p className="text-muted-foreground max-w-xl">
            {subtitle}
          </p>
        </div>
        
        <Button
          onClick={onCtaClick}
          className="btn-success flex items-center gap-2 whitespace-nowrap"
        >
          <Zap className="h-4 w-4" />
          {ctaText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
