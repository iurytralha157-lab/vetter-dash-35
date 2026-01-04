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
import { useUserRole } from "@/hooks/useUserRole";
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
  telefone?: string | null;
  instagram_handle?: string | null;
  site?: string | null;
  id_grupo?: string | null;
  status: ClienteStatus;
  created_at: string;
  updated_at: string;
  // Campos calculados
  total_contas?: number;
  gestor_nome?: string;
  tem_meta?: boolean;
  tem_google?: boolean;
  configuracoes_pendentes?: boolean;
}

interface Stats {
  total_clientes: number;
  clientes_ativos: number;
  configuracoes_pendentes: number;
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

// “Pills” de filtro (visual) — continua usando a mesma state filterStatus
const FILTER_PILLS: Array<{ key: string; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Pausado", label: "Pausados" },
  { key: "Aguardando confirmação", label: "Aguardando" },
];

export default function ClientesReformulada() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isGestor, userId } = useUserRole();

  // Estados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_clientes: 0,
    clientes_ativos: 0,
    configuracoes_pendentes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [newStatus, setNewStatus] = useState<ClienteStatus | "">("");

  // Novo cliente
  const [newClienteData, setNewClienteData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
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

      // 1. Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientesError) throw clientesError;

      // 2. Buscar contas por cliente
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("cliente_id, meta_account_id, google_ads_id")
        .not("cliente_id", "is", null);

      if (accountsError) console.warn("Erro ao buscar contas:", accountsError);

      // 3. Buscar gestores responsáveis (simplificado)
      const { data: gestoresData, error: gestoresError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "gestor");

      if (gestoresError) console.warn("Erro ao buscar gestores:", gestoresError);

      // 4. Processar dados
      const processedClientes: Cliente[] = (clientesData || [])
        .map((cliente) => cliente as any)
        .map((cliente) => {
          // Contar contas do cliente
          const contasCliente = (accountsData || []).filter((account) => account.cliente_id === cliente.id);

          // Verificar integrações
          const temMeta = contasCliente.some((conta) => conta.meta_account_id);
          const temGoogle = contasCliente.some((conta) => conta.google_ads_id);
          const configuracoesPendentes = !temMeta && !temGoogle;

          // Buscar gestor (simplificado por enquanto)
          const gestorNome = "Sem gestor atribuído";

          return {
            ...cliente,
            total_contas: contasCliente.length,
            tem_meta: temMeta,
            tem_google: temGoogle,
            configuracoes_pendentes: configuracoesPendentes,
            gestor_nome: gestorNome,
          };
        });

      setClientes(processedClientes);

      // 5. Calcular estatísticas
      const totalClientes = processedClientes.length;
      const clientesAtivos = processedClientes.filter((c) => c.status === "Ativo").length;
      const configuracoesPendentes = processedClientes.filter((c) => c.configuracoes_pendentes).length;

      setStats({
        total_clientes: totalClientes,
        clientes_ativos: clientesAtivos,
        configuracoes_pendentes: configuracoesPendentes,
      });
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCliente = async () => {
    try {
      if (!newClienteData.nome.trim()) {
        toast({
          title: "Erro",
          description: "Nome é obrigatório.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            nome: newClienteData.nome,
            cnpj: newClienteData.cnpj || null,
            email: newClienteData.email || null,
            telefone: newClienteData.telefone || null,
            instagram_handle: newClienteData.instagram_handle || null,
            site: newClienteData.site || null,
            id_grupo: newClienteData.id_grupo || null,
            status: "Aguardando confirmação" as const,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso!",
      });

      setShowCreateModal(false);
      setNewClienteData({
        nome: "",
        cnpj: "",
        email: "",
        telefone: "",
        instagram_handle: "",
        site: "",
        id_grupo: "",
      });

      loadClientesData();
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o cliente.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async () => {
    if (!selectedCliente || !newStatus) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .update({ status: newStatus as ClienteStatus })
        .eq("id", selectedCliente.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Status alterado para ${newStatus}`,
      });

      setShowStatusModal(false);
      setSelectedCliente(null);
      setNewStatus("");
      loadClientesData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCliente = async (clienteId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });

      loadClientesData();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  // Filtrar clientes
  const filteredClientes = clientes.filter((cliente) => {
    const matchSearch =
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj?.includes(searchTerm);

    const matchStatus = filterStatus === "todos" || cliente.status === filterStatus;

    return matchSearch && matchStatus;
  });

  // Contadores pra badges dos pills (visual)
  const counts = {
    todos: clientes.length,
    Ativo: clientes.filter((c) => c.status === "Ativo").length,
    Pausado: clientes.filter((c) => c.status === "Pausado").length,
    "Aguardando confirmação": clientes.filter((c) => c.status === "Aguardando confirmação").length,
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-BR");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded-2xl w-1/3 mb-4" />
            <div className="h-24 bg-muted rounded-2xl mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-2xl" />
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 bg-muted rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* HERO / HEADER (pegada print) */}
        <Card className="surface-elevated overflow-hidden border-border/60">
          <CardContent className="p-0">
            <div className="relative">
              {/* Glow/Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-emerald-500/10" />
              <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative px-6 py-6 md:px-8 md:py-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Clientes
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Gerencie status, integrações e configurações — sem dor e sem drama.
                  </p>

                  {/* Pills */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {FILTER_PILLS.map((p) => {
                      const active = filterStatus === p.key;
                      const badgeCount = (counts as any)[p.key] ?? 0;

                      return (
                        <button
                          key={p.key}
                          onClick={() => setFilterStatus(p.key)}
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition",
                            active
                              ? "bg-primary text-primary-foreground border-primary/40 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                              : "bg-background/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-background/40",
                          ].join(" ")}
                        >
                          <span>{p.label}</span>
                          <span
                            className={[
                              "text-xs rounded-full px-2 py-0.5",
                              active ? "bg-primary-foreground/15" : "bg-muted/40",
                            ].join(" ")}
                          >
                            {badgeCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={loadClientesData} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs (mais premium) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="surface-elevated border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Clientes</p>
                  <p className="text-3xl font-bold mt-1">{stats.total_clientes}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shadow-inner">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-3xl font-bold mt-1">{stats.clientes_ativos}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shadow-inner">
                  <CheckCircle className="h-6 w-6 text-emerald-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Config. Pendentes</p>
                  <p className="text-3xl font-bold mt-1">{stats.configuracoes_pendentes}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-500/15 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="h-6 w-6 text-amber-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BUSCA + SELECT (mantém funcional) */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <Card className="surface-elevated border-border/60 flex-1">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
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
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="Ativo">Ativos</SelectItem>
                    <SelectItem value="Pausado">Pausados</SelectItem>
                    <SelectItem value="Aguardando confirmação">Aguardando</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTA (cards com cara premium) */}
        <div className="space-y-4">
          {filteredClientes.map((cliente) => {
            const StatusIcon = STATUS_CONFIG[cliente.status].icon;

            return (
              <Card
                key={cliente.id}
                className="surface-elevated border-border/60 hover:surface-hover transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                    {/* Left */}
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        {/* Header row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg">{cliente.nome}</h3>

                          <Badge className={["border", STATUS_CONFIG[cliente.status].color].join(" ")}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[cliente.status].label}
                          </Badge>

                          {cliente.configuracoes_pendentes && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Config. Pendente
                            </Badge>
                          )}

                          {/* Integrações (visual) */}
                          <div className="flex items-center gap-2 ml-0 xl:ml-2">
                            <span
                              className={[
                                "text-xs px-2 py-1 rounded-full border",
                                cliente.tem_meta
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted/20 text-muted-foreground border-border/60",
                              ].join(" ")}
                            >
                              Meta {cliente.tem_meta ? "OK" : "—"}
                            </span>
                            <span
                              className={[
                                "text-xs px-2 py-1 rounded-full border",
                                cliente.tem_google
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-muted/20 text-muted-foreground border-border/60",
                              ].join(" ")}
                            >
                              Google {cliente.tem_google ? "OK" : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                          <div className="text-muted-foreground">
                            ID: <span className="text-foreground font-medium">{cliente.id.slice(0, 8)}...</span>
                          </div>

                          {cliente.cnpj && (
                            <div className="text-muted-foreground">
                              CNPJ: <span className="text-foreground font-medium">{cliente.cnpj}</span>
                            </div>
                          )}

                          {cliente.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span className="text-foreground font-medium truncate">{cliente.email}</span>
                            </div>
                          )}

                          {cliente.instagram_handle && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Instagram className="h-4 w-4" />
                              <span className="text-foreground font-medium">@{cliente.instagram_handle}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div className="text-muted-foreground">
                            Criado: <span className="text-foreground font-medium">{formatDate(cliente.created_at)}</span>
                          </div>

                          <div className="text-muted-foreground">
                            Contas: <span className="text-foreground font-medium">{cliente.total_contas || 0}</span>
                          </div>

                          {cliente.id_grupo ? (
                            <div className="text-muted-foreground">
                              Grupo: <span className="text-foreground font-medium">{cliente.id_grupo}</span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              Grupo: <span className="text-foreground font-medium">—</span>
                            </div>
                          )}

                          <div className="text-muted-foreground">
                            Gestor: <span className="text-foreground font-medium">{cliente.gestor_nome}</span>
                          </div>

                          {cliente.site && (
                            <div className="flex items-center gap-2 text-muted-foreground col-span-2 lg:col-span-1">
                              <Globe className="h-4 w-4" />
                              <span className="text-foreground font-medium">Site cadastrado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex gap-1">
                        {cliente.status !== "Ativo" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 p-0 text-emerald-300 hover:bg-emerald-500/10 border-border/60"
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setNewStatus("Ativo");
                              setShowStatusModal(true);
                            }}
                            title="Ativar"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        {cliente.status !== "Pausado" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 p-0 text-amber-300 hover:bg-amber-500/10 border-border/60"
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setNewStatus("Pausado");
                              setShowStatusModal(true);
                            }}
                            title="Pausar"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}/editar`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteCliente(cliente.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredClientes.length === 0 && (
            <Card className="surface-elevated border-border/60">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cliente encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "Tenta ajustar a busca (às vezes é só um espaço a mais ferrando tudo 😄)."
                    : "Comece criando seu primeiro cliente."}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeiro Cliente
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal - Criar Cliente */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>Crie um novo cliente para gerenciar suas campanhas.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={newClienteData.nome}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={newClienteData.cnpj}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClienteData.email}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={newClienteData.telefone}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={newClienteData.instagram_handle}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, instagram_handle: e.target.value }))}
                  placeholder="@usuario"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  value={newClienteData.site}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, site: e.target.value }))}
                  placeholder="https://www.site.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="id_grupo">ID do Grupo</Label>
                <Input
                  id="id_grupo"
                  value={newClienteData.id_grupo}
                  onChange={(e) => setNewClienteData((prev) => ({ ...prev, id_grupo: e.target.value }))}
                  placeholder="Identificador do grupo"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCliente}>Criar Cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal - Alterar Status */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Status</DialogTitle>
              <DialogDescription>Confirma a alteração de status para "{newStatus}"?</DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStatusChange}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
