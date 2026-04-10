import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { evolutionApiService } from "@/services/evolutionApiService";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string;
  target: { type: "number" | "group"; id: string; name: string } | null;
}

export function WhatsAppSendDialog({ open, onOpenChange, instanceName, target }: WhatsAppSendDialogProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !target || !instanceName) return;
    setSending(true);
    try {
      if (target.type === "group") {
        await evolutionApiService.sendGroupMessage(instanceName, target.id, text.trim());
      } else {
        await evolutionApiService.sendText(instanceName, target.id, text.trim());
      }
      toast.success(`Mensagem enviada para ${target.name}`);
      setText("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar mensagem</DialogTitle>
          {target && (
            <p className="text-sm text-muted-foreground">
              Para: <span className="font-medium text-foreground">{target.name}</span>
            </p>
          )}
        </DialogHeader>

        <Textarea
          placeholder="Digite sua mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!text.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
