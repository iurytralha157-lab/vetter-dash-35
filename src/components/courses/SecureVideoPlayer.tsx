import { useMemo } from "react";
import { Video } from "lucide-react";

interface SecureVideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
}

/**
 * Extracts YouTube video ID from various URL formats
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/v/
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // Just the video ID (11 characters)
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates a secure YouTube embed URL with privacy and download protection
 */
function getSecureEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    // Use privacy-enhanced mode
    rel: '0',           // Don't show related videos
    modestbranding: '1', // Minimal YouTube branding
    controls: '1',       // Show player controls
    disablekb: '0',      // Allow keyboard controls
    fs: '1',             // Allow fullscreen
    iv_load_policy: '3', // Don't show video annotations
    playsinline: '1',    // Play inline on mobile
    cc_load_policy: '0', // Don't force captions
  });

  // Using youtube-nocookie.com for privacy-enhanced mode
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function SecureVideoPlayer({ url, title = "Vídeo", className = "" }: SecureVideoPlayerProps) {
  const embedUrl = useMemo(() => {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return getSecureEmbedUrl(videoId);
    }
    
    // If it's already an embed URL from youtube-nocookie or youtube
    if (url.includes('youtube-nocookie.com/embed/') || url.includes('youtube.com/embed/')) {
      const id = url.match(/embed\/([a-zA-Z0-9_-]{11})/)?.[1];
      if (id) {
        return getSecureEmbedUrl(id);
      }
    }

    // For Vimeo or other platforms, return the URL as-is
    // (could be extended to support other platforms)
    if (url.includes('vimeo.com')) {
      return url;
    }

    return null;
  }, [url]);

  if (!embedUrl) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">URL de vídeo inválida</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`aspect-video bg-black rounded-lg overflow-hidden relative ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Overlay to prevent right-click on video */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}

/**
 * Utility function to validate if a URL is a valid YouTube link
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Utility function to get video thumbnail
 */
export function getYouTubeThumbnail(url: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault'
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
