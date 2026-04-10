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
  onConnect: (name: string) => void;
}

/** Extract instanceName from any Evolution API response shape */
function getInstanceName(inst: any): string {
  return inst?.instance?.instanceName
    || inst?.instanceName
    || inst?.instance?.name
    || inst?.name
    || "unknown";
}

function getConnectionState(inst: any): string {
  return inst?.instance?.connectionStatus
    || inst?.instance?.status
    || inst?.connectionStatus
    || inst?.status
    || "unknown";
}

export function WhatsAppInstanceCard({ instance, isSelected, onSelect, onConnect }: WhatsAppInstanceCardProps) {
  const instanceName = getInstanceName(instance);
  const inlineState = getConnectionState(instance);

  // Only fetch status if inline state is unknown
  const { data: status } = useQuery({
    queryKey: ["evolution-status", instanceName],
    queryFn: () => evolutionApiService.getInstanceStatus(instanceName),
    refetchInterval: 30000,
    enabled: instanceName !== "unknown",
  });

  const connectionState = status?.instance?.state || status?.state || inlineState;
  const isConnected = connectionState === "open" || connectionState === "connected";

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md border-2",
        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"
      )}
      onClick={() => {
        if (instanceName !== "unknown") {
          if (isConnected) {
            onSelect(instanceName);
          } else {
            onConnect(instanceName);
          }
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{instanceName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isConnected ? (
                <Wifi className="h-3.5 w-3.5 text-primary" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={cn("text-xs", isConnected ? "text-primary" : "text-muted-foreground")}>
                {isConnected ? "Conectado" : connectionState}
              </span>
            </div>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
          {isConnected ? "Online" : "Offline"}
        </Badge>
      </div>
      {isSelected && isConnected && (
        <p className="text-xs text-primary mt-3">Grupos carregados abaixo ↓</p>
      )}
      {!isConnected && (
        <p className="text-xs text-muted-foreground mt-3">Clique para conectar</p>
      )}
    </Card>
  );
}
