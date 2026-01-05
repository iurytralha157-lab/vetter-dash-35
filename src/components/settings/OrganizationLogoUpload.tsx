import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OrganizationLogoUploadProps {
  organizationId: string | null;
  currentLogoUrl: string | null;
  onUpdate: () => void;
}

export function OrganizationLogoUpload({ organizationId, currentLogoUrl, onUpdate }: OrganizationLogoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !organizationId) return;

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 2MB)');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/logo.${fileExt}`;

      // Deletar logo anterior se existir
      await supabase.storage
        .from('org-logos')
        .remove([`${organizationId}/logo.jpg`, `${organizationId}/logo.png`, `${organizationId}/logo.webp`, `${organizationId}/logo.svg`]);

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('org-logos')
        .getPublicUrl(fileName);

      // Atualizar organização
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ sidebar_logo_url: urlData.publicUrl + `?t=${Date.now()}` })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      toast.success('Logo atualizada com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      toast.error('Erro ao atualizar logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!organizationId) return;

    setUploading(true);
    try {
      await supabase.storage
        .from('org-logos')
        .remove([`${organizationId}/logo.jpg`, `${organizationId}/logo.png`, `${organizationId}/logo.webp`, `${organizationId}/logo.svg`]);

      await supabase
        .from('organizations')
        .update({ sidebar_logo_url: null })
        .eq('id', organizationId);

      toast.success('Logo removida');
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      toast.error('Erro ao remover logo');
    } finally {
      setUploading(false);
    }
  };

  if (!organizationId) {
    return (
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Logo da Organização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure uma organização primeiro para poder enviar uma logo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          Logo da Organização
        </CardTitle>
        <CardDescription>
          A logo será exibida no menu lateral substituindo "Vetter Co."
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt="Logo" 
                className="h-12 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {currentLogoUrl ? 'Logo atual' : 'Nenhuma logo definida'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {currentLogoUrl ? 'Alterar logo' : 'Enviar logo'}
                </>
              )}
            </Button>
            {currentLogoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Recomendado: PNG ou SVG com fundo transparente. Máximo 2MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
