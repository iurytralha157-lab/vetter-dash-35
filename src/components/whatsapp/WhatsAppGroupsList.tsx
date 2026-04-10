import { useQuery } from "@tanstack/react-query";
import { evolutionApiService } from "@/services/evolutionApiService";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Send, Search } from "lucide-react";
import { useState } from "react";

interface WhatsAppGroupsListProps {
  instanceName: string;
  onSendMessage: (groupJid: string, groupName: string) => void;
}

export function WhatsAppGroupsList({ instanceName, onSendMessage }: WhatsAppGroupsListProps) {
  const [search, setSearch] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["evolution-groups", instanceName],
    queryFn: () => evolutionApiService.listGroups(instanceName),
    enabled: !!instanceName,
  });

  const groupList = Array.isArray(groups) ? groups : [];
  const filtered = groupList.filter((g: any) => {
    const name = g.subject || g.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Grupos ({filtered.length})
        </h2>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          {groupList.length === 0 ? "Nenhum grupo encontrado nesta instância." : "Nenhum grupo corresponde à busca."}
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map((group: any) => {
            const name = group.subject || group.name || "Sem nome";
            const jid = group.id || group.jid || "";
            const size = group.size || group.participants?.length || "?";

            return (
              <Card key={jid} className="p-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{size} membros</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-primary hover:text-primary"
                  onClick={() => onSendMessage(jid, name)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Enviar
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
