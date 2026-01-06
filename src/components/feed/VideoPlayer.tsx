import { useState } from "react";
import { Download } from "lucide-react";

interface VideoPlayerProps {
  url: string;
  className?: string;
}

export function VideoPlayer({ url, className = "" }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    console.error('Erro ao carregar vídeo:', url);
    setIsLoading(false);
    setHasError(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setHasError(false);
  };

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-black text-white ${className}`}>
        <p className="text-sm mb-3 text-center">Não foi possível reproduzir este vídeo</p>
        <a 
          href={url} 
          download 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
        >
          <Download className="h-4 w-4" />
          Clique para baixar
        </a>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
      
      <video 
        controls
        playsInline
        preload="auto"
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        onLoadedData={handleCanPlay}
        onCanPlay={handleCanPlay}
        onError={handleError}
      >
        {/* Tentar MP4 primeiro - mais compatível */}
        <source src={url} type="video/mp4" />
        {/* Fallback QuickTime para Safari */}
        <source src={url} type="video/quicktime" />
        {/* WebM para navegadores modernos */}
        <source src={url} type="video/webm" />
        {/* Último fallback sem tipo */}
        <source src={url} />
        Seu navegador não suporta este formato de vídeo.
      </video>
    </div>
  );
}
