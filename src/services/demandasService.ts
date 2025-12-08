import { supabase } from "@/integrations/supabase/client";
import { sendWebhookNotification } from "./systemSettingsService";

export type DemandaPrioridade = 'alta' | 'media' | 'baixa';
export type DemandaStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface DemandaHistorico {
  id: string;
  demanda_id: string;
  status_anterior: string | null;
  status_novo: string;
  alterado_por: string | null;
  alterado_em: string;
  observacao: string | null;
  usuario?: {
    name: string | null;
    email: string | null;
  };
}

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string | null;
  account_id: string;
  gestor_responsavel_id: string | null;
  criado_por: string | null;
  orcamento: number | null;
  link_criativos: string | null;
  data_entrega: string | null;
  hora_entrega: string | null;
  prioridade: DemandaPrioridade;
  status: DemandaStatus;
  created_at: string;
  updated_at: string;
  em_andamento_at: string | null;
  em_andamento_por: string | null;
  concluido_at: string | null;
  concluido_por: string | null;
  // Joined fields
  account?: {
    nome_cliente: string;
    gestor_id: string | null;
  };
  gestor?: {
    name: string | null;
    email: string | null;
  };
  criador?: {
    name: string | null;
    email: string | null;
  };
}

export interface CreateDemandaInput {
  titulo: string;
  descricao?: string;
  account_id: string;
  gestor_responsavel_id?: string;
  orcamento?: number;
  link_criativos?: string;
  data_entrega?: string;
  hora_entrega?: string;
  prioridade?: DemandaPrioridade;
}

export const demandasService = {
  async getDemandas(): Promise<Demanda[]> {
    const { data, error } = await supabase
      .from('demandas')
      .select(`
        *,
        account:accounts(nome_cliente, gestor_id),
        gestor:profiles!demandas_gestor_responsavel_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Demanda[];
  },

  async getDemandaById(id: string): Promise<Demanda | null> {
    const { data, error } = await supabase
      .from('demandas')
      .select(`
        *,
        account:accounts(nome_cliente, gestor_id),
        gestor:profiles!demandas_gestor_responsavel_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Demanda;
  },

  async getHistorico(demandaId: string): Promise<DemandaHistorico[]> {
    const { data, error } = await supabase
      .from('demanda_historico')
      .select(`
        *,
        usuario:profiles!demanda_historico_alterado_por_fkey(name, email)
      `)
      .eq('demanda_id', demandaId)
      .order('alterado_em', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as DemandaHistorico[];
  },

  async createDemanda(input: CreateDemandaInput): Promise<Demanda> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('demandas')
      .insert({
        ...input,
        criado_por: user?.id,
      })
      .select(`
        *,
        account:accounts(nome_cliente, gestor_id),
        gestor:profiles!demandas_gestor_responsavel_id_fkey(name, email)
      `)
      .single();

    if (error) throw error;

    // Create history entry for creation
    await supabase
      .from('demanda_historico')
      .insert({
        demanda_id: data.id,
        status_anterior: null,
        status_novo: 'pendente',
        alterado_por: user?.id,
        observacao: 'Demanda criada',
      });

    // Get creator info for webhook
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user?.id)
      .single();

    // Send webhook notification for new demanda
    const demandaWithJoins = data as unknown as Demanda;
    sendWebhookNotification('demanda_criada', {
      demanda_id: data.id,
      titulo: data.titulo,
      conta_nome: demandaWithJoins.account?.nome_cliente || '',
      prioridade: data.prioridade,
      data_entrega: data.data_entrega,
      hora_entrega: data.hora_entrega,
      descricao: data.descricao,
      link_criativos: data.link_criativos,
      orcamento: data.orcamento,
      gestor_nome: demandaWithJoins.gestor?.name || '',
      gestor_email: demandaWithJoins.gestor?.email || '',
      criado_por_nome: creatorProfile?.name || user?.email || '',
    });

    return data as unknown as Demanda;
  },

  async updateDemanda(id: string, updates: Partial<Demanda>): Promise<Demanda> {
    const { data, error } = await supabase
      .from('demandas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Demanda;
  },

  async updateStatus(id: string, newStatus: DemandaStatus): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current demanda to track status change
    const { data: currentDemanda } = await supabase
      .from('demandas')
      .select(`
        *,
        account:accounts(nome_cliente, gestor_id),
        gestor:profiles!demandas_gestor_responsavel_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    const oldStatus = currentDemanda?.status;
    
    // Prepare update object
    const updateObj: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === 'em_andamento') {
      updateObj.em_andamento_at = new Date().toISOString();
      updateObj.em_andamento_por = user?.id;
    } else if (newStatus === 'concluido') {
      updateObj.concluido_at = new Date().toISOString();
      updateObj.concluido_por = user?.id;
    }

    const { error } = await supabase
      .from('demandas')
      .update(updateObj)
      .eq('id', id);

    if (error) throw error;

    // Create history entry
    await supabase
      .from('demanda_historico')
      .insert({
        demanda_id: id,
        status_anterior: oldStatus,
        status_novo: newStatus,
        alterado_por: user?.id,
      });

    // Send webhook notification for completed demanda
    if (newStatus === 'concluido' && currentDemanda) {
      // Get user who completed
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user?.id)
        .single();

      // Get all admins to notify
      const { data: admins } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('role', 'admin');

      // Calculate time spent
      const createdAt = new Date(currentDemanda.created_at);
      const completedAt = new Date();
      const diffMs = completedAt.getTime() - createdAt.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const tempoTotal = hours > 0 ? `${hours} hora${hours > 1 ? 's' : ''} e ${minutes} minuto${minutes !== 1 ? 's' : ''}` : `${minutes} minuto${minutes !== 1 ? 's' : ''}`;

      const demandaWithJoins = currentDemanda as unknown as Demanda;
      
      sendWebhookNotification('demanda_concluida', {
        demanda_id: id,
        titulo: currentDemanda.titulo,
        conta_nome: demandaWithJoins.account?.nome_cliente || '',
        tempo_total: tempoTotal,
        concluido_por_nome: userProfile?.name || user?.email || '',
        concluido_por_email: userProfile?.email || user?.email || '',
        admins: admins?.map(a => a.name) || [],
      });
    }
  },

  async deleteDemanda(id: string): Promise<void> {
    const { error } = await supabase
      .from('demandas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};