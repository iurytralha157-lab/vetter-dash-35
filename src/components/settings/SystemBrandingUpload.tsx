import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Trash2, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SystemBrandingUpload() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [systemName, setSystemName] = useState('MetaFlow');
  const [logoSize, setLogoSize] = useState(40);
  const [brandingId, setBrandingId] = useState<string | null>(null);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const { data } = await supabase
        .from('system_branding')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setBrandingId(data.id);
        setLogoUrl(data.logo_url);
        setSystemName(data.name || 'MetaFlow');
        setLogoSize(data.logo_size || 40);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandingId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Selecione um arquivo de imagem (PNG, JPG, SVG).",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `system-logo-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('org-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('system_branding')
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', brandingId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);

      toast({
        title: "Logo atualizada",
        description: "A logo do sistema foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer o upload da logo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!brandingId || !logoUrl) return;

    setSaving(true);

    try {
      const path = logoUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('org-logos').remove([path]);

      await supabase
        .from('system_branding')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', brandingId);

      setLogoUrl(null);

      toast({
        title: "Logo removida",
        description: "A logo do sistema foi removida.",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a logo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!brandingId) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('system_branding')
        .update({ name: systemName, updated_at: new Date().toISOString() })
        .eq('id', brandingId);

      if (error) throw error;

      toast({
        title: "Nome atualizado",
        description: "O nome do sistema foi atualizado.",
      });
    } catch (error) {
      console.error('Error saving name:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o nome.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSize = async (newSize: number) => {
    if (!brandingId) return;

    setLogoSize(newSize);

    try {
      const { error } = await supabase
        .from('system_branding')
        .update({ logo_size: newSize, updated_at: new Date().toISOString() })
        .eq('id', brandingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving logo size:', error);
    }
  };

  if (loading) {
    return (
      <Card className="surface-elevated">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Branding do Sistema
        </CardTitle>
        <CardDescription>
          Logo e nome que aparece na tela de login e na sidebar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-4">
          <Label>Logo do Sistema</Label>
          <div className="flex items-center gap-6">
            <div className="relative h-20 w-20 rounded-2xl bg-secondary/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo do sistema" 
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => document.getElementById('system-logo-input')?.click()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {logoUrl ? 'Trocar' : 'Upload'}
                </Button>
                
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={handleRemove}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou SVG. Máx 2MB.
              </p>
            </div>

            <input
              type="file"
              id="system-logo-input"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Logo Size Control */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Tamanho da Logo</Label>
            <span className="text-sm font-mono text-muted-foreground">{logoSize}px</span>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[logoSize]}
              onValueChange={(value) => handleSaveSize(value[0])}
              min={24}
              max={120}
              step={4}
              className="flex-1"
            />
            <Input
              type="number"
              value={logoSize}
              onChange={(e) => handleSaveSize(Number(e.target.value))}
              min={24}
              max={120}
              className="w-20 text-center"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Define o tamanho da logo na sidebar e tela de login (24px - 120px)
          </p>
        </div>

        {/* System Name */}
        <div className="space-y-2">
          <Label htmlFor="system-name">Nome do Sistema</Label>
          <div className="flex gap-2">
            <Input
              id="system-name"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Nome do sistema"
            />
            <Button
              variant="outline"
              onClick={handleSaveName}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t border-border">
          <Label className="text-muted-foreground text-sm">Preview da Sidebar</Label>
          <div className="mt-3 flex items-center justify-center p-4 rounded-xl bg-secondary/30">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="object-contain"
                style={{ width: logoSize, height: logoSize }}
              />
            ) : (
              <div 
                className="rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center"
                style={{ width: logoSize, height: logoSize }}
              >
                <span 
                  className="text-primary-foreground font-bold"
                  style={{ fontSize: logoSize * 0.4 }}
                >
                  {systemName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
