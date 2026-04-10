import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { evolutionApiService } from "@/services/evolutionApiService";
import { Wifi, WifiOff, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppInstanceCardProps {
  instance: any;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

export function WhatsAppInstanceCard({ instance, isSelected, onSelect }: WhatsAppInstanceCardProps) {
  const instanceName = instance.instance?.instanceName || instance.instanceName || "unknown";

  const { data: status } = useQuery({
    queryKey: ["evolution-status", instanceName],
    queryFn: () => evolutionApiService.getInstanceStatus(instanceName),
    refetchInterval: 30000,
  });

  const connectionState = status?.instance?.state || status?.state || "unknown";
  const isConnected = connectionState === "open";

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md border-2",
        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"
      )}
      onClick={() => onSelect(instanceName)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            isConnected ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
          )}>
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{instanceName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isConnected ? (
                <Wifi className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={cn("text-xs", isConnected ? "text-green-500" : "text-muted-foreground")}>
                {isConnected ? "Conectado" : connectionState}
              </span>
            </div>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
          {isConnected ? "Online" : "Offline"}
        </Badge>
      </div>
      {isSelected && (
        <p className="text-xs text-primary mt-3">Grupos carregados abaixo ↓</p>
      )}
    </Card>
  );
}
