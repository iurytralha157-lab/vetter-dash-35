import React, { useEffect, useMemo, useState } from "react";
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
  Sparkles,
  ShieldCheck,
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

  total_contas?: number;
  gestor_nome?: string;
  tem_meta?: boolean;
  tem_google?: boolean;
  configuracoes_pendentes?: boolean;
}

const STATUS_CONFIG: Record<ClienteStatus, { pill: string; dot: string; icon: any; label: string }> = {
  Ativo: {
    pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-400",
    icon: CheckCircle,
    label: "Ativo",
  },
  Pausado: {
    pill: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    dot: "bg-amber-400",
    icon: Pause,
    label: "Pausado",
  },
  "Aguardando confirmação": {
    pill: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    dot: "bg-sky-400",
    icon: Clock,
    label: "Aguardando",
  },
};

const FILTER_PILLS = [
  { key: "todos", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Pausado", label: "Pausados" },
  { key: "Aguardando confirmação", label: "Aguardando" },
] as const;

export default function ClientesReformulada() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [newStatus, setNewStatus] = useState<ClienteStatus | "">("");

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

      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientesError) throw clientesError;

      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("cliente_id, meta_account_id, google_ads_id")
        .not("cliente_id", "is", null);

      if (accountsError) console.warn("Erro ao buscar contas:", accountsError);

      const processedClientes: Cliente[] = (clientesData || [])
        .map((cliente) => cliente as any)
        .map((cliente) => {
          const contasCliente = (accountsData || []).filter((account) => account.cliente_id === cliente.id);

          const temMeta = contasCliente.some((conta) => conta.meta_account_id);
          const temGoogle = contasCliente.some((conta) => conta.google_ads_id);
          const configuracoesPendentes = !temMeta && !temGoogle;

          return {
            ...cliente,
            total_contas: contasCliente.length,
            tem_meta: temMeta,
            tem_google: temGoogle,
            configuracoes_pendentes: configuracoesPendentes,
            gestor_nome: "Sem gestor atribuído",
          };
        });

      setClientes(processedClientes);
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
        toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("clientes").insert([
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
      ]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Cliente criado com sucesso!" });

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
      toast({ title: "Erro", description: "Não foi possível criar o cliente.", variant: "destructive" });
    }
  };

  const handleStatusChange = async () => {
    if (!selectedCliente || !newStatus) return;

    try {
      const { error } = await supabase.from("clientes").update({ status: newStatus }).eq("id", selectedCliente.id);
      if (error) throw error;

      toast({ title: "Sucesso", description: `Status alterado para ${newStatus}` });

      setShowStatusModal(false);
      setSelectedCliente(null);
      setNewStatus("");
      loadClientesData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({ title: "Erro", description: "Não foi possível alterar o status.", variant: "destructive" });
    }
  };

  const handleDeleteCliente = async (clienteId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Cliente excluído com sucesso!" });
      loadClientesData();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast({ title: "Erro", description: "Não foi possível excluir o cliente.", variant: "destructive" });
    }
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchSearch =
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.cnpj?.includes(searchTerm);

      const matchStatus = filterStatus === "todos" || cliente.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [clientes, searchTerm, filterStatus]);

  const counts = useMemo(() => {
    return {
      todos: clientes.length,
      Ativo: clientes.filter((c) => c.status === "Ativo").length,
      Pausado: clientes.filter((c) => c.status === "Pausado").length,
      "Aguardando confirmação": clientes.filter((c) => c.status === "Aguardando confirmação").length,
    };
  }, [clientes]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-BR");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-40 bg-muted/30 rounded-2xl animate-pulse border border-border/40" />
          <div className="h-20 bg-muted/30 rounded-2xl animate-pulse border border-border/40" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse border border-border/40" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* HERO — agora sim com cara de produto */}
        <Card className="surface-elevated overflow-hidden border-border/60">
          <CardContent className="p-0">
            <div className="relative">

              {/* fundo com textura / grid */}
              <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />

              {/* gradientes / glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/25 via-transparent to-emerald-500/15" />
              <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
              <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

              <div className="relative px-6 py-7 md:px-8 md:py-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border/60 bg-background/30 px-3 py-1.5 rounded-full">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Visão geral da base
                    <span className="text-[10px] opacity-70">•</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                      Status e integrações
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-3">
                    Clientes
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Gerencie status, integrações e configurações — sem dor e sem drama.
                  </p>

                  {/* Pills premium */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {FILTER_PILLS.map((p) => {
                      const active = filterStatus === p.key;
                      const badgeCount = (counts as any)[p.key] ?? 0;

                      return (
                        <button
                          key={p.key}
                          onClick={() => setFilterStatus(p.key)}
                          className={[
                            "group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm border transition",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                            active
                              ? "bg-primary text-primary-foreground border-primary/40"
                              : "bg-background/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-background/40",
                          ].join(" ")}
                        >
                          <span>{p.label}</span>
                          <span
                            className={[
                              "text-xs rounded-full px-2 py-0.5 transition",
                              active ? "bg-primary-foreground/15" : "bg-muted/30 group-hover:bg-muted/40",
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

        {/* BUSCA + SELECT — painel premium */}
        <Card className="surface-elevated border-border/60">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes por nome, e-mail ou CNPJ…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-background/40 border-border/60 focus-visible:ring-primary/30"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[240px] h-11 rounded-xl bg-background/40 border-border/60">
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

        {/* LISTA — cards com “cara” */}
        <div className="space-y-3">
          {filteredClientes.map((cliente) => {
            const StatusIcon = STATUS_CONFIG[cliente.status].icon;

            return (
              <Card
                key={cliente.id}
                className={[
                  "surface-elevated border-border/60 transition-all",
                  "hover:translate-y-[-1px] hover:border-primary/25 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
                ].join(" ")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold rounded-xl">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        {/* Line 1 */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[cliente.status].dot}`} />
                            <h3 className="font-semibold text-base truncate">{cliente.nome}</h3>
                          </div>

                          <Badge className={["border rounded-full", STATUS_CONFIG[cliente.status].pill].join(" ")}>
                            <StatusIcon className="h-3.5 w-3.5 mr-1" />
                            {STATUS_CONFIG[cliente.status].label}
                          </Badge>

                          {cliente.configuracoes_pendentes && (
                            <Badge className="border rounded-full bg-destructive/15 text-destructive border-destructive/25">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Config pendente
                            </Badge>
                          )}

                          {/* chips integrações */}
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "text-xs px-2.5 py-1 rounded-full border",
                                cliente.tem_meta
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted/15 text-muted-foreground border-border/60",
                              ].join(" ")}
                            >
                              Meta {cliente.tem_meta ? "OK" : "—"}
                            </span>
                            <span
                              className={[
                                "text-xs px-2.5 py-1 rounded-full border",
                                cliente.tem_google
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-muted/15 text-muted-foreground border-border/60",
                              ].join(" ")}
                            >
                              Google {cliente.tem_google ? "OK" : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Line 2 */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="text-xs">
                            ID: <span className="text-foreground/90">{cliente.id.slice(0, 8)}…</span>
                          </span>

                          {cliente.email && (
                            <span className="flex items-center gap-2 min-w-0">
                              <Mail className="h-4 w-4" />
                              <span className="truncate text-foreground/90">{cliente.email}</span>
                            </span>
                          )}

                          {cliente.instagram_handle && (
                            <span className="flex items-center gap-2">
                              <Instagram className="h-4 w-4" />
                              <span className="text-foreground/90">@{cliente.instagram_handle}</span>
                            </span>
                          )}

                          {cliente.site && (
                            <span className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span className="text-foreground/90">Site</span>
                            </span>
                          )}

                          <span className="text-xs">
                            Criado: <span className="text-foreground/90">{formatDate(cliente.created_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex gap-1">
                        {cliente.status !== "Ativo" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10 w-10 p-0 rounded-xl text-emerald-300 hover:bg-emerald-500/10 border-border/60"
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
                            className="h-10 w-10 p-0 rounded-xl text-amber-300 hover:bg-amber-500/10 border-border/60"
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
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl">
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
