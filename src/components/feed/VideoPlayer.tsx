import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  url: string;
  className?: string;
}

export function VideoPlayer({ url, className = "" }: VideoPlayerProps) {
  return (
    <div className={`relative bg-black ${className}`}>
      <ReactPlayer
        src={url}
        controls
        width="100%"
        height="100%"
        playsInline
      />
    </div>
  );
}
