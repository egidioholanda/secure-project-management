import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeviceImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  deviceId?: string;
}

export const DeviceImageUpload = ({
  imageUrl,
  onImageChange,
  deviceId,
}: DeviceImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${deviceId || crypto.randomUUID()}-${Date.now()}.${fileExt}`;
      const filePath = `devices/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("device-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("device-images")
        .getPublicUrl(filePath);

      onImageChange(urlData.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split("/device-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("device-images").remove([filePath]);
      }
      onImageChange(null);
      toast.success("Imagem removida");
    } catch (error) {
      console.error("Error removing image:", error);
      // Still clear the URL even if deletion fails
      onImageChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
          <img
            src={imageUrl}
            alt="Imagem do produto"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-2" />
              <span className="text-sm text-muted-foreground">Enviando...</span>
            </>
          ) : (
            <>
              <Camera className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <span className="text-sm text-muted-foreground">
                Clique para adicionar imagem
              </span>
              <span className="text-xs text-muted-foreground/70 mt-1">
                JPG, PNG ou WebP (máx. 5MB)
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
