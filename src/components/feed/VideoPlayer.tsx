interface VideoPlayerProps {
  url: string;
  className?: string;
}

export function VideoPlayer({ url, className = "" }: VideoPlayerProps) {
  // Player simples - sem estado de erro para sempre mostrar o vídeo
  // O navegador mostrará seus próprios controles de erro se necessário
  
  return (
    <div className={`relative bg-black ${className}`}>
      <video 
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        src={url}
      >
        Seu navegador não suporta este formato de vídeo.
      </video>
    </div>
  );
}
