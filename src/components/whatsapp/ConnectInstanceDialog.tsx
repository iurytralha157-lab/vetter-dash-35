import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { evolutionApiService } from "@/services/evolutionApiService";
import { toast } from "sonner";
import { Loader2, QrCode, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ConnectInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string;
}

export function ConnectInstanceDialog({ open, onOpenChange, instanceName }: ConnectInstanceDialogProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["evolution-connect", instanceName],
    queryFn: () => evolutionApiService.connectInstance(instanceName),
    enabled: open && !!instanceName,
    refetchInterval: 20000,
  });

  const qrBase64 = data?.base64 || data?.qrcode?.base64 || null;
  const pairingCode = data?.pairingCode || data?.code || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar: {instanceName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          ) : qrBase64 ? (
            <>
              <img
                src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg border border-border"
              />
              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp no celular → Aparelhos conectados → Conectar → Escaneie o QR Code
              </p>
            </>
          ) : pairingCode ? (
            <>
              <div className="bg-muted rounded-lg p-6 text-center">
                <p className="text-2xl font-mono font-bold tracking-widest text-foreground">{pairingCode}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp → Aparelhos conectados → Conectar → Inserir código
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Não foi possível gerar QR Code. A instância pode já estar conectada.
            </p>
          )}

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
