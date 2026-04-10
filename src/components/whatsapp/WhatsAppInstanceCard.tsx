import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { evolutionApiService, LinkedInstance } from "@/services/evolutionApiService";
import { Wifi, WifiOff, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppInstanceCardProps {
  instance: LinkedInstance;
  isSelected: boolean;
  onSelect: (name: string) => void;
  onConnect: (name: string) => void;
  onUnlink: (name: string) => void;
}

export function WhatsAppInstanceCard({ instance, isSelected, onSelect, onConnect, onUnlink }: WhatsAppInstanceCardProps) {
  const instanceName = instance.instance_name;
  const displayName = instance.display_name || instanceName;

  const { data: status } = useQuery({
    queryKey: ["evolution-status", instanceName],
    queryFn: () => evolutionApiService.getInstanceStatus(instanceName),
    refetchInterval: 30000,
  });

  const connectionState = status?.instance?.state || status?.state || "unknown";
  const isConnected = connectionState === "open" || connectionState === "connected";

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md border-2 relative",
        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"
      )}
      onClick={() => {
        if (isConnected) {
          onSelect(instanceName);
        } else {
          onConnect(instanceName);
        }
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onUnlink(instanceName); }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center",
          isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-foreground pr-6">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-primary" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn("text-xs", isConnected ? "text-primary" : "text-muted-foreground")}>
              {isConnected ? "Conectado" : connectionState === "unknown" ? "Verificando..." : connectionState}
            </span>
          </div>
        </div>
      </div>

      {isSelected && isConnected && (
        <p className="text-xs text-primary mt-3">Grupos carregados abaixo ↓</p>
      )}
      {!isConnected && connectionState !== "unknown" && (
        <p className="text-xs text-muted-foreground mt-3">Clique para reconectar</p>
      )}
    </Card>
  );
}
