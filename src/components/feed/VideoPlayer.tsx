interface VideoPlayerProps {
  url: string;
  className?: string;
}

export function VideoPlayer({ url, className = "" }: VideoPlayerProps) {
  return (
    <div className={`relative bg-black ${className}`}>
      <video 
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        style={{ maxHeight: '600px' }}
      >
        <source src={url} type="video/mp4" />
        <source src={url} type="video/quicktime" />
        <source src={url} />
        Seu navegador não suporta vídeo.
      </video>
    </div>
  );
}
