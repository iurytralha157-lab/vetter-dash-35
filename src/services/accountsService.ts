import { supabase } from "@/integrations/supabase/client";
import type { ContaFormData } from "@/components/forms/ModernAccountForm";
import type { AccountFormData } from "@/components/accounts/AccountForm";

type AccountStatus = "Ativo" | "Pausado" | "Arquivado";

type AccountUpdatePayload = {
  nome_cliente?: string;
  telefone?: string;
  email?: string | null;
  link_drive?: string | null;
  id_grupo?: string | null;
  canais?: string[];
  status?: AccountStatus;
  observacoes?: string | null;
  canal_relatorio?: string | null;
  horario_relatorio?: string | null;
  notificacao_saldo_baixo?: boolean;
  notificacao_erro_sync?: boolean;
  usa_meta_ads?: boolean;
  meta_account_id?: string | null;
  meta_business_id?: string | null;
  meta_page_id?: string | null;
  modo_saldo_meta?: string | null;
  saldo_meta?: number | null;
  alerta_saldo_baixo?: number | null;
  budget_mensal_meta?: number | null;
  usa_google_ads?: boolean;
  google_ads_id?: string | null;
  budget_mensal_google?: number | null;
  usuarios_vinculados?: string[];
};

const toNullableString = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function updateAccount(accountId: string, updates: AccountUpdatePayload) {
  const { data, error } = await supabase.functions.invoke("update-account", {
    body: { accountId, updates },
  });

  if (error) {
    throw new Error(error.message || "Não foi possível atualizar a conta");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export function buildManagedAccountUpdate(data: ContaFormData): AccountUpdatePayload {
  return {
    nome_cliente: data.nome_cliente.trim(),
    telefone: data.telefone?.trim() || "",
    email: toNullableString(data.email),
    link_drive: toNullableString(data.link_drive),
    id_grupo: toNullableString(data.id_grupo),
    canais: data.canais || [],
    canal_relatorio: "WhatsApp",
    horario_relatorio: toNullableString(data.horario_relatorio),
    notificacao_saldo_baixo: data.notificacao_saldo_baixo ?? true,
    notificacao_erro_sync: data.notificacao_erro_sync ?? true,
    usa_meta_ads: data.usa_meta_ads || false,
    meta_account_id: toNullableString(data.meta_account_id),
    meta_business_id: toNullableString(data.meta_business_id),
    meta_page_id: toNullableString(data.meta_page_id),
    modo_saldo_meta: toNullableString(data.modo_saldo_meta),
    saldo_meta: data.saldo_meta ?? 0,
    alerta_saldo_baixo: data.alerta_saldo_baixo ?? 200,
    budget_mensal_meta: data.budget_mensal_meta ?? 0,
    usa_google_ads: data.usa_google_ads || false,
    google_ads_id: toNullableString(data.google_ads_id),
    budget_mensal_google: data.budget_mensal_google ?? 0,
  };
}

export function buildLegacyAccountUpdate(data: AccountFormData): AccountUpdatePayload {
  const isGoogle = data.tipo === "Google Ads";

  return {
    canais: [data.tipo],
    status: data.status,
    observacoes: toNullableString(data.observacoes),
    usa_meta_ads: !isGoogle,
    usa_google_ads: isGoogle,
    meta_account_id: isGoogle ? null : data.account_id.trim(),
    google_ads_id: isGoogle ? data.account_id.trim() : null,
  };
}
