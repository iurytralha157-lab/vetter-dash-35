import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cplSettingsService, CPLSettings, DEFAULT_CPL_SETTINGS } from "@/services/cplSettingsService";
import { Loader2 } from "lucide-react";

interface CPLSettingsFormProps {
  accountId?: string | null;
}

export function CPLSettingsForm({ accountId = null }: CPLSettingsFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    cpl_mcmv: DEFAULT_CPL_SETTINGS.cpl_mcmv,
    cpl_medio: DEFAULT_CPL_SETTINGS.cpl_medio,
    cpl_alto: DEFAULT_CPL_SETTINGS.cpl_alto,
    margem_amarelo: DEFAULT_CPL_SETTINGS.margem_amarelo,
  });

  useEffect(() => {
    loadSettings();
  }, [accountId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await cplSettingsService.getCPLSettings(accountId);
      if (data) {
        setSettings({
          cpl_mcmv: data.cpl_mcmv || DEFAULT_CPL_SETTINGS.cpl_mcmv,
          cpl_medio: data.cpl_medio || DEFAULT_CPL_SETTINGS.cpl_medio,
          cpl_alto: data.cpl_alto || DEFAULT_CPL_SETTINGS.cpl_alto,
          margem_amarelo: data.margem_amarelo || DEFAULT_CPL_SETTINGS.margem_amarelo,
        });
      }
    } catch (error) {
      console.error("Error loading CPL settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await cplSettingsService.upsertCPLSettings({
        account_id: accountId,
        ...settings,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving CPL settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de CPL Ideal</CardTitle>
        <CardDescription>
          Defina o CPL (Custo Por Lead) ideal para cada tipo de campanha. Esses valores são usados
          para o sistema de semáforo de alertas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cpl_mcmv">CPL Ideal - MCMV (R$)</Label>
            <Input
              id="cpl_mcmv"
              type="number"
              value={settings.cpl_mcmv}
              onChange={(e) => setSettings({ ...settings, cpl_mcmv: Number(e.target.value) })}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpl_medio">CPL Ideal - Médio Padrão (R$)</Label>
            <Input
              id="cpl_medio"
              type="number"
              value={settings.cpl_medio}
              onChange={(e) => setSettings({ ...settings, cpl_medio: Number(e.target.value) })}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpl_alto">CPL Ideal - Alto Padrão (R$)</Label>
            <Input
              id="cpl_alto"
              type="number"
              value={settings.cpl_alto}
              onChange={(e) => setSettings({ ...settings, cpl_alto: Number(e.target.value) })}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margem_amarelo">Margem Amarelo (%)</Label>
            <Input
              id="margem_amarelo"
              type="number"
              value={settings.margem_amarelo}
              onChange={(e) =>
                setSettings({ ...settings, margem_amarelo: Number(e.target.value) })
              }
              min="0"
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Tolerância acima do CPL ideal antes de ficar vermelho
            </p>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Como funciona o semáforo:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>🟢 Verde: CPL abaixo ou igual ao ideal</li>
            <li>🟡 Amarelo: CPL entre ideal e ideal + margem</li>
            <li>🔴 Vermelho: CPL acima do ideal + margem, ou campanha com gasto mas sem leads</li>
          </ul>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
