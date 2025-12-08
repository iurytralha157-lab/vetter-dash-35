import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, User, Phone, Mail, MessageSquare, MapPin, Instagram, Facebook, Globe, Users,
  Target, Home, FolderOpen, Link2, Clock, FileText, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const ClientOnboarding = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Bloco 1 - Empresa
    nome_imobiliaria: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    email_principal: '',
    whatsapp_leads: '',
    cidades_atuacao: '',
    instagram: '',
    facebook: '',
    site: '',
    qtd_corretores: 0,
    tipo_atuacao: '',
    
    // Bloco 2 - Campanhas
    objetivo_principal: '',
    tipos_imoveis: [] as string[],
    regioes_prioritarias: '',
    possui_banco_criativos: false,
    link_drive_criativos: '',
    link_identidade_visual: '',
    possui_sdr: false,
    horario_atendimento: '',
    
    // Bloco 3 - CRM & Integrações
    crm_utilizado: '',
    login_crm: '',
    senha_crm: '',
    email_integracoes: '',
    possui_automacoes: false,
    etapas_funil: '',
    automacoes_desejadas: [] as string[],
    
    // Bloco 4 - Acesso a Materiais
    link_drive_criativos_acesso: '',
    link_drive_administrativo: '',
    pasta_fotos_videos: '',
    
    // Bloco 5 - Preferências Operacionais
    horario_reuniao_semanal: '',
    horario_relatorios: '',
    emails_adicionais_relatorios: '',
    
    // Bloco 6 - Observações
    observacoes: ''
  });

  const tiposImoveis = [
    'Médio padrão',
    'Alto padrão',
    'Lançamentos',
    'Terrenos',
    'Comercial',
    'Outros'
  ];

  const automacoesOptions = [
    'WhatsApp',
    'Nutrição',
    'Qualificação',
    'Pós-visita',
    'Outros'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter((item: string) => item !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Criar registro na tabela client_onboarding
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('client_onboarding')
        .insert({
          nome_imobiliaria: formData.nome_imobiliaria,
          nome_responsavel: formData.nome_responsavel,
          telefone_responsavel: formData.telefone_responsavel,
          email_principal: formData.email_principal,
          whatsapp_leads: formData.whatsapp_leads,
          cidades_atuacao: formData.cidades_atuacao.split(',').map(c => c.trim()).filter(Boolean),
          instagram: formData.instagram,
          facebook: formData.facebook,
          site: formData.site,
          qtd_corretores: formData.qtd_corretores,
          tipo_atuacao: formData.tipo_atuacao,
          objetivo_principal: formData.objetivo_principal,
          tipos_imoveis: formData.tipos_imoveis,
          regioes_prioritarias: formData.regioes_prioritarias,
          possui_banco_criativos: formData.possui_banco_criativos,
          link_drive_criativos: formData.link_drive_criativos,
          link_identidade_visual: formData.link_identidade_visual,
          possui_sdr: formData.possui_sdr,
          horario_atendimento: formData.horario_atendimento,
          crm_utilizado: formData.crm_utilizado,
          login_crm: formData.login_crm,
          senha_crm: formData.senha_crm,
          email_integracoes: formData.email_integracoes,
          possui_automacoes: formData.possui_automacoes,
          etapas_funil: formData.etapas_funil,
          automacoes_desejadas: formData.automacoes_desejadas,
          link_drive_criativos_acesso: formData.link_drive_criativos_acesso,
          link_drive_administrativo: formData.link_drive_administrativo,
          pasta_fotos_videos: formData.pasta_fotos_videos,
          horario_reuniao_semanal: formData.horario_reuniao_semanal,
          horario_relatorios: formData.horario_relatorios,
          emails_adicionais_relatorios: formData.emails_adicionais_relatorios,
          observacoes: formData.observacoes,
          status: 'pendente'
        })
        .select()
        .single();

      if (onboardingError) throw onboardingError;

      // 2. Criar registro na tabela clientes com status Pausado
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome: formData.nome_imobiliaria,
          email: formData.email_principal,
          telefone: formData.telefone_responsavel,
          instagram_handle: formData.instagram,
          site: formData.site,
          responsavel_nome: formData.nome_responsavel,
          responsavel_email: formData.email_principal,
          responsavel_whatsapp: formData.whatsapp_leads,
          cidades: formData.cidades_atuacao.split(',').map(c => c.trim()).filter(Boolean),
          qtd_corretores: formData.qtd_corretores,
          nichos: formData.tipos_imoveis,
          crm_utilizado: formData.crm_utilizado,
          crm_url: formData.login_crm,
          observacoes_adicionais: formData.observacoes,
          status: 'Pausado'
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      // 3. Vincular onboarding ao cliente criado
      if (clienteData && onboardingData) {
        await supabase
          .from('client_onboarding')
          .update({ cliente_id: clienteData.id })
          .eq('id', onboardingData.id);
      }

      setSuccess(true);
      toast.success('Cadastro realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar formulário:', error);
      toast.error('Erro ao enviar formulário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
        <div className="relative w-full max-w-md">
          <div className="surface-elevated rounded-3xl p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Informações enviadas com sucesso!</h1>
            <p className="text-muted-foreground mb-6">
              Vamos iniciar o seu onboarding. Nossa equipe entrará em contato em breve.
            </p>
            <Button 
              variant="apple" 
              size="lg" 
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      
      <div className="relative w-full max-w-2xl">
        <div className="surface-elevated rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">M</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Onboarding do Cliente</h1>
            <p className="text-muted-foreground">Preencha as informações para iniciar sua jornada conosco</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Accordion type="multiple" defaultValue={['empresa']} className="space-y-4">
              {/* BLOCO 1 - Informações da Empresa */}
              <AccordionItem value="empresa" className="border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Informações da Empresa</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da Imobiliária *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Nome da empresa" 
                          className="pl-10 bg-secondary/30"
                          value={formData.nome_imobiliaria}
                          onChange={(e) => handleInputChange('nome_imobiliaria', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Responsável *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Nome completo" 
                          className="pl-10 bg-secondary/30"
                          value={formData.nome_responsavel}
                          onChange={(e) => handleInputChange('nome_responsavel', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone do Responsável *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="(11) 99999-9999" 
                          className="pl-10 bg-secondary/30"
                          value={formData.telefone_responsavel}
                          onChange={(e) => handleInputChange('telefone_responsavel', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail Principal *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="email"
                          placeholder="email@empresa.com" 
                          className="pl-10 bg-secondary/30"
                          value={formData.email_principal}
                          onChange={(e) => handleInputChange('email_principal', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp para Leads *</Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="5511999999999" 
                          className="pl-10 bg-secondary/30"
                          value={formData.whatsapp_leads}
                          onChange={(e) => handleInputChange('whatsapp_leads', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade(s) de Atuação</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="São Paulo, Campinas, ..." 
                          className="pl-10 bg-secondary/30"
                          value={formData.cidades_atuacao}
                          onChange={(e) => handleInputChange('cidades_atuacao', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="@suaimobiliaria" 
                          className="pl-10 bg-secondary/30"
                          value={formData.instagram}
                          onChange={(e) => handleInputChange('instagram', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Facebook</Label>
                      <div className="relative">
                        <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="facebook.com/suaimobiliaria" 
                          className="pl-10 bg-secondary/30"
                          value={formData.facebook}
                          onChange={(e) => handleInputChange('facebook', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="www.suaimobiliaria.com.br" 
                          className="pl-10 bg-secondary/30"
                          value={formData.site}
                          onChange={(e) => handleInputChange('site', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de Corretores</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="number"
                          placeholder="0" 
                          className="pl-10 bg-secondary/30"
                          value={formData.qtd_corretores || ''}
                          onChange={(e) => handleInputChange('qtd_corretores', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tipo de Atuação</Label>
                      <Select value={formData.tipo_atuacao} onValueChange={(v) => handleInputChange('tipo_atuacao', v)}>
                        <SelectTrigger className="bg-secondary/30">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="venda">Venda</SelectItem>
                          <SelectItem value="locacao">Locação</SelectItem>
                          <SelectItem value="ambos">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BLOCO 2 - Informações das Campanhas */}
              <AccordionItem value="campanhas" className="border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Informações das Campanhas</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Objetivo Principal</Label>
                    <Select value={formData.objetivo_principal} onValueChange={(v) => handleInputChange('objetivo_principal', v)}>
                      <SelectTrigger className="bg-secondary/30">
                        <SelectValue placeholder="Selecione o objetivo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vender_imoveis">Vender imóveis</SelectItem>
                        <SelectItem value="lancamento">Lançamento</SelectItem>
                        <SelectItem value="captacao_proprietarios">Captação de proprietários</SelectItem>
                        <SelectItem value="recrutamento">Recrutamento</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipos de Imóveis</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {tiposImoveis.map((tipo) => (
                        <div key={tipo} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`tipo-${tipo}`}
                            checked={formData.tipos_imoveis.includes(tipo)}
                            onCheckedChange={(checked) => handleCheckboxArrayChange('tipos_imoveis', tipo, checked as boolean)}
                          />
                          <label htmlFor={`tipo-${tipo}`} className="text-sm">{tipo}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Regiões Prioritárias</Label>
                    <Input 
                      placeholder="Ex: Zona Sul, Centro, Barra..." 
                      className="bg-secondary/30"
                      value={formData.regioes_prioritarias}
                      onChange={(e) => handleInputChange('regioes_prioritarias', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="banco_criativos"
                        checked={formData.possui_banco_criativos}
                        onCheckedChange={(checked) => handleInputChange('possui_banco_criativos', checked)}
                      />
                      <label htmlFor="banco_criativos" className="text-sm">Possui banco de criativos?</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="possui_sdr"
                        checked={formData.possui_sdr}
                        onCheckedChange={(checked) => handleInputChange('possui_sdr', checked)}
                      />
                      <label htmlFor="possui_sdr" className="text-sm">Possui SDR/Equipe de atendimento?</label>
                    </div>
                  </div>

                  {formData.possui_sdr && (
                    <div className="space-y-2">
                      <Label>Horário de Atendimento</Label>
                      <Input 
                        placeholder="Ex: 08:00 às 18:00" 
                        className="bg-secondary/30"
                        value={formData.horario_atendimento}
                        onChange={(e) => handleInputChange('horario_atendimento', e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Link do Google Drive para Criativos</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="https://drive.google.com/..." 
                        className="pl-10 bg-secondary/30"
                        value={formData.link_drive_criativos}
                        onChange={(e) => handleInputChange('link_drive_criativos', e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Deixe aberto para edição</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Link Identidade Visual / Branding</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="https://..." 
                        className="pl-10 bg-secondary/30"
                        value={formData.link_identidade_visual}
                        onChange={(e) => handleInputChange('link_identidade_visual', e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BLOCO 3 - CRM & Integrações */}
              <AccordionItem value="crm" className="border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-semibold">CRM & Integrações</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CRM Utilizado</Label>
                      <Input 
                        placeholder="Ex: RD Station, HubSpot..." 
                        className="bg-secondary/30"
                        value={formData.crm_utilizado}
                        onChange={(e) => handleInputChange('crm_utilizado', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Login do CRM</Label>
                      <Input 
                        placeholder="usuario@email.com" 
                        className="bg-secondary/30"
                        value={formData.login_crm}
                        onChange={(e) => handleInputChange('login_crm', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha do CRM</Label>
                      <Input 
                        type="password"
                        placeholder="********" 
                        className="bg-secondary/30"
                        value={formData.senha_crm}
                        onChange={(e) => handleInputChange('senha_crm', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail para Integrações</Label>
                      <Input 
                        placeholder="andre...@gmail.com" 
                        className="bg-secondary/30"
                        value={formData.email_integracoes}
                        onChange={(e) => handleInputChange('email_integracoes', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="possui_automacoes"
                      checked={formData.possui_automacoes}
                      onCheckedChange={(checked) => handleInputChange('possui_automacoes', checked)}
                    />
                    <label htmlFor="possui_automacoes" className="text-sm">Possui automações?</label>
                  </div>

                  <div className="space-y-2">
                    <Label>Etapas do Funil</Label>
                    <Textarea 
                      placeholder="Descreva as etapas do seu funil de vendas..." 
                      className="bg-secondary/30"
                      value={formData.etapas_funil}
                      onChange={(e) => handleInputChange('etapas_funil', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>O que deseja automatizar?</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {automacoesOptions.map((opcao) => (
                        <div key={opcao} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`auto-${opcao}`}
                            checked={formData.automacoes_desejadas.includes(opcao)}
                            onCheckedChange={(checked) => handleCheckboxArrayChange('automacoes_desejadas', opcao, checked as boolean)}
                          />
                          <label htmlFor={`auto-${opcao}`} className="text-sm">{opcao}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BLOCO 4 - Acesso a Materiais */}
              <AccordionItem value="materiais" className="border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Acesso a Materiais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Link do Drive com Criativos (com acesso)</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="https://drive.google.com/..." 
                        className="pl-10 bg-secondary/30"
                        value={formData.link_drive_criativos_acesso}
                        onChange={(e) => handleInputChange('link_drive_criativos_acesso', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link do Drive Administrativo</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="https://drive.google.com/..." 
                        className="pl-10 bg-secondary/30"
                        value={formData.link_drive_administrativo}
                        onChange={(e) => handleInputChange('link_drive_administrativo', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Pasta com Fotos, Vídeos e Fichas</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="https://..." 
                        className="pl-10 bg-secondary/30"
                        value={formData.pasta_fotos_videos}
                        onChange={(e) => handleInputChange('pasta_fotos_videos', e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BLOCO 5 - Preferências Operacionais */}
              <AccordionItem value="preferencias" className="border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Preferências Operacionais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Melhor Horário para Reunião Semanal</Label>
                      <Input 
                        placeholder="Ex: Terça às 10h" 
                        className="bg-secondary/30"
                        value={formData.horario_reuniao_semanal}
                        onChange={(e) => handleInputChange('horario_reuniao_semanal', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Melhor Horário para Relatórios</Label>
                      <Input 
                        placeholder="Ex: 09:00" 
                        className="bg-secondary/30"
                        value={formData.horario_relatorios}
                        onChange={(e) => handleInputChange('horario_relatorios', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>E-mails Adicionais para Relatórios</Label>
                    <Input 
                      placeholder="email1@empresa.com, email2@empresa.com" 
                      className="bg-secondary/30"
                      value={formData.emails_adicionais_relatorios}
                      onChange={(e) => handleInputChange('emails_adicionais_relatorios', e.target.value)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BLOCO 6 - Observações Gerais */}
              <AccordionItem value="observacoes" className="border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Observações Gerais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea 
                      placeholder="Escreva aqui qualquer informação adicional que considere relevante..." 
                      className="bg-secondary/30 min-h-[120px]"
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button 
              type="submit" 
              variant="apple"
              size="lg"
              className="w-full mt-6" 
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Cadastro'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;
