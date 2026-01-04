import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  Calendar,
  RefreshCw,
  MoreVertical,
  Edit,
  Eye,
  Archive,
  ArchiveRestore,
  Phone,
  Mail,
  Target,
  BarChart3,
  DollarSign,
  Activity,
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
import { Label } from "@/components/ui/label";

interface ClientData {
  id: string;
  nome_cliente: string;
  telefone: string;
  email: string | null;
  canais: string[];
  status: string;
  observacoes: string | null;
  usa_meta_ads: boolean;
  usa_google_ads: boolean;
  traqueamento_ativo: boolean;
  saldo_meta: number | null;
  meta_account_id: string | null;
  google_ads_id: string | null;
  created_at: string;
  updated_at: string;
  gestor_name?: string;
  stats?: {
    total_leads: number;
    conversoes: number;
    gasto_total: number;
  };
}

const STATUS_OPTIONS = [
  { value: "Ativo", label: "Ativo", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  { value: "Pausado", label: "Pausado", pill: "bg-amber-500/15 text-amber-300 border-amber-500/25", dot: "bg-amber-400" },
  { value: "Arquivado", label: "Arquivado", pill: "bg-muted/25 text-muted-foreground border-border/60", dot: "bg-muted-foreground" },
];

const FILTER_PILLS = [
  { key: "all", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Pausado", label: "Pausados" },
  { key: "Arquivado", label: "Arquivados" },
] as const;

export default function Clients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isGestor, userId, loading: roleLoading } = useUserRole();

  const [clients, setClients] = useState<ClientData[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<(typeof FILTER_PILLS)[number]["key"]>("all");
  const [filterManager, setFilterManager] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nome_cliente: "",
    nome_empresa: "",
    telefone: "",
    email: "",
    canais: [] as string[],
    status: "Ativo",
  });

  const loadClientsData = async () => {
    try {
      setLoading(true);

      const { data: clientsData, error: clientsError } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, name, email");

      if (usersError) console.warn("Users not found:", usersError);

      const { data: leadsData, error: leadsError } = await supabase
        .from("leads_stats")
        .select("client_id, total_leads, leads_convertidos, valor_total_conversoes");

      if (leadsError) console.warn("Leads stats not available:", leadsError);

      const processedClients: ClientData[] = (clientsData || []).map((client: any) => {
        const user = usersData?.find((u: any) => u.id === client.user_id);
        const stats = leadsData?.find((s: any) => s.client_id === client.id);

        return {
          ...client,
          gestor_name: user?.name || user?.email || "Sem responsável",
          stats: stats
            ? {
                total_leads: stats.total_leads || 0,
                conversoes: stats.leads_convertidos || 0,
                gasto_total: stats.valor_total_conversoes || 0,
              }
            : undefined,
        };
      });

      setClients(processedClients);
      setManagers(usersData?.map((u: any) => ({ id: u.id, name: u.name || u.email || "Sem nome" })) || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      if (!newClientData.nome_cliente || !newClientData.telefone) {
        toast({
          title: "Erro",
          description: "Preencha nome e telefone",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("accounts").insert({
        ...newClientData,
        email: newClientData.email || null,
      });

      if (error) throw error;

      await loadClientsData();
      setShowCreateModal(false);
      setNewClientData({
        nome_cliente: "",
        nome_empresa: "",
        telefone: "",
        email: "",
        canais: [],
        status: "Ativo",
      });

      toast({
        title: "Sucesso",
        description: `Cliente ${newClientData.nome_cliente} criado`,
      });
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o cliente",
        variant: "destructive",
      });
    }
  };

  const handleChangeStatus = async (clientId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (error) throw error;

      await loadClientsData();

      toast({
        title: "Sucesso",
        description: `Status do cliente alterado para ${newStatus}`,
      });
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status",
        variant: "destructive",
      });
    }
  };

  const handleViewClient = (clientId: string) => navigate(`/contas/${clientId}`);

  useEffect(() => {
    loadClientsData();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telefone.includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || client.status === filterStatus;
      const matchesManager = filterManager === "all" || true;

      return matchesSearch && matchesStatus && matchesManager;
    });
  }, [clients, searchTerm, filterStatus, filterManager]);

  // Stats gerais
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Ativo").length;
  const pausedClients = clients.filter((c) => c.status === "Pausado").length;
  const archivedClients = clients.filter((c) => c.status === "Arquivado").length;
  const metaClients = clients.filter((c) => c.usa_meta_ads || c.canais.includes("Meta")).length;
  const googleClients = clients.filter((c) => c.usa_google_ads || c.canais.includes("Google")).length;
  const totalBalance = clients.reduce((sum, c) => sum + ((c.saldo_meta || 0) / 100), 0);

  const counts = useMemo(() => {
    return {
      all: totalClients,
      Ativo: activeClients,
      Pausado: pausedClients,
      Arquivado: archivedClients,
    } as Record<string, number>;
  }, [totalClients, activeClients, pausedClients, archivedClients]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-BR");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
    return (
      <Badge className={["text-xs border rounded-full", statusInfo.pill].join(" ")}>
        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${statusInfo.dot}`} />
        {statusInfo.label}
      </Badge>
    );
  };

  const getChannelBadges = (channels: string[]) => {
    return channels.map((channel) => (
      <Badge
        key={channel}
        variant="outline"
        className={[
          "text-xs rounded-full",
          channel === "Meta"
            ? "border-primary/30 text-primary"
            : channel === "Google"
            ? "border-amber-500/30 text-amber-300"
            : "border-border/60 text-muted-foreground",
        ].join(" ")}
      >
        {channel}
      </Badge>
    ));
  };

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
          <div className="h-44 rounded-2xl bg-muted/30 border border-border/40 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/30 border border-border/40 animate-pulse" />
            ))}
          </div>
          <div className="h-20 rounded-2xl bg-muted/30 border border-border/40 animate-pulse" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/30 border border-border/40 animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* HERO PREMIUM */}
        <Card className="surface-elevated overflow-hidden border-border/60">
          <CardContent className="p-0">
            <div className="relative">
              {/* textura */}
              <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />
              {/* glows */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/25 via-transparent to-emerald-500/15" />
              <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
              <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

              <div className="relative px-6 py-7 md:px-8 md:py-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border/60 bg-background/30 px-3 py-1.5 rounded-full">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Gestão de contas
                    <span className="text-[10px] opacity-70">•</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                      Status, canais e saldo
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-3">
                    Clientes
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Controle completo da sua carteira — com dados, filtros e ações rápidas.
                  </p>

                  {/* Pills */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {FILTER_PILLS.map((p) => {
                      const active = filterStatus === p.key;
                      const badgeCount = counts[p.key] ?? 0;

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
                  <Button variant="outline" className="gap-2" onClick={loadClientsData}>
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </Button>
                  <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="surface-elevated border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total</p>
                  <p className="text-2xl font-bold">{totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                  <UserCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Ativos</p>
                  <p className="text-2xl font-bold">{activeClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                  <Activity className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Pausados</p>
                  <p className="text-2xl font-bold">{pausedClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Meta</p>
                  <p className="text-2xl font-bold">{metaClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                  <Target className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Google</p>
                  <p className="text-2xl font-bold">{googleClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/15">
                  <DollarSign className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Saldo Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FILTROS PREMIUM */}
        <Card className="surface-elevated border-border/60">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-background/40 border-border/60 focus-visible:ring-primary/30"
                />
              </div>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-background/40 border-border/60">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterManager} onValueChange={setFilterManager}>
                <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-background/40 border-border/60">
                  <SelectValue placeholder="Filtrar por gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Gestores</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* LISTA PREMIUM + CARD CLICÁVEL */}
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              role="button"
              tabIndex={0}
              onClick={() => handleViewClient(client.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleViewClient(client.id);
              }}
              className={[
                "surface-elevated border-border/60 transition-all cursor-pointer select-none",
                "hover:translate-y-[-1px] hover:border-primary/25 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
              ].join(" ")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-6">
                  {/* Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl">
                        {getInitials(client.nome_cliente)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground text-lg truncate">
                          {client.nome_cliente}
                        </h3>
                        {getStatusBadge(client.status)}
                        <div className="flex gap-1 flex-wrap">{getChannelBadges(client.canais || [])}</div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span className="text-foreground/90">{client.telefone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3" />
                            <span className="truncate text-foreground/90">{client.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          <span className="text-foreground/90">{client.gestor_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-foreground/90">{formatDate(client.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats + ações (não dispara o clique do card) */}
                  <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                    {client.stats && (
                      <div className="hidden md:flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{client.stats.total_leads}</p>
                          <p className="text-muted-foreground text-xs">Leads</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-emerald-300">{client.stats.conversoes}</p>
                          <p className="text-muted-foreground text-xs">Conversões</p>
                        </div>
                        {client.saldo_meta !== null && client.saldo_meta !== undefined && (
                          <div className="text-center">
                            <p className="font-semibold text-primary">
                              {formatCurrency((client.saldo_meta || 0) / 100)}
                            </p>
                            <p className="text-muted-foreground text-xs">Saldo</p>
                          </div>
                        )}
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem className="gap-2" onClick={() => handleViewClient(client.id)}>
                          <Eye className="h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {client.status === "Ativo" ? (
                          <DropdownMenuItem className="gap-2" onClick={() => handleChangeStatus(client.id, "Pausado")}>
                            <Archive className="h-4 w-4" />
                            Pausar
                          </DropdownMenuItem>
                        ) : client.status === "Pausado" ? (
                          <>
                            <DropdownMenuItem className="gap-2" onClick={() => handleChangeStatus(client.id, "Ativo")}>
                              <ArchiveRestore className="h-4 w-4" />
                              Reativar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleChangeStatus(client.id, "Arquivado")}>
                              <Archive className="h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem className="gap-2" onClick={() => handleChangeStatus(client.id, "Ativo")}>
                            <ArchiveRestore className="h-4 w-4" />
                            Desarquivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filteredClients.length === 0 && !loading && (
          <Card className="surface-elevated border-border/60">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 p-3 bg-muted/30 rounded-full w-fit">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Tente ajustar os filtros de busca" : "Nenhum cliente cadastrado no sistema"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* MODAL CRIAÇÃO */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>Criar uma nova conta de cliente no sistema</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_cliente">Nome do Cliente</Label>
                <Input
                  id="nome_cliente"
                  value={newClientData.nome_cliente}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, nome_cliente: e.target.value }))}
                  placeholder="Ex: Casa & Cia Imóveis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                <Input
                  id="nome_empresa"
                  value={newClientData.nome_empresa}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, nome_empresa: e.target.value }))}
                  placeholder="Ex: Casa & Cia Ltda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={newClientData.telefone}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gestor">Responsável</Label>
                <Select value="" onValueChange={() => {}}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  (Aqui você pode ligar isso no banco depois com um campo gestor_id. Hoje tá só visual.)
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateClient}>Criar Cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
