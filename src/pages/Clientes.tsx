import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  Users,
  Mail,
  Instagram,
  Globe,
  RefreshCw,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
  Play,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type ClienteStatus = "Ativo" | "Pausado" | "Aguardando confirmação";

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  instagram_handle?: string | null;
  site?: string | null;
  id_grupo?: string | null;
  status: ClienteStatus;
  created_at: string;
  total_contas?: number;
  gestor_nome?: string;
  tem_meta?: boolean;
  tem_google?: boolean;
  configuracoes_pendentes?: boolean;
}

const STATUS_CONFIG: Record<ClienteStatus, { color: string; icon: any; label: string }> = {
  Ativo: {
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    icon: CheckCircle,
    label: "Ativo",
  },
  Pausado: {
    color: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    icon: Pause,
    label: "Pausado",
  },
  "Aguardando confirmação": {
    color: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    icon: Clock,
    label: "Aguardando",
  },
};

const FILTER_PILLS = [
  { key: "todos", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Pausado", label: "Pausados" },
  { key: "Aguardando confirmação", label: "Aguardando" },
];

export default function ClientesReformulada() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [newStatus, setNewStatus] = useState<ClienteStatus | "">("");

  const [newClienteData, setNewClienteData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    instagram_handle: "",
    site: "",
    id_grupo: "",
  });

  useEffect(() => {
    loadClientesData();
  }, []);

  const loadClientesData = async () => {
    try {
      setLoading(true);

      const { data: clientesData, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("cliente_id, meta_account_id, google_ads_id")
        .not("cliente_id", "is", null);

      const processed = (clientesData || []).map((cliente: any) => {
        const contas = (accountsData || []).filter((a) => a.cliente_id === cliente.id);
        const temMeta = contas.some((c) => c.meta_account_id);
        const temGoogle = contas.some((c) => c.google_ads_id);

        return {
          ...cliente,
          total_contas: contas.length,
          tem_meta: temMeta,
          tem_google: temGoogle,
          configuracoes_pendentes: !temMeta && !temGoogle,
          gestor_nome: "Sem gestor",
        };
      });

      setClientes(processed);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = clientes.filter((cliente) => {
    const matchSearch =
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj?.includes(searchTerm);

    const matchStatus = filterStatus === "todos" || cliente.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    todos: clientes.length,
    Ativo: clientes.filter((c) => c.status === "Ativo").length,
    Pausado: clientes.filter((c) => c.status === "Pausado").length,
    "Aguardando confirmação": clientes.filter((c) => c.status === "Aguardando confirmação").length,
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  if (loading) {
    return (
      <AppLayout>
        <div className="h-40 bg-muted rounded-2xl animate-pulse" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* HERO */}
        <Card className="surface-elevated overflow-hidden">
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie status, integrações e configurações — sem dor e sem drama.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {FILTER_PILLS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setFilterStatus(p.key)}
                  className={`rounded-full px-4 py-1.5 text-sm border transition ${
                    filterStatus === p.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/40 text-muted-foreground border-border"
                  }`}
                >
                  {p.label} <span className="ml-2 text-xs">{(counts as any)[p.key]}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={loadClientesData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BUSCA */}
        <Card className="surface-elevated">
          <CardContent className="p-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes por nome, e-mail ou CNPJ…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Pausado">Pausados</SelectItem>
                <SelectItem value="Aguardando confirmação">Aguardando</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* LISTA */}
        <div className="space-y-4">
          {filteredClientes.map((cliente) => {
            const StatusIcon = STATUS_CONFIG[cliente.status].icon;

            return (
              <Card key={cliente.id} className="surface-elevated">
                <CardContent className="p-6 flex justify-between items-center">
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarFallback>{getInitials(cliente.nome)}</AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{cliente.nome}</h3>
                        <Badge className={STATUS_CONFIG[cliente.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {cliente.status}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                        {cliente.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" /> {cliente.email}
                          </span>
                        )}
                        {cliente.instagram_handle && (
                          <span className="flex items-center gap-1">
                            <Instagram className="h-4 w-4" /> @{cliente.instagram_handle}
                          </span>
                        )}
                        {cliente.site && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-4 w-4" /> Site
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
                        <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}/editar`)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteCliente(cliente.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
