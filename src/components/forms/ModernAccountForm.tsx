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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, 
  Target, 
  Facebook,
  Chrome,
  TrendingUp,
  CheckCircle,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Schema simplificado
const contaSchema = z.object({
  nome_cliente: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  id_grupo: z.string().min(1, "ID do Grupo é obrigatório"),
  link_drive: z.string().url("URL inválida").optional().or(z.literal("")),
  canais: z.array(z.string()).min(1, "Selecione pelo menos um canal"),

  // Meta Ads
  usa_meta_ads: z.boolean(),
  meta_account_id: z.string().optional(),
  meta_business_id: z.string().optional(),
  meta_page_id: z.string().optional(),
  modo_saldo_meta: z.enum(["Cartão", "Pix", "Pré-pago (crédito)"]).optional(),
  saldo_meta: z.number().optional(),
  alerta_saldo_baixo: z.number().optional(),
  budget_mensal_meta: z.number().optional(),

  // Google Ads
  usa_google_ads: z.boolean(),
  google_ads_id: z.string().optional(),
  budget_mensal_google: z.number().optional(),

  // Notificações
  notificacao_saldo_baixo: z.boolean().optional(),
  notificacao_erro_sync: z.boolean().optional(),
  horario_relatorio: z.string().optional(),
});

export type ContaFormData = z.infer<typeof contaSchema>;

interface ModernAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContaFormData) => Promise<void>;
  initialData?: Partial<ContaFormData>;
  isEdit?: boolean;
}

const PLATAFORMAS = [
  { id: "Meta", name: "Meta Ads", icon: Facebook, color: "bg-blue-500" },
  { id: "Google", name: "Google Ads", icon: Chrome, color: "bg-red-500" },
  { id: "TikTok", name: "TikTok Ads", icon: TrendingUp, color: "bg-pink-500" },
  { id: "LinkedIn", name: "LinkedIn Ads", icon: Building2, color: "bg-blue-700" },
];

const num = (v: any, fallback = 0) =>
  typeof v === "number" ? v : (v === undefined || v === null || v === "" ? fallback : Number(v) || fallback);

const makeDefaults = (d?: Partial<ContaFormData>): ContaFormData => ({
  nome_cliente: d?.nome_cliente ?? "",
  telefone: d?.telefone ?? "",
  email: d?.email ?? "",
  id_grupo: d?.id_grupo ?? "",
  link_drive: d?.link_drive ?? "",
  canais: d?.canais ?? [],
  usa_meta_ads: d?.usa_meta_ads ?? false,
  meta_account_id: d?.meta_account_id ?? "",
  meta_business_id: d?.meta_business_id ?? "",
  meta_page_id: d?.meta_page_id ?? "",
  modo_saldo_meta: (d?.modo_saldo_meta as any) ?? "Pix",
  saldo_meta: num(d?.saldo_meta, 0),
  alerta_saldo_baixo: num(d?.alerta_saldo_baixo, 200),
  budget_mensal_meta: num(d?.budget_mensal_meta, 0),
  usa_google_ads: d?.usa_google_ads ?? false,
  google_ads_id: d?.google_ads_id ?? "",
  budget_mensal_google: num(d?.budget_mensal_google, 0),
  notificacao_saldo_baixo: d?.notificacao_saldo_baixo ?? true,
  notificacao_erro_sync: d?.notificacao_erro_sync ?? true,
  horario_relatorio: d?.horario_relatorio ?? "09:00",
});

export function ModernAccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit = false,
}: ModernAccountFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const defaults = useMemo(() => makeDefaults(initialData), [initialData]);

  const form = useForm<ContaFormData>({
    resolver: zodResolver(contaSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults);
      setStep(1);
    }
  }, [open, defaults]);

  const handleSubmit = async (data: ContaFormData) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      form.reset(makeDefaults());
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

  const nextStep = () => { if (step < 3) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };
  const canProceed = () => {
    const data = form.watch();
    if (step === 1) return !!(data.nome_cliente && data.id_grupo);
    if (step === 2) return (data.canais?.length ?? 0) > 0;
    return true;
  };

  const stepTitles = ["Dados Básicos", "Canais & Plataformas", "Configurações & Resumo"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl">
            {isEdit ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>

          {/* Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
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
                {stepNum < 3 && (
                  <div className={`h-1 w-20 mx-1 ${step > stepNum ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">{stepTitles[step - 1]}</div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* STEP 1: Dados Básicos */}
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
                    <FormField
                      control={form.control}
                      name="nome_cliente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Conta *</FormLabel>
                          <FormControl><Input placeholder="Ex: Roca - São Carlos - Locação" {...field} /></FormControl>
                          <FormDescription>Nome único para identificar esta conta</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="id_grupo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Grupo (WhatsApp) *</FormLabel>
                          <FormControl><Input placeholder="Ex: GRP001" {...field} /></FormControl>
                          <FormDescription>Identificador do grupo de WhatsApp</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Phone className="w-4 h-4" />Telefone</FormLabel>
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
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 2: Canais & Plataformas */}
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

                {/* Meta Ads config - only if Meta selected */}
                {form.watch('canais').includes('Meta') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Facebook className="w-5 h-5 text-blue-600" />
                        Configurações Meta Ads
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="usa_meta_ads" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Usar Meta Ads</FormLabel>
                            <FormDescription>Ativar campanhas no Facebook e Instagram</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}/>

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
                          <FormField control={form.control} name="meta_page_id" render={({ field }) => (
                            <FormItem><FormLabel>Meta Page ID</FormLabel><FormControl><Input placeholder="123456789012345" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="saldo_meta" render={({ field }) => (
                              <FormItem><FormLabel>Saldo Atual (R$)</FormLabel>
                                <FormControl><Input type="number" placeholder="0" {...field} onChange={(e)=>field.onChange(num(e.target.value))} /></FormControl>
                                <FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="alerta_saldo_baixo" render={({ field }) => (
                              <FormItem><FormLabel>Alerta Saldo Baixo (R$)</FormLabel>
                                <FormControl><Input type="number" placeholder="200" {...field} onChange={(e)=>field.onChange(num(e.target.value, 200))} /></FormControl>
                                <FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="budget_mensal_meta" render={({ field }) => (
                              <FormItem><FormLabel>Budget Mensal (R$)</FormLabel>
                                <FormControl><Input type="number" placeholder="5000" {...field} onChange={(e)=>field.onChange(num(e.target.value))} /></FormControl>
                                <FormMessage /></FormItem>
                            )}/>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Google Ads config - only if Google selected */}
                {form.watch('canais').includes('Google') && (
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
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Usar Google Ads</FormLabel>
                            <FormDescription>Ativar campanhas no Google Ads</FormDescription>
                          </div>
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* STEP 3: Configurações & Resumo */}
            {step === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações & Relatório</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="horario_relatorio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário do Relatório</FormLabel>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormDescription>Relatórios enviados via WhatsApp</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
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
                        name="notificacao_erro_sync"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Erros de Sincronização</FormLabel>
                              <FormDescription>Receber alertas de erros de sincronização</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Resumo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <p><strong>Conta:</strong> {form.watch('nome_cliente')}</p>
                        <p><strong>ID Grupo:</strong> {form.watch('id_grupo')}</p>
                        <p><strong>Gestor:</strong> {user?.email || 'Você'}</p>
                        <p><strong>Status:</strong> Ativo</p>
                      </div>
                      <div className="space-y-2">
                        <p><strong>Canais:</strong> {form.watch('canais').join(', ') || 'Nenhum'}</p>
                        <p><strong>Meta Ads:</strong> {form.watch('usa_meta_ads') ? '✅ Sim' : '❌ Não'}</p>
                        <p><strong>Google Ads:</strong> {form.watch('usa_google_ads') ? '✅ Sim' : '❌ Não'}</p>
                        <p><strong>Relatório:</strong> WhatsApp às {form.watch('horario_relatorio')}</p>
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
                {step < 3 ? (
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
