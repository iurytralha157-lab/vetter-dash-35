import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Webhook, Bell, Building, Loader2, ExternalLink, User, Users, UserCheck } from "lucide-react";
import { pt } from "@/i18n/pt";
import { systemSettingsService, SystemSetting } from "@/services/systemSettingsService";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePhotoUpload } from "@/components/settings/ProfilePhotoUpload";
import { OrganizationLogoUpload } from "@/components/settings/OrganizationLogoUpload";
import { SystemBrandingUpload } from "@/components/settings/SystemBrandingUpload";
import { UsersTab } from "@/components/settings/UsersTab";
import { ApprovalsTab } from "@/components/settings/ApprovalsTab";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // Form state for URLs
  const [webhookDemandas, setWebhookDemandas] = useState('');
  const [webhookChecklist, setWebhookChecklist] = useState('');
  const [webhookClientes, setWebhookClientes] = useState('');
  const [orgName, setOrgName] = useState('');
  
  // Profile state
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [user?.id]);

  const loadUserProfile = async () => {
    if (!user?.id) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, organization_id')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setUserAvatarUrl(profile.avatar_url);
      setOrganizationId(profile.organization_id);
      
      if (profile.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('sidebar_logo_url')
          .eq('id', profile.organization_id)
          .single();
        
        setOrgLogoUrl(org?.sidebar_logo_url || null);
      }
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await systemSettingsService.getSettings();
      setSettings(data);
      
      // Set form values
      setWebhookDemandas(data.find(s => s.key === 'webhook_demandas_url')?.value || '');
      setWebhookChecklist(data.find(s => s.key === 'webhook_checklist_url')?.value || '');
      setWebhookClientes(data.find(s => s.key === 'webhook_clientes_url')?.value || '');
      setOrgName(data.find(s => s.key === 'organizacao_nome')?.value || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSettingEnabled = (key: string): boolean => {
    return settings.find(s => s.key === key)?.enabled ?? true;
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    try {
      await systemSettingsService.updateSettingEnabled(key, enabled);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, enabled } : s));
      toast({
        title: "Configuração atualizada",
        description: enabled ? "Notificação ativada" : "Notificação desativada",
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração.",
        variant: "destructive",
      });
    }
  };

  const handleSaveUrl = async (key: string, value: string) => {
    setSaving(true);
    try {
      await systemSettingsService.updateSetting(key, value);
      toast({
        title: "Salvo",
        description: "URL do webhook atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error saving URL:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a URL.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (url: string, type: string) => {
    if (!url) {
      toast({
        title: "URL não configurada",
        description: "Configure a URL do webhook antes de testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingWebhook(type);
    try {
      const result = await systemSettingsService.testWebhook(url);
      toast({
        title: result.success ? "Sucesso" : "Erro",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao testar webhook.",
        variant: "destructive",
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleSaveOrgName = async () => {
    setSaving(true);
    try {
      await systemSettingsService.updateSetting('organizacao_nome', orgName);
      toast({
        title: "Salvo",
        description: "Nome da organização atualizado.",
      });
    } catch (error) {
      console.error('Error saving org name:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={pt.settings.title}
          breadcrumb="Configurações"
          subtitle="Sistema e integrações"
          icon={<SettingsIcon className="h-6 w-6" />}
        />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-4'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Usuários</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Aprovações</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{pt.settings.general}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab - Available to all users */}
          <TabsContent value="profile" className="space-y-6">
            <ProfilePhotoUpload
              currentAvatarUrl={userAvatarUrl}
              onUpdate={loadUserProfile}
            />
            
            {isAdmin && (
              <OrganizationLogoUpload
                organizationId={organizationId}
                currentLogoUrl={orgLogoUrl}
                onUpdate={loadUserProfile}
              />
            )}
          </TabsContent>

          {/* Users Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <UsersTab />
            </TabsContent>
          )}

          {/* Approvals Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="approvals" className="space-y-6">
              <ApprovalsTab />
            </TabsContent>
          )}

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            {/* Demandas Webhook */}
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  Webhook de Demandas
                </CardTitle>
                <CardDescription>
                  Receba notificações quando demandas forem criadas ou concluídas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-demandas">URL do Webhook (N8N)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="webhook-demandas" 
                      placeholder="https://seu-n8n.com/webhook/..." 
                      value={webhookDemandas}
                      onChange={(e) => setWebhookDemandas(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleSaveUrl('webhook_demandas_url', webhookDemandas)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => handleTestWebhook(webhookDemandas, 'demandas')}
                  disabled={testingWebhook === 'demandas'}
                >
                  {testingWebhook === 'demandas' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Testar Webhook
                </Button>
              </CardContent>
            </Card>

            {/* Checklist Webhook */}
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  Webhook de Checklist Diário
                </CardTitle>
                <CardDescription>
                  Receba lembretes e relatórios do checklist diário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-checklist">URL do Webhook (N8N)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="webhook-checklist" 
                      placeholder="https://seu-n8n.com/webhook/..." 
                      value={webhookChecklist}
                      onChange={(e) => setWebhookChecklist(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleSaveUrl('webhook_checklist_url', webhookChecklist)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => handleTestWebhook(webhookChecklist, 'checklist')}
                  disabled={testingWebhook === 'checklist'}
                >
                  {testingWebhook === 'checklist' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Testar Webhook
                </Button>
              </CardContent>
            </Card>

            {/* Clientes Webhook */}
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  Webhook de Novos Clientes
                </CardTitle>
                <CardDescription>
                  Receba notificações quando novos clientes se cadastrarem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-clientes">URL do Webhook (N8N)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="webhook-clientes" 
                      placeholder="https://seu-n8n.com/webhook/..." 
                      value={webhookClientes}
                      onChange={(e) => setWebhookClientes(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleSaveUrl('webhook_clientes_url', webhookClientes)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => handleTestWebhook(webhookClientes, 'clientes')}
                  disabled={testingWebhook === 'clientes'}
                >
                  {testingWebhook === 'clientes' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Testar Webhook
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notificações de Demandas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Demanda Criada</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar responsável quando uma nova demanda for criada
                    </p>
                  </div>
                  <Switch 
                    checked={getSettingEnabled('webhook_demandas_criada')}
                    onCheckedChange={(checked) => handleToggle('webhook_demandas_criada', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Demanda Concluída</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar administradores quando uma demanda for concluída
                    </p>
                  </div>
                  <Switch 
                    checked={getSettingEnabled('webhook_demandas_concluida')}
                    onCheckedChange={(checked) => handleToggle('webhook_demandas_concluida', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notificações do Checklist Diário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembrete Matinal (8h)</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lembrete das contas pendentes de verificação
                    </p>
                  </div>
                  <Switch 
                    checked={getSettingEnabled('webhook_checklist_lembrete_manha')}
                    onCheckedChange={(checked) => handleToggle('webhook_checklist_lembrete_manha', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatório da Tarde (17h)</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar relatório das contas ainda não verificadas
                    </p>
                  </div>
                  <Switch 
                    checked={getSettingEnabled('webhook_checklist_relatorio_tarde')}
                    onCheckedChange={(checked) => handleToggle('webhook_checklist_relatorio_tarde', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notificações de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Novo Cadastro</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar quando um novo cliente se cadastrar via onboarding
                    </p>
                  </div>
                  <Switch 
                    checked={getSettingEnabled('webhook_clientes_novo_cadastro')}
                    onCheckedChange={(checked) => handleToggle('webhook_clientes_novo_cadastro', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            {/* System Branding - Admin only */}
            {isAdmin && <SystemBrandingUpload />}
            
            <Card className="surface-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Informações da Organização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">{pt.settings.organizationName}</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="org-name" 
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSaveOrgName}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">{pt.settings.currency}</Label>
                  <Input id="currency" defaultValue="BRL" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{pt.settings.timezone}</Label>
                  <Input id="timezone" defaultValue="America/Sao_Paulo" disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}