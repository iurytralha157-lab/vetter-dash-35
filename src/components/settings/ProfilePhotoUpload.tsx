import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProfilePhotoUploadProps {
  currentAvatarUrl: string | null;
  onUpdate: () => void;
}

export function ProfilePhotoUpload({ currentAvatarUrl, onUpdate }: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 5MB)');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    setUploading(true);

    try {
      // Upload para storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Deletar avatar anterior se existir
      await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl + `?t=${Date.now()}` })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      toast.error('Erro ao atualizar foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // Remover do storage
      await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);

      // Atualizar perfil
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      toast.success('Foto removida');
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Foto de Perfil
        </CardTitle>
        <CardDescription>
          Sua foto será exibida no VFeed e em todo o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={currentAvatarUrl || undefined} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="space-y-2">
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
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Alterar foto'
              )}
            </Button>
            {currentAvatarUrl && (
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
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP. Máximo 5MB.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
