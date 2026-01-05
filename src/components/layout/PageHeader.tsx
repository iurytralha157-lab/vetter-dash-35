import { ReactNode } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PageHeaderProps {
  title: string;
  breadcrumb?: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageHeader({
  title,
  breadcrumb,
  subtitle,
  icon,
  actions,
  filters,
}: PageHeaderProps) {
  return (
    <Card className="surface-elevated overflow-hidden border-border/60">
      <CardContent className="p-0">
        <div className="relative">
          {/* Dot pattern texture */}
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/25 via-transparent to-emerald-500/15" />
          <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

          <div className="relative px-6 py-5 md:px-8 md:py-6">
            {/* Top row: breadcrumb + actions */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                {/* Breadcrumb */}
                {breadcrumb && (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border/60 bg-background/30 px-3 py-1.5 rounded-full mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {breadcrumb}
                    {subtitle && (
                      <>
                        <span className="text-[10px] opacity-70">•</span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                          {subtitle}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Title */}
                <div className="flex items-center gap-3">
                  {icon && (
                    <div className="text-primary">
                      {icon}
                    </div>
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
                </div>

                {/* Filters row */}
                {filters && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {filters}
                  </div>
                )}
              </div>

              {/* Actions */}
              {actions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
