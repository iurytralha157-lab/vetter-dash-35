import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, 
  Target, 
  DollarSign, 
  Facebook,
  Chrome,
  TrendingUp,
  CheckCircle,
  Phone,
  Mail,
  Globe,
  BarChart3,
  UserCheck,
  Webhook,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Schema
const contaSchema = z.object({
  // Dados Básicos
  cliente_id: z.string().min(1, "Selecione um cliente"),
  nome_cliente: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  nome_empresa: z.string().min(2, "Nome da empresa é obrigatório"),
  telefone: z.string().min(10, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  gestor_id: z.string().min(1, "Selecione um gestor"),
  link_drive: z.string().url("URL inválida").optional().or(z.literal("")),
  id_grupo: z.string().optional(),
  status: z.enum(["Ativo", "Pausado", "Arquivado"]),
  observacoes: z.string().optional(),

  // Canais e Comunicação
  canais: z.array(z.string()).min(1, "Selecione pelo menos um canal"),
  canal_relatorio: z.enum(["WhatsApp", "Email", "Ambos"]),
  horario_relatorio: z.string().optional(),
  templates_padrao: z.array(z.string()).optional(),
  notificacao_saldo_baixo: z.boolean().optional(),
  notificacao_erro_sync: z.boolean().optional(),
  notificacao_leads_diarios: z.boolean().optional(),

  // Meta Ads
  usa_meta_ads: z.boolean(),
  ativar_campanhas_meta: z.boolean().optional(),
  meta_account_id: z.string().optional(),
  meta_business_id: z.string().optional(),
  meta_page_id: z.string().optional(),
  modo_saldo_meta: z.enum(["Cartão", "Pix", "Pré-pago (crédito)"]).optional(),
  monitorar_saldo_meta: z.boolean().optional(),
  saldo_meta: z.number().optional(),
  alerta_saldo_baixo: z.number().optional(),
  budget_mensal_meta: z.number().optional(),
  link_meta: z.string().url("URL inválida").optional().or(z.literal("")),
  utm_padrao: z.string().optional(),
  webhook_meta: z.string().url("URL inválida").optional().or(z.literal("")),

  // Google Ads
  usa_google_ads: z.boolean(),
  google_ads_id: z.string().optional(),
  budget_mensal_google: z.number().optional(),
  conversoes: z.array(z.string()).optional(),
  link_google: z.string().url("URL inválida").optional().or(z.literal("")),
  webhook_google: z.string().url("URL inválida").optional().or(z.literal("")),

  // Rastreamento & Analytics
  traqueamento_ativo: z.boolean(),
  pixel_meta: z.string().optional(),
  ga4_stream_id: z.string().optional(),
  gtm_id: z.string().optional(),
  typebot_ativo: z.boolean().optional(),
  typebot_url: z.string().url("URL inválida").optional().or(z.literal("")),

  // Financeiro
  budget_mensal_global: z.number().optional(),
  forma_pagamento: z.enum(["Cartão", "Pix", "Boleto", "Misto"]).optional(),
  centro_custo: z.string().optional(),
  contrato_inicio: z.string().optional(),
  contrato_renovacao: z.string().optional(),

  // Permissões
  papel_padrao: z.enum(["Usuário padrão", "Gestor", "Administrador"]).optional(),
  usuarios_vinculados: z.array(z.string()).optional(),
  ocultar_ranking: z.boolean().optional(),
  somar_metricas: z.boolean().optional(),
  usa_crm_externo: z.boolean().optional(),
  url_crm: z.string().url("URL inválida").optional().or(z.literal("")),
});

type ContaFormData = z.infer<typeof contaSchema>;

interface Cliente { id: string; nome: string; }
interface Gestor { id: string; name: string; }

interface ModernAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContaFormData) => Promise<void>;
  initialData?: Partial<ContaFormData>;
  isEdit?: boolean;
}

// UI data
const PLATAFORMAS = [
  { id: "Meta", name: "Meta Ads", icon: Facebook, color: "bg-blue-500" },
  { id: "Google", name: "Google Ads", icon: Chrome, color: "bg-red-500" },
  { id: "TikTok", name: "TikTok Ads", icon: TrendingUp, color: "bg-pink-500" },
  { id: "LinkedIn", name: "LinkedIn Ads", icon: Building2, color: "bg-blue-700" },
];
const TEMPLATES_MOCK = ["Relatório Diário", "Alerta de Saldo", "Follow-up Lead", "Resumo Semanal"];
const CONVERSOES_MOCK = ["Formulário de Contato","WhatsApp Click","Ligação Telefônica","Download de Material","Agendamento de Visita"];

// helper: coagir número seguro
const num = (v: any, fallback = 0) =>
  typeof v === "number" ? v : (v === undefined || v === null || v === "" ? fallback : Number(v) || fallback);

// gera defaults mesclando com initialData
const makeDefaults = (d?: Partial<ContaFormData>): ContaFormData => ({
  // Básicos
  cliente_id: d?.cliente_id ?? "",
  nome_cliente: d?.nome_cliente ?? "",
  nome_empresa: d?.nome_empresa ?? "",
  telefone: d?.telefone ?? "",
  email: d?.email ?? "",
  gestor_id: d?.gestor_id ?? "",
  link_drive: d?.link_drive ?? "",
  id_grupo: d?.id_grupo ?? "",
  status: (d?.status as any) ?? "Ativo",
  observacoes: d?.observacoes ?? "",

  // Canais & Comunicação
  canais: d?.canais ?? [],
  canal_relatorio: (d?.canal_relatorio as any) ?? "WhatsApp",
  horario_relatorio: d?.horario_relatorio ?? "09:00",
  templates_padrao: d?.templates_padrao ?? [],
  notificacao_saldo_baixo: d?.notificacao_saldo_baixo ?? true,
  notificacao_erro_sync: d?.notificacao_erro_sync ?? true,
  notificacao_leads_diarios: d?.notificacao_leads_diarios ?? false,

  // Meta
  usa_meta_ads: d?.usa_meta_ads ?? false,
  ativar_campanhas_meta: d?.ativar_campanhas_meta ?? false,
  meta_account_id: d?.meta_account_id ?? "",
  meta_business_id: d?.meta_business_id ?? "",
  meta_page_id: d?.meta_page_id ?? "",
  modo_saldo_meta: (d?.modo_saldo_meta as any) ?? "Pix",
  monitorar_saldo_meta: d?.monitorar_saldo_meta ?? false,
  saldo_meta: num(d?.saldo_meta, 0),
  alerta_saldo_baixo: num(d?.alerta_saldo_baixo, 100),
  budget_mensal_meta: num(d?.budget_mensal_meta, 0),
  link_meta: d?.link_meta ?? "",
  utm_padrao: d?.utm_padrao ?? "",
  webhook_meta: d?.webhook_meta ?? "",

  // Google
  usa_google_ads: d?.usa_google_ads ?? false,
  google_ads_id: d?.google_ads_id ?? "",
  budget_mensal_google: num(d?.budget_mensal_google, 0),
  conversoes: d?.conversoes ?? [],
  link_google: d?.link_google ?? "",
  webhook_google: d?.webhook_google ?? "",

  // Rastreamento & Analytics
  traqueamento_ativo: d?.traqueamento_ativo ?? false,
  pixel_meta: d?.pixel_meta ?? "",
  ga4_stream_id: d?.ga4_stream_id ?? "",
  gtm_id: d?.gtm_id ?? "",
  typebot_ativo: d?.typebot_ativo ?? false,
  typebot_url: d?.typebot_url ?? "",

  // Financeiro
  budget_mensal_global: num(d?.budget_mensal_global, 0),
  forma_pagamento: (d?.forma_pagamento as any) ?? "Pix",
  centro_custo: d?.centro_custo ?? "",
  contrato_inicio: d?.contrato_inicio ?? "",
  contrato_renovacao: d?.contrato_renovacao ?? "",

  // Permissões
  papel_padrao: (d?.papel_padrao as any) ?? "Usuário padrão",
  usuarios_vinculados: d?.usuarios_vinculados ?? [],
  ocultar_ranking: d?.ocultar_ranking ?? false,
  somar_metricas: d?.somar_metricas ?? true,
  usa_crm_externo: d?.usa_crm_externo ?? false,
  url_crm: d?.url_crm ?? "",
});

export function ModernAccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit = false,
}: ModernAccountFormProps) {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // defaults memorizados a partir do initialData
  const defaults = useMemo(() => makeDefaults(initialData), [initialData]);

  const form = useForm<ContaFormData>({
    resolver: zodResolver(contaSchema),
    defaultValues: defaults,
  });

  // 🔁 SINCRONIZAÇÃO: quando abrir o modal ou mudar initialData, preencher o form
  useEffect(() => {
    if (open) {
      form.reset(defaults);
      // se quiser começar de uma etapa específica quando editar, ajuste aqui
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  // Carregar selects
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome')
          .order('nome');

        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .order('name');

        setClientes(clientesData || []);
        setGestores(usersData?.map(u => ({ id: u.id, name: u.name || u.email || 'Sem nome' })) || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    if (open) loadData();
  }, [open]);

  const handleSubmit = async (data: ContaFormData) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      form.reset(makeDefaults()); // limpa
      setStep(1);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePlataforma = (plataforma: string) => {
    const current = form.watch('canais');
    const updated = current.includes(plataforma)
      ? current.filter(p => p !== plataforma)
      : [...current, plataforma];
    form.setValue('canais', updated);
  };

  const nextStep = () => { if (step < 5) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };
  const canProceed = () => {
    const data = form.watch();
    if (step === 1) return !!(data.cliente_id && data.nome_cliente && data.telefone && data.gestor_id);
    if (step === 2) return (data.canais?.length ?? 0) > 0;
    return true;
  };

  const stepTitles = ["Dados Básicos","Canais & Comunicação","Meta Ads","Google Ads & Analytics","Financeiro & Permissões"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl">
            {isEdit ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>

          {/* Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > stepNum ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
                {stepNum < 5 && (
                  <div className={`h-1 w-12 mx-1 ${step > stepNum ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">{stepTitles[step - 1]}</div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cliente */}
                    <FormField
                      control={form.control}
                      name="cliente_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientes.map((cliente) => (
                                <SelectItem key={cliente.id} value={cliente.id}>
                                  {cliente.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nome_cliente"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Conta *</FormLabel>
                            <FormControl><Input placeholder="Ex: Roca - São Carlos - Locação" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nome_empresa"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Empresa *</FormLabel>
                            <FormControl><Input placeholder="Ex: Roca Imóveis Ltda" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Phone className="w-4 h-4" />Telefone *</FormLabel>
                            <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</FormLabel>
                            <FormControl><Input type="email" placeholder="contato@empresa.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gestor_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gestor Responsável *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um gestor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {gestores.map((gestor) => (
                                  <SelectItem key={gestor.id} value={gestor.id}>
                                    {gestor.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Ativo">✅ Ativo</SelectItem>
                                <SelectItem value="Pausado">⏸️ Pausado</SelectItem>
                                <SelectItem value="Arquivado">🗄️ Arquivado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="link_drive"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Globe className="w-4 h-4" />Link do Drive</FormLabel>
                            <FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="id_grupo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID do Grupo</FormLabel>
                            <FormControl><Input placeholder="Ex: GRP001" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl><Textarea placeholder="Observações sobre esta conta..." className="min-h-[80px]" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Canais de Anúncios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="canais"
                      render={() => (
                        <FormItem>
                          <FormLabel>Selecione as plataformas *</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PLATAFORMAS.map((p) => {
                              const Icon = p.icon;
                              const isSelected = form.watch('canais').includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => togglePlataforma(p.id)}
                                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                    isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                                  }`}
                                >
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className={`w-10 h-10 rounded-lg ${p.color} flex items-center justify-center`}>
                                      <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <p className="font-medium text-sm">{p.name}</p>
                                    {isSelected && <Badge variant="secondary" className="text-xs">Selecionado</Badge>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Configurações de Comunicação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="canal_relatorio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canal de Relatório</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="WhatsApp">📱 WhatsApp</SelectItem>
                                <SelectItem value="Email">📧 Email</SelectItem>
                                <SelectItem value="Ambos">📱📧 Ambos</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="horario_relatorio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário do Relatório</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="templates_padrao"
                      render={() => (
                        <FormItem>
                          <FormLabel>Templates Padrão</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES_MOCK.map((t) => (
                              <div key={t} className="flex items-center space-x-2">
                                <Checkbox
                                  id={t}
                                  checked={form.watch('templates_padrao')?.includes(t)}
                                  onCheckedChange={(checked) => {
                                    const current = form.watch('templates_padrao') || [];
                                    const updated = checked ? [...current, t] : current.filter(x => x !== t);
                                    form.setValue('templates_padrao', updated);
                                  }}
                                />
                                <label htmlFor={t} className="text-sm">{t}</label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormLabel>Notificações</FormLabel>
                      <FormField
                        control={form.control}
                        name="notificacao_saldo_baixo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Saldo Baixo</FormLabel>
                              <FormDescription>Receber alertas quando o saldo estiver baixo</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notificacao_leads_diarios"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Leads Diários</FormLabel>
                              <FormDescription>Receber relatório diário de leads</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notificacao_erro_sync"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Erros de Sync</FormLabel>
                              <FormDescription>Receber alertas de erros de sincronização</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 3: Meta */}
            {step === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Facebook className="w-5 h-5 text-blue-600" />
                      Configurações Meta Ads
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="usa_meta_ads"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Usar Meta Ads</FormLabel>
                            <FormDescription>Ativar campanhas no Facebook e Instagram</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('usa_meta_ads') && (
                      <div className="space-y-4 border-l-4 border-blue-500 pl-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="meta_account_id" render={({ field }) => (
                            <FormItem><FormLabel>Meta Account ID</FormLabel><FormControl><Input placeholder="123456789012345" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="meta_business_id" render={({ field }) => (
                            <FormItem><FormLabel>Meta Business ID</FormLabel><FormControl><Input placeholder="123456789012345" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="meta_page_id" render={({ field }) => (
                            <FormItem><FormLabel>Meta Page ID</FormLabel><FormControl><Input placeholder="123456789012345" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="modo_saldo_meta" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modo de Saldo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Cartão">💳 Cartão</SelectItem>
                                  <SelectItem value="Pix">🔑 Pix</SelectItem>
                                  <SelectItem value="Pré-pago (crédito)">💰 Pré-pago</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="saldo_meta" render={({ field }) => (
                            <FormItem><FormLabel>Saldo Atual (R$)</FormLabel>
                              <FormControl><Input type="number" placeholder="0" {...field} onChange={(e)=>field.onChange(num(e.target.value))} /></FormControl>
                              <FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="alerta_saldo_baixo" render={({ field }) => (
                            <FormItem><FormLabel>Alerta Saldo Baixo (R$)</FormLabel>
                              <FormControl><Input type="number" placeholder="100" {...field} onChange={(e)=>field.onChange(num(e.target.value,100))} /></FormControl>
                              <FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="budget_mensal_meta" render={({ field }) => (
                            <FormItem><FormLabel>Budget Mensal (R$)</FormLabel>
                              <FormControl><Input type="number" placeholder="5000" {...field} onChange={(e)=>field.onChange(num(e.target.value))} /></FormControl>
                              <FormMessage /></FormItem>
                          )}/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="link_meta" render={({ field }) => (
                            <FormItem><FormLabel>Link Meta Ads</FormLabel><FormControl><Input placeholder="https://business.facebook.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="utm_padrao" render={({ field }) => (
                            <FormItem><FormLabel>UTM Padrão</FormLabel><FormControl><Input placeholder="utm_source=facebook&utm_medium=..." {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                        </div>

                        <FormField control={form.control} name="webhook_meta" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Webhook className="w-4 h-4" />Webhook Meta</FormLabel>
                            <FormControl><Input placeholder="https://webhook.site/..." {...field} /></FormControl>
                            <FormDescription>URL para receber dados de conversões do Meta</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}/>

                        <div className="space-y-3">
                          <FormField control={form.control} name="ativar_campanhas_meta" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5"><FormLabel className="text-base">Ativar Campanhas</FormLabel><FormDescription>Permitir ativação automática de campanhas</FormDescription></div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                          )}/>
                          <FormField control={form.control} name="monitorar_saldo_meta" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5"><FormLabel className="text-base">Monitorar Saldo</FormLabel><FormDescription>Verificar saldo automaticamente</FormDescription></div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                          )}/>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 4: Google & Analytics */}
            {step === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Chrome className="w-5 h-5 text-red-600" />
                      Configurações Google Ads
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="usa_google_ads" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5"><FormLabel className="text-base">Usar Google Ads</FormLabel><FormDescription>Ativar campanhas no Google Ads</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}/>
                    {form.watch('usa_google_ads') && (
                      <div className="space-y-4 border-l-4 border-red-500 pl-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="google_ads_id" render={({ field }) => (
                            <FormItem><FormLabel>Google Ads ID</FormLabel><FormControl><Input placeholder="123-456-7890" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="budget_mensal_google" render={({ field }) => (
                            <FormItem><FormLabel>Budget Mensal Google (R$)</FormLabel>
                              <FormControl><Input type="number" placeholder="3000" {...field} onChange={(e)=>field.onChange(num(e.target.value))} /></FormControl>
                              <FormMessage /></FormItem>
                          )}/>
                        </div>

                        <FormField control={form.control} name="conversoes" render={() => (
                          <FormItem>
                            <FormLabel>Tipos de Conversão</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {CONVERSOES_MOCK.map((c) => (
                                <div key={c} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={c}
                                    checked={form.watch('conversoes')?.includes(c)}
                                    onCheckedChange={(checked) => {
                                      const current = form.watch('conversoes') || [];
                                      const updated = checked ? [...current, c] : current.filter(x => x !== c);
                                      form.setValue('conversoes', updated);
                                    }}
                                  />
                                  <label htmlFor={c} className="text-sm">{c}</label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}/>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="link_google" render={({ field }) => (
                            <FormItem><FormLabel>Link Google Ads</FormLabel><FormControl><Input placeholder="https://ads.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="webhook_google" render={({ field }) => (
                            <FormItem><FormLabel>Webhook Google</FormLabel><FormControl><Input placeholder="https://webhook.site/..." {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Analytics & Rastreamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="traqueamento_ativo" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5"><FormLabel className="text-base">Rastreamento Ativo</FormLabel><FormDescription>Ativar monitoramento de conversões</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}/>
                    {form.watch('traqueamento_ativo') && (
                      <div className="space-y-4 border-l-4 border-green-500 pl-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="pixel_meta" render={({ field }) => (
                            <FormItem><FormLabel>Pixel Meta</FormLabel><FormControl><Input placeholder="123456789012345" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="ga4_stream_id" render={({ field }) => (
                            <FormItem><FormLabel>GA4 Stream ID</FormLabel><FormControl><Input placeholder="G-XXXXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="gtm_id" render={({ field }) => (
                            <FormItem><FormLabel>GTM ID</FormLabel><FormControl><Input placeholder="GTM-XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                        </div>
                        <div className="space-y-3">
                          <FormField control={form.control} name="typebot_ativo" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5"><FormLabel className="text-base">Typebot Ativo</FormLabel><FormDescription>Usar chatbot para qualificação</FormDescription></div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                          )}/>
                          {form.watch('typebot_ativo') && (
                            <FormField control={form.control} name="typebot_url" render={({ field }) => (
                              <FormItem><FormLabel>URL do Typebot</FormLabel><FormControl><Input placeholder="https://typebot.io/..." {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Configurações Financeiras
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="budget_mensal_global" render={({ field }) => (
                        <FormItem><FormLabel>Budget Mensal Global (R$)</FormLabel>
                          <FormControl><Input type="number" placeholder="10000" {...field} onChange={(e)=>field.onChange(num(e.target.value))} /></FormControl>
                          <FormDescription>Budget total para todas as plataformas</FormDescription>
                          <FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                        <FormItem><FormLabel>Forma de Pagamento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Cartão">💳 Cartão</SelectItem>
                              <SelectItem value="Pix">🔑 Pix</SelectItem>
                              <SelectItem value="Boleto">🧾 Boleto</SelectItem>
                              <SelectItem value="Misto">🔄 Misto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage /></FormItem>
                      )}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="centro_custo" render={({ field }) => (
                        <FormItem><FormLabel>Centro de Custo</FormLabel><FormControl><Input placeholder="CC001" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="contrato_inicio" render={({ field }) => (
                        <FormItem><FormLabel>Início do Contrato</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="contrato_renovacao" render={({ field }) => (
                        <FormItem><FormLabel>Renovação do Contrato</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Permissões & Acesso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="papel_padrao" render={({ field }) => (
                      <FormItem><FormLabel>Papel Padrão</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Usuário padrão">👤 Usuário padrão</SelectItem>
                            <SelectItem value="Gestor">👨‍💼 Gestor</SelectItem>
                            <SelectItem value="Administrador">👑 Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )}/>
                    <div className="space-y-3">
                      <FormField control={form.control} name="ocultar_ranking" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5"><FormLabel className="text-base">Ocultar Ranking</FormLabel><FormDescription>Não mostrar este cliente nos rankings</FormDescription></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="somar_metricas" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5"><FormLabel className="text-base">Somar Métricas</FormLabel><FormDescription>Incluir nas métricas consolidadas</FormDescription></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="usa_crm_externo" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5"><FormLabel className="text-base">CRM Externo</FormLabel><FormDescription>Cliente usa CRM externo (RD, Pipedrive, etc.)</FormDescription></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}/>
                    </div>
                    {form.watch('usa_crm_externo') && (
                      <FormField control={form.control} name="url_crm" render={({ field }) => (
                        <FormItem><FormLabel>URL do CRM</FormLabel><FormControl><Input placeholder="https://app.pipedrive.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Resumo Final
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <p><strong>Conta:</strong> {form.watch('nome_cliente')}</p>
                        <p><strong>Cliente:</strong> {clientes.find(c => c.id === form.watch('cliente_id'))?.nome}</p>
                        <p><strong>Gestor:</strong> {gestores.find(g => g.id === form.watch('gestor_id'))?.name}</p>
                        <p><strong>Status:</strong> {form.watch('status')}</p>
                      </div>
                      <div className="space-y-2">
                        <p><strong>Canais:</strong> {form.watch('canais').join(', ')}</p>
                        <p><strong>Meta Ads:</strong> {form.watch('usa_meta_ads') ? '✅ Sim' : '❌ Não'}</p>
                        <p><strong>Google Ads:</strong> {form.watch('usa_google_ads') ? '✅ Sim' : '❌ Não'}</p>
                        <p><strong>Rastreamento:</strong> {form.watch('traqueamento_ativo') ? '✅ Ativo' : '❌ Inativo'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="flex gap-2">
                {step > 1 && <Button type="button" variant="outline" onClick={prevStep}>Voltar</Button>}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              </div>
              <div>
                {step < 5 ? (
                  <Button type="button" onClick={nextStep} disabled={!canProceed()}>Próximo</Button>
                ) : (
                  <Button type="submit" disabled={loading}>{loading ? "Salvando..." : isEdit ? "Atualizar Conta" : "Criar Conta"}</Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
