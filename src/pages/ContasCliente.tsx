import React, { useEffect, useMemo, useState } from "react";
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
import { ModernAccountForm } from "@/components/forms/ModernAccountForm";
import {
  Search,
  Plus,
  Building2,
  RefreshCw,
  MoreVertical,
  Edit,
  Eye,
  Archive,
  Facebook,
  Chrome,
  User,
  Pause,
  Play,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AccountData {
  id: string;
  nome_cliente: string;
  telefone: string;
  email: string | null;
  cliente_id: string;
  canais: string[];
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  usa_meta_ads?: boolean;
  meta_account_id?: string;
  saldo_meta?: number;
  budget_mensal_meta?: number;
  usa_google_ads?: boolean;
  google_ads_id?: string;
  budget_mensal_google?: number;
  link_drive?: string;
  canal_relatorio?: string;
  horario_relatorio?: string;
  gestor_name?: string;
  cliente_nome?: string;
  total_budget?: number;
}

interface StatsData {
  total: number;
  ativos: number;
  pausados: number;
  arquivados: number;
  metaAds: number;
  googleAds: number;
}

const FILTER_PILLS = [
  { key: "todos", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Pausado", label: "Pausados" },
  { key: "Arquivado", label: "Arquivados" },
  { key: "meta", label: "Meta Ads" },
  { key: "google", label: "Google Ads" },
] as const;

type FilterKey = (typeof FILTER_PILLS)[number]["key"];

export default function ContasCliente() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<StatsData>({
    total: 0, ativos: 0, pausados: 0, arquivados: 0, metaAds: 0, googleAds: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCliente, setFilterCliente] = useState("Todos os Clientes");
  const [activePill, setActivePill] = useState<FilterKey>("Ativo");

  const [showModernForm, setShowModernForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountData | null>(null);

  useEffect(() => { loadAccountsData(); }, []);

  const loadAccountsData = async () => {
    try {
      setLoading(true);

      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select(`*, gestor:profiles!gestor_id(id, name)`)
        .order("created_at", { ascending: false });

      if (accountsError) throw accountsError;

      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .order("nome", { ascending: true });

      if (clientesError) console.warn("Clientes não encontrados:", clientesError);

      const processedAccounts: AccountData[] = (accountsData || []).map((account: any) => {
        const cliente = clientesData?.find((c: any) => c.id === account.cliente_id);
        return {
          ...account,
          gestor_name: account.gestor?.name || "Sem gestor",
          cliente_nome: cliente?.nome || "Cliente não vinculado",
          total_budget: (account.budget_mensal_meta || 0) + (account.budget_mensal_google || 0),
        };
      });

      const calculateStats: StatsData = {
        total: processedAccounts.length,
        ativos: processedAccounts.filter((a) => a.status === "Ativo").length,
        pausados: processedAccounts.filter((a) => a.status === "Pausado").length,
        arquivados: processedAccounts.filter((a) => a.status === "Arquivado").length,
        metaAds: processedAccounts.filter((a) => a.usa_meta_ads || !!a.meta_account_id).length,
        googleAds: processedAccounts.filter((a) => a.usa_google_ads || !!a.google_ads_id).length,
      };

      setAccounts(processedAccounts);
      setClientes(clientesData || []);
      setStats(calculateStats);
    } catch (error: any) {
      console.error("Erro ao carregar contas:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as contas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const pillCounts = useMemo(() => ({
    todos: stats.total,
    Ativo: stats.ativos,
    Pausado: stats.pausados,
    Arquivado: stats.arquivados,
    meta: stats.metaAds,
    google: stats.googleAds,
  } as Record<FilterKey, number>), [stats]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        !searchTerm ||
        account.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.telefone.includes(searchTerm) ||
        (account.email && account.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCliente = filterCliente === "Todos os Clientes" || account.cliente_id === filterCliente;

      const metaConfigured = !!(account.meta_account_id && account.meta_account_id.trim().length > 0);
      const googleConfigured = !!(account.google_ads_id && account.google_ads_id.trim().length > 0);

      const matchesPill =
        activePill === "todos" ? true
        : activePill === "meta" ? (account.usa_meta_ads || metaConfigured)
        : activePill === "google" ? (account.usa_google_ads || googleConfigured)
        : account.status === activePill;

      return matchesSearch && matchesCliente && matchesPill;
    });
  }, [accounts, searchTerm, filterCliente, activePill]);

  const handleCreateAccount = () => { setEditingAccount(null); setShowModernForm(true); };
  const handleEditAccount = (account: AccountData) => { setEditingAccount(account); setShowModernForm(true); };
  const handleViewAccount = (accountId: string) => { navigate(`/contas/${accountId}`); };

  const handleAccountSubmit = async (data: any) => {
    try {
      // Get current user ID for gestor_id
      const { data: { user } } = await supabase.auth.getUser();
      
      const accountData = {
        nome_cliente: data.nome_cliente,
        telefone: data.telefone || '',
        email: data.email || null,
        gestor_id: user?.id || null,
        status: 'Ativo',
        canais: data.canais || [],
        canal_relatorio: 'WhatsApp',
        horario_relatorio: data.horario_relatorio,
        id_grupo: data.id_grupo || null,
        usa_meta_ads: data.usa_meta_ads || false,
        meta_account_id: data.meta_account_id || null,
        meta_business_id: data.meta_business_id || null,
        meta_page_id: data.meta_page_id || null,
        budget_mensal_meta: data.budget_mensal_meta || 0,
        saldo_meta: data.saldo_meta || 0,
        alerta_saldo_baixo: data.alerta_saldo_baixo || 200,
        modo_saldo_meta: data.modo_saldo_meta || null,
        usa_google_ads: data.usa_google_ads || false,
        google_ads_id: data.google_ads_id || null,
        budget_mensal_google: data.budget_mensal_google || 0,
        notificacao_saldo_baixo: data.notificacao_saldo_baixo ?? true,
        notificacao_erro_sync: data.notificacao_erro_sync ?? true,
        link_drive: data.link_drive || null,
        updated_at: new Date().toISOString(),
      };

      if (editingAccount) {
        const { error } = await supabase.from("accounts").update(accountData).eq("id", editingAccount.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Conta atualizada com sucesso" });
      } else {
        const { error } = await supabase.from("accounts").insert({ ...accountData, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: "Sucesso", description: "Conta criada com sucesso" });
      }

      await loadAccountsData();
      setShowModernForm(false);
      setEditingAccount(null);
    } catch (error: any) {
      console.error("Erro ao salvar conta:", error);
      toast({ title: "Erro", description: `Não foi possível salvar a conta: ${error.message}`, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (account: AccountData, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = account.status === "Ativo" ? "Pausado" : "Ativo";
    try {
      const { error } = await supabase.from("accounts").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", account.id);
      if (error) throw error;
      toast({ title: "Sucesso", description: `Conta ${newStatus === "Ativo" ? "ativada" : "pausada"} com sucesso` });
      await loadAccountsData();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast({ title: "Erro", description: "Não foi possível alterar o status da conta", variant: "destructive" });
    }
  };

  const handleRefresh = async () => { setRefreshing(true); await loadAccountsData(); setRefreshing(false); };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-BR");
  const formatMoney = (value?: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 p-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse border border-border/40" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.total} conta{stats.total !== 1 ? "s" : ""} · {stats.ativos} ativa{stats.ativos !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline ml-1">Atualizar</span>
            </Button>
            <Button size="sm" onClick={handleCreateAccount}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">Nova Conta</span>
            </Button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PILLS.map((p) => {
            const active = activePill === p.key;
            const count = pillCounts[p.key] ?? 0;
            return (
              <button
                key={p.key}
                onClick={() => setActivePill(p.key)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary/40"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary/50",
                ].join(" ")}
              >
                {p.label}
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-primary-foreground/15" : "bg-muted/50"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Client filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por conta, e-mail ou telefone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl border-border"
            />
          </div>
          <Select value={filterCliente} onValueChange={setFilterCliente}>
            <SelectTrigger className="w-full sm:w-[220px] h-10 rounded-xl border-border">
              <SelectValue placeholder="Todos os Clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos os Clientes">Todos os Clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results counter */}
        <p className="text-xs text-muted-foreground">
          Exibindo {filteredAccounts.length} de {accounts.length} conta{accounts.length !== 1 ? "s" : ""}
        </p>

        {/* Account cards */}
        <div className="space-y-2">
          {filteredAccounts.map((account) => {
            const metaConfigured = !!(account.meta_account_id && account.meta_account_id.trim().length > 0);
            const googleConfigured = !!(account.google_ads_id && account.google_ads_id.trim().length > 0);
            const showMetaChip = account.usa_meta_ads || metaConfigured;
            const showGoogleChip = account.usa_google_ads || googleConfigured;

            const statusColor =
              account.status === "Ativo" ? "bg-emerald-500"
              : account.status === "Pausado" ? "bg-yellow-500"
              : "bg-muted-foreground";

            return (
              <Card
                key={account.id}
                className="relative overflow-hidden transition-colors cursor-pointer border-border hover:border-primary/25"
                onClick={() => handleViewAccount(account.id)}
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${statusColor}`} />
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {getInitials(account.nome_cliente)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-semibold text-sm truncate">{account.nome_cliente}</h3>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${
                          account.status === "Ativo" ? "border-emerald-500/40 text-emerald-500"
                          : account.status === "Pausado" ? "border-yellow-500/40 text-yellow-500"
                          : "border-muted-foreground/40 text-muted-foreground"
                        }`}>
                          {account.status}
                        </Badge>
                        {showMetaChip && (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${metaConfigured ? "border-blue-500/30 text-blue-500" : "border-border text-muted-foreground"}`}>
                            <Facebook className="h-3 w-3" /> Meta
                          </span>
                        )}
                        {showGoogleChip && (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${googleConfigured ? "border-amber-500/30 text-amber-500" : "border-border text-muted-foreground"}`}>
                            <Chrome className="h-3 w-3" /> Google
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{account.cliente_nome}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{account.gestor_name}</span>
                      </div>

                      {/* Real metrics only */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Wallet className="h-3 w-3" />
                          Budget: <span className="text-foreground font-medium">{formatMoney(account.total_budget)}</span>
                        </span>
                        {!!account.saldo_meta && account.saldo_meta > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-500">
                            <Wallet className="h-3 w-3" />
                            Saldo Meta: <span className="font-medium">{formatMoney(account.saldo_meta / 100)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground hidden sm:block mr-2">
                        {formatDate(account.updated_at)}
                      </span>

                      {account.status !== "Ativo" ? (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleToggleStatus(account, e); }} title="Ativar">
                          <Play className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleToggleStatus(account, e); }} title="Pausar">
                          <Pause className="h-3.5 w-3.5 text-yellow-500" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleViewAccount(account.id)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar conta
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Archive className="h-4 w-4 mr-2" /> Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredAccounts.length === 0 && (
          <Card className="border-border">
            <CardContent className="p-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Nenhuma conta encontrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ajuste os filtros ou crie uma nova conta.
              </p>
              <Button size="sm" onClick={handleCreateAccount}>
                <Plus className="h-4 w-4 mr-1" /> Nova Conta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Form modal */}
        <ModernAccountForm
          open={showModernForm}
          onOpenChange={setShowModernForm}
          onSubmit={handleAccountSubmit}
          initialData={
            editingAccount
              ? {
                  nome_cliente: editingAccount.nome_cliente,
                  telefone: editingAccount.telefone,
                  email: editingAccount.email || "",
                  canais: editingAccount.canais || [],
                  horario_relatorio: editingAccount.horario_relatorio || "09:00",
                  usa_meta_ads: editingAccount.usa_meta_ads || false,
                  meta_account_id: editingAccount.meta_account_id || "",
                  saldo_meta: editingAccount.saldo_meta || 0,
                  usa_google_ads: editingAccount.usa_google_ads || false,
                  google_ads_id: editingAccount.google_ads_id || "",
                  budget_mensal_meta: editingAccount.budget_mensal_meta || 0,
                  budget_mensal_google: editingAccount.budget_mensal_google || 0,
                  id_grupo: (editingAccount as any).id_grupo || "",
                  link_drive: editingAccount.link_drive || "",
                }
              : undefined
          }
          isEdit={!!editingAccount}
        />
      </div>
    </AppLayout>
  );
}
